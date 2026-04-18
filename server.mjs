import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authMiddleware, mountAuthRoutes } from "./server/auth.mjs";
import { recognizeRouter } from "./server/routes/recognize.mjs";
import { searchRouter } from "./server/routes/search.mjs";
import { dishRouter } from "./server/routes/dish.mjs";
import { correctRouter } from "./server/routes/correct.mjs";
import { savedRouter } from "./server/routes/saved.mjs";
import { hasDb } from "./server/db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "8mb" }));
app.use(authMiddleware());

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, db: hasDb() });
});

mountAuthRoutes(app);
app.use(recognizeRouter());
app.use(searchRouter());
app.use(dishRouter());
app.use(correctRouter());
app.use(savedRouter());

app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Food Lens running on http://localhost:${port} (db=${hasDb()})`);
});
