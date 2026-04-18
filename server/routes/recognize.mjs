import express from "express";
import crypto from "node:crypto";
import { findDishByName } from "../matcher.mjs";

const SCHEMA = {
  name: "food_identification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["isFood", "name", "shortDescription", "confidence"],
    properties: {
      isFood: { type: "boolean" },
      name: { type: "string" },
      shortDescription: { type: "string" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
    },
  },
};

const PROMPT =
  "Identify the dish in the photo. Prefer Malaysian names when clearly Malaysian; otherwise use the most common English name. " +
  "Return strict JSON per the schema. Do not guess calories, price, or ingredients.";

export function recognizeRouter() {
  const router = express.Router();

  router.post("/api/recognize", async (req, res) => {
    const startedAt = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);
    const log = (event, extra = {}) => {
      console.info(`[recognize:${requestId}] ${event}`, {
        elapsedMs: Date.now() - startedAt,
        ...extra,
      });
    };

    log("start");

    const imageBase64 = req.body?.imageBase64;
    const mimeType = req.body?.mimeType || "image/jpeg";
    if (!imageBase64 || typeof imageBase64 !== "string") {
      log("no_image_base64");
      return res.status(400).json({ error: "no_image" });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      log("missing_key");
      return res.status(500).json({ error: "server_misconfigured" });
    }
    const model = process.env.VISION_MODEL ?? "openai/gpt-4o";
    const upstreamTimeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 20000);
    log("model_selected", { model, upstreamTimeoutMs });

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    let upstream;
    try {
      upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
              content: [
                { type: "text", text: PROMPT },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          response_format: { type: "json_schema", json_schema: SCHEMA },
        }),
        signal: AbortSignal.timeout(upstreamTimeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : "unknown_error";
      const isTimeout = reason === "TimeoutError" || reason === "AbortError";
      log("upstream_request_failed", { reason, isTimeout });
      return res
        .status(504)
        .json({ error: isTimeout ? "upstream_timeout" : "upstream_network_error" });
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      log("upstream_non_ok", { status: upstream.status, detail: detail.slice(0, 300) });
      return res.status(502).json({ error: "upstream_error" });
    }

    let parsed;
    try {
      const raw = await upstream.json();
      const content = raw?.choices?.[0]?.message?.content;
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      log("bad_model_json");
      return res.status(502).json({ error: "bad_model_output" });
    }

    if (!parsed?.isFood) {
      log("not_food");
      return res.status(200).json({ error: "not_food" });
    }

    const match = await findDishByName(parsed.name);
    const dish = match ?? {
      id: null,
      name: parsed.name,
      type: "",
      origin: "",
      description: parsed.shortDescription,
    };
    log("success", { matchedDataset: Boolean(match), returnedName: dish.name });
    return res.status(200).json({ dish });
  });

  return router;
}
