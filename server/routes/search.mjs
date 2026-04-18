import express from "express";
import { query, hasDb, toVectorLiteral } from "../db.mjs";
import { embedText } from "../embeddings.mjs";

export function searchRouter() {
  const router = express.Router();

  router.get("/api/search", async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit ?? 8) | 0, 1), 20);
    if (!q) return res.json({ results: [] });

    if (!hasDb()) {
      return res.status(503).json({ error: "search_unavailable", results: [] });
    }

    try {
      const vec = await embedText(q);
      const { rows } = await query(
        `SELECT id, name, type, origin, description, embedding <=> $1::vector AS distance
           FROM dishes
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT $2`,
        [toVectorLiteral(vec), limit],
      );
      res.json({
        results: rows.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          origin: r.origin,
          description: r.description,
          distance: Number(r.distance),
        })),
      });
    } catch (err) {
      console.warn("[search] failed", err.message);
      res.status(502).json({ error: "search_failed", results: [] });
    }
  });

  return router;
}
