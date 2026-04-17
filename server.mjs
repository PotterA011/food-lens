import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const dishes = JSON.parse(
  readFileSync(path.join(__dirname, "src/data/dishes.json"), "utf8"),
);

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "8mb" }));

const SCHEMA = {
  name: "food_identification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["isFood", "name", "shortDescription", "confidence"],
    properties: {
      isFood: { type: "boolean" },
      name: { type: "string" },
      shortDescription: { type: "string" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
    },
  },
};

const PROMPT =
  "Identify the dish in the photo. Prefer Malaysian names when clearly Malaysian; otherwise use the most common English name. " +
  "Return strict JSON per the schema. Do not guess calories, price, or ingredients.";

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

function findDish(query) {
  const q = norm(query);
  if (!q) return null;
  let exact = null;
  let starts = null;
  let contains = null;
  let fuzzy = null;

  for (const dish of dishes) {
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
  return exact ?? starts ?? contains ?? fuzzy?.dish ?? null;
}

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/recognize", async (req, res) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  const log = (event, extra = {}) => {
    const elapsedMs = Date.now() - startedAt;
    console.info(`[recognize:${requestId}] ${event}`, { elapsedMs, ...extra });
  };

  log("start");

  const imageBase64 = req.body?.imageBase64;
  const mimeType = req.body?.mimeType || "image/jpeg";
  if (!imageBase64 || typeof imageBase64 !== "string") {
    log("no_image_base64");
    return res.status(400).json({ error: "no_image" });
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    log("missing_key");
    return res.status(500).json({ error: "server_misconfigured" });
  }
  const model = process.env.VISION_MODEL ?? "openai/gpt-4o";
  const upstreamTimeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 20000);
  log("model_selected", { model, upstreamTimeoutMs });

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  log("upstream_request_start", { base64Length: imageBase64.length });

  let upstream;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: SCHEMA },
      }),
      signal: AbortSignal.timeout(upstreamTimeoutMs),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    const isTimeout = reason === "TimeoutError" || reason === "AbortError";
    log("upstream_request_failed", { reason, isTimeout });
    return res
      .status(504)
      .json({ error: isTimeout ? "upstream_timeout" : "upstream_network_error" });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    log("upstream_non_ok", { status: upstream.status, detail: detail.slice(0, 300) });
    return res.status(502).json({ error: "upstream_error" });
  }

  let parsed;
  try {
    const raw = await upstream.json();
    const content = raw?.choices?.[0]?.message?.content;
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    log("bad_model_json");
    return res.status(502).json({ error: "bad_model_output" });
  }

  if (!parsed?.isFood) {
    log("not_food");
    return res.status(200).json({ error: "not_food" });
  }

  const match = findDish(parsed.name);
  const dish = match ?? {
    name: parsed.name,
    type: "",
    origin: "",
    description: parsed.shortDescription,
  };
  log("success", { matchedDataset: Boolean(match), returnedName: dish.name });
  return res.status(200).json({ dish });
});

app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Food Lens running on http://localhost:${port}`);
});
