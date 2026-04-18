const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

export async function embedText(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  const clean = String(text || "").slice(0, 8000);
  if (!clean) return new Array(EMBEDDING_DIM).fill(0);

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: clean }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`embedding_failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const vec = data?.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
    throw new Error("embedding_bad_shape");
  }
  return vec;
}

export function dishEmbeddingText(dish) {
  const parts = [dish.name, dish.type, dish.origin, dish.description].filter(
    Boolean,
  );
  return parts.join(" — ");
}
