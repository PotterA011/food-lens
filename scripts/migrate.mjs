import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../server/db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "..", "migrations");

async function main() {
  const pool = getPool();
  if (!pool) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    console.info(`[migrate] applying ${file}`);
    await pool.query(sql);
  }

  console.info("[migrate] done");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
