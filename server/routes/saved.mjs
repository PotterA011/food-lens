import express from "express";
import { query, hasDb } from "../db.mjs";
import { requireUser } from "../auth.mjs";

export function savedRouter() {
  const router = express.Router();

  router.get("/api/saved", requireUser, async (req, res) => {
    if (!hasDb()) return res.status(503).json({ error: "db_unavailable" });
    try {
      const { rows } = await query(
        `SELECT d.id, d.name, d.type, d.origin, d.description, s.saved_at
           FROM saved_dishes s
           JOIN dishes d ON d.id = s.dish_id
          WHERE s.user_id = $1
          ORDER BY s.saved_at DESC`,
        [req.user.id],
      );
      res.json({ dishes: rows });
    } catch (err) {
      console.warn("[saved] list failed", err.message);
      res.status(500).json({ error: "list_failed" });
    }
  });

  router.post("/api/saved/:id", requireUser, async (req, res) => {
    if (!hasDb()) return res.status(503).json({ error: "db_unavailable" });
    try {
      const { rows: dishRows } = await query(
        "SELECT id FROM dishes WHERE id = $1",
        [req.params.id],
      );
      if (!dishRows[0]) return res.status(404).json({ error: "not_found" });
      await query(
        `INSERT INTO saved_dishes (user_id, dish_id)
              VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [req.user.id, req.params.id],
      );
      res.json({ ok: true, saved: true });
    } catch (err) {
      console.warn("[saved] save failed", err.message);
      res.status(500).json({ error: "save_failed" });
    }
  });

  router.delete("/api/saved/:id", requireUser, async (req, res) => {
    if (!hasDb()) return res.status(503).json({ error: "db_unavailable" });
    try {
      await query(
        "DELETE FROM saved_dishes WHERE user_id = $1 AND dish_id = $2",
        [req.user.id, req.params.id],
      );
      res.json({ ok: true, saved: false });
    } catch (err) {
      console.warn("[saved] delete failed", err.message);
      res.status(500).json({ error: "delete_failed" });
    }
  });

  return router;
}
