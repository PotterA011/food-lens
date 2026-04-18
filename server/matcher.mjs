import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, hasDb, toVectorLiteral } from "./db.mjs";
import { embedText, dishEmbeddingText } from "./embeddings.mjs";
import { slugify } from "./slug.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const staticDishes = JSON.parse(
  readFileSync(path.join(__dirname, "..", "src/data/dishes.json"), "utf8"),
);

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const temp = dp[i];
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = temp;
    }
  }
  return dp[a.length];
}

export function findStaticDish(queryName) {
  const q = norm(queryName);
  if (!q) return null;
  let exact = null;
  let starts = null;
  let contains = null;
  let fuzzy = null;
  for (const dish of staticDishes) {
    const key = norm(dish.name);
    if (key === q) {
      exact = dish;
      break;
    }
    if (!starts && key.startsWith(q)) starts = dish;
    else if (!contains && key.includes(q)) contains = dish;
    else if (q.length >= 4) {
      const d = editDistance(q, key);
      if (d <= 2 && (!fuzzy || d < fuzzy.d)) fuzzy = { dish, d };
    }
  }
  const match = exact ?? starts ?? contains ?? fuzzy?.dish ?? null;
  if (!match) return null;
  return { ...match, id: slugify(match.name) };
}

const MATCH_DISTANCE_THRESHOLD = 0.25;

export async function findDishByName(name) {
  if (!hasDb()) return findStaticDish(name);

  const { rows: exactRows } = await query(
    "SELECT id, name, type, origin, description FROM dishes WHERE lower(name) = lower($1) LIMIT 1",
    [name],
  );
  if (exactRows[0]) return exactRows[0];

  try {
    const vec = await embedText(name);
    const { rows } = await query(
      `SELECT id, name, type, origin, description, embedding <=> $1::vector AS distance
         FROM dishes
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 1`,
      [toVectorLiteral(vec)],
    );
    const top = rows[0];
    if (top && top.distance < MATCH_DISTANCE_THRESHOLD) {
      return {
        id: top.id,
        name: top.name,
        type: top.type,
        origin: top.origin,
        description: top.description,
      };
    }
  } catch (err) {
    console.warn("[matcher] embedding match failed", err.message);
  }

  return null;
}

export async function findNearestDishByEmbedding(vec, threshold = 0.2) {
  if (!hasDb()) return null;
  const { rows } = await query(
    `SELECT id, name, type, origin, description, embedding <=> $1::vector AS distance
       FROM dishes
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 1`,
    [toVectorLiteral(vec)],
  );
  const top = rows[0];
  if (top && top.distance < threshold) {
    return {
      id: top.id,
      name: top.name,
      type: top.type,
      origin: top.origin,
      description: top.description,
    };
  }
  return null;
}

export { dishEmbeddingText };
