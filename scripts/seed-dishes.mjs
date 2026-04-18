import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, toVectorLiteral } from "../server/db.mjs";
import { embedText, dishEmbeddingText } from "../server/embeddings.mjs";
import { slugify } from "../server/slug.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const pool = getPool();
  if (!pool) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Aborting.");
    process.exit(1);
  }

  const dishes = JSON.parse(
    readFileSync(path.join(__dirname, "..", "src/data/dishes.json"), "utf8"),
  );

  const existing = await pool.query(
    "SELECT id, embedding IS NULL AS needs_embedding FROM dishes",
  );
  const existingMap = new Map(
    existing.rows.map((r) => [r.id, r.needs_embedding]),
  );

  const force = process.argv.includes("--force");
  let inserted = 0;
  let embedded = 0;
  let skipped = 0;

  for (const dish of dishes) {
    const id = slugify(dish.name);
    if (!id) continue;
    const needsEmbedding = force || existingMap.get(id) !== false;

    let vecLiteral = null;
    if (needsEmbedding) {
      try {
        const vec = await embedText(dishEmbeddingText(dish));
        vecLiteral = toVectorLiteral(vec);
        embedded += 1;
      } catch (err) {
        console.warn(`[seed] embed failed for ${id}:`, err.message);
      }
    }

    if (existingMap.has(id)) {
      if (vecLiteral) {
        await pool.query(
          `UPDATE dishes
             SET name = $2, type = $3, origin = $4, description = $5,
                 is_curated = true, embedding = $6::vector
           WHERE id = $1`,
          [
            id,
            dish.name,
            dish.type ?? "",
            dish.origin ?? "",
            dish.description ?? "",
            vecLiteral,
          ],
        );
      } else {
        skipped += 1;
      }
    } else {
      await pool.query(
        `INSERT INTO dishes (id, name, type, origin, description, is_curated, embedding)
         VALUES ($1, $2, $3, $4, $5, true, $6::vector)`,
        [
          id,
          dish.name,
          dish.type ?? "",
          dish.origin ?? "",
          dish.description ?? "",
          vecLiteral,
        ],
      );
      inserted += 1;
    }
  }

  console.info(
    `[seed] inserted=${inserted} embedded=${embedded} skipped=${skipped}`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
