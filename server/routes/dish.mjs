import express from "express";
import { query, hasDb } from "../db.mjs";
import { getEnrichment } from "../enrichment.mjs";

export function dishRouter() {
  const router = express.Router();

  router.get("/api/dish/:id", async (req, res) => {
    const { id } = req.params;
    if (!hasDb()) {
      return res.status(503).json({ error: "db_unavailable" });
    }
    let dish;
    try {
      const { rows } = await query(
        "SELECT id, name, type, origin, description, is_curated FROM dishes WHERE id = $1",
        [id],
      );
      dish = rows[0];
    } catch (err) {
      console.warn("[dish] lookup failed", err.message);
      return res.status(500).json({ error: "lookup_failed" });
    }
    if (!dish) return res.status(404).json({ error: "not_found" });

    let saved = false;
    if (req.user) {
      try {
        const { rows } = await query(
          "SELECT 1 FROM saved_dishes WHERE user_id = $1 AND dish_id = $2",
          [req.user.id, id],
        );
        saved = rows.length > 0;
      } catch {
        saved = false;
      }
    }

    let enrichment = null;
    try {
      enrichment = await getEnrichment(dish);
    } catch (err) {
      console.warn("[dish] enrichment failed", err.message);
    }

    res.json({
      dish: {
        id: dish.id,
        name: dish.name,
        type: dish.type,
        origin: dish.origin,
        description: dish.description,
      },
      ingredients: enrichment?.ingredients ?? null,
      history: enrichment?.history ?? null,
      saved,
    });
  });

  return router;
}
