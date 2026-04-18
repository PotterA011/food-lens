import { query, hasDb } from "./db.mjs";

const ENRICH_SCHEMA = {
  name: "dish_enrichment",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["ingredients", "history"],
    properties: {
      ingredients: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 15,
      },
      history: { type: "string" },
    },
  },
};

function buildPrompt(dish) {
  return (
    `Provide culinary information about the dish "${dish.name}"` +
    (dish.origin ? ` from ${dish.origin}` : "") +
    (dish.type ? ` (${dish.type})` : "") +
    `. Return strict JSON matching the schema. ` +
    `"ingredients" should be a concise list of the 5-12 most characteristic ingredients (short names only, e.g. "coconut milk", "pandan leaves"). ` +
    `"history" should be 2-4 sentences about the dish's cultural origin and how it came to be, written for a curious traveller.`
  );
}

async function callEnrichmentModel(dish) {
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
      messages: [{ role: "user", content: buildPrompt(dish) }],
      response_format: { type: "json_schema", json_schema: ENRICH_SCHEMA },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`enrichment_failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const raw = await res.json();
  const content = raw?.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  if (!parsed?.ingredients || !parsed?.history) {
    throw new Error("enrichment_bad_shape");
  }
  return { ingredients: parsed.ingredients, history: parsed.history, model };
}

export async function getEnrichment(dish) {
  if (!hasDb()) return null;
  const { rows } = await query(
    "SELECT ingredients, history FROM enrichments WHERE dish_id = $1",
    [dish.id],
  );
  if (rows[0]) return { ingredients: rows[0].ingredients, history: rows[0].history };

  const generated = await callEnrichmentModel(dish);
  await query(
    `INSERT INTO enrichments (dish_id, ingredients, history, model)
         VALUES ($1, $2, $3, $4)
      ON CONFLICT (dish_id) DO UPDATE
         SET ingredients = EXCLUDED.ingredients,
             history = EXCLUDED.history,
             model = EXCLUDED.model,
             generated_at = now()`,
    [dish.id, generated.ingredients, generated.history, generated.model],
  );
  return { ingredients: generated.ingredients, history: generated.history };
}
