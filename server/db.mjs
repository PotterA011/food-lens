import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  const needsSsl =
    /neon\.tech|render\.com|supabase|amazonaws|aiven|cockroach|\bsslmode=require\b/i.test(
      connectionString,
    );
  pool = new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    max: 5,
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error", err);
  });
  return pool;
}

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

export async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL not configured");
  return p.query(text, params);
}

export function toVectorLiteral(vec) {
  return `[${vec.map((n) => Number(n).toFixed(6)).join(",")}]`;
}
