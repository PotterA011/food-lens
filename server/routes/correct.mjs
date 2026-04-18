import express from "express";
import { query, hasDb, toVectorLiteral } from "../db.mjs";
import { embedText, dishEmbeddingText } from "../embeddings.mjs";
import { findNearestDishByEmbedding } from "../matcher.mjs";
import { getEnrichment } from "../enrichment.mjs";
import { slugify } from "../slug.mjs";

const NEW_DISH_SCHEMA = {
  name: "new_dish",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["name", "type", "origin", "description"],
    properties: {
      name: { type: "string" },
      type: { type: "string" },
      origin: { type: "string" },
      description: { type: "string" },
    },
  },
};

async function generateDishMeta(name) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  const model = process.env.ENRICHMENT_MODEL ?? process.env.VISION_MODEL ?? "openai/gpt-4o";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content:
            `For the dish "${name}", return strict JSON with: ` +
            `"name" (use the canonical spelling), ` +
            `"type" (e.g. "Rice noodles", "Curry", "Dessert"), ` +
            `"origin" (state, region, or "Nationwide" if unclear), ` +
            `"description" (1-2 sentences describing the dish).`,
        },
      ],
      response_format: { type: "json_schema", json_schema: NEW_DISH_SCHEMA },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`dish_meta_failed: ${res.status}`);
  const raw = await res.json();
  const content = raw?.choices?.[0]?.message?.content;
  return typeof content === "string" ? JSON.parse(content) : content;
}

async function uniqueSlug(base) {
  const rootSlug = slugify(base) || "dish";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? rootSlug : `${rootSlug}-${i + 1}`;
    const { rows } = await query("SELECT 1 FROM dishes WHERE id = $1", [candidate]);
    if (rows.length === 0) return candidate;
  }
  return `${rootSlug}-${Date.now().toString(36)}`;
}

export function correctRouter() {
  const router = express.Router();

  router.post("/api/correct", async (req, res) => {
    const correctedName = String(req.body?.correctedName ?? "").trim();
    const originalName = String(req.body?.originalName ?? "").trim();
    if (!correctedName) {
      return res.status(400).json({ error: "corrected_name_required" });
    }
    if (!hasDb()) {
      return res.status(503).json({ error: "db_unavailable" });
    }

    const userId = req.user?.id ?? null;

    let vec;
    try {
      vec = await embedText(correctedName);
    } catch (err) {
      console.warn("[correct] embed failed", err.message);
      return res.status(502).json({ error: "embed_failed" });
    }

    let dish = await findNearestDishByEmbedding(vec, 0.2);

    if (!dish) {
      let meta;
      try {
        meta = await generateDishMeta(correctedName);
      } catch (err) {
        console.warn("[correct] meta generation failed", err.message);
        meta = {
          name: correctedName,
          type: "",
          origin: "",
          description: "",
        };
      }

      const id = await uniqueSlug(meta.name || correctedName);
      let dishVec = vec;
      try {
        dishVec = await embedText(dishEmbeddingText(meta));
      } catch {
        // fall back to corrected-name vector
      }

      try {
        await query(
          `INSERT INTO dishes (id, name, type, origin, description, is_curated, created_by, embedding)
           VALUES ($1, $2, $3, $4, $5, false, $6, $7::vector)`,
          [
            id,
            meta.name || correctedName,
            meta.type ?? "",
            meta.origin ?? "",
            meta.description ?? "",
            userId,
            toVectorLiteral(dishVec),
          ],
        );
      } catch (err) {
        console.error("[correct] dish insert failed", err);
        return res.status(500).json({ error: "dish_insert_failed" });
      }

      dish = {
        id,
        name: meta.name || correctedName,
        type: meta.type ?? "",
        origin: meta.origin ?? "",
        description: meta.description ?? "",
      };
    }

    try {
      await query(
        `INSERT INTO corrections (user_id, original_name, corrected_name, resulting_dish_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, originalName, correctedName, dish.id],
      );
    } catch (err) {
      console.warn("[correct] log failed", err.message);
    }

    let enrichment = null;
    try {
      enrichment = await getEnrichment(dish);
    } catch (err) {
      console.warn("[correct] enrichment failed", err.message);
    }

    res.json({
      dish,
      ingredients: enrichment?.ingredients ?? null,
      history: enrichment?.history ?? null,
    });
  });

  return router;
}
