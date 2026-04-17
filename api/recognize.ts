import type { VercelRequest, VercelResponse } from "@vercel/node";
import dishes from "../src/data/dishes.json";
import { findDish, type Dish } from "./_lib/match";

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
} as const;

const PROMPT =
  "Identify the dish in the photo. Prefer Malaysian names when clearly Malaysian; otherwise use the most common English name. " +
  "Return strict JSON per the schema. Do not guess calories, price, or ingredients.";

type VisionOutput = {
  isFood: boolean;
  name: string;
  shortDescription: string;
  confidence: "low" | "medium" | "high";
};

type RecognizeRequestBody = {
  imageBase64?: string;
  mimeType?: string;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  const log = (event: string, extra?: Record<string, unknown>) => {
    const elapsedMs = Date.now() - startedAt;
    console.info(`[recognize:${requestId}] ${event}`, {
      elapsedMs,
      ...extra,
    });
  };

  log("start", { method: req.method });

  if (req.method !== "POST") {
    log("reject_method");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const body = (req.body ?? {}) as RecognizeRequestBody | string;
  let parsedBody: RecognizeRequestBody;
  try {
    parsedBody = typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    log("bad_json_body");
    res.status(400).json({ error: "bad_request" });
    return;
  }
  const imageBase64 = parsedBody.imageBase64;
  const mimeType = parsedBody.mimeType || "image/jpeg";

  if (!imageBase64 || typeof imageBase64 !== "string") {
    log("no_image_base64");
    res.status(400).json({ error: "no_image" });
    return;
  }
  log("image_received", {
    mime: mimeType,
    base64Length: imageBase64.length,
  });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    log("missing_key");
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }
  const model = process.env.VISION_MODEL ?? "openai/gpt-4o";
  const upstreamTimeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 20000);
  log("model_selected", { model, upstreamTimeoutMs });

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  log("upstream_request_start");

  let upstream: Response;
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
    res
      .status(504)
      .json({ error: isTimeout ? "upstream_timeout" : "upstream_network_error" });
    return;
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    log("upstream_non_ok", { status: upstream.status, detail: detail.slice(0, 400) });
    res.status(502).json({ error: "upstream_error" });
    return;
  }
  log("upstream_ok");

  const raw = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = raw?.choices?.[0]?.message?.content;
  let parsed: VisionOutput;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    log("bad_model_json", { contentType: typeof content });
    res.status(502).json({ error: "bad_model_output" });
    return;
  }

  if (!parsed?.isFood) {
    log("not_food");
    res.status(200).json({ error: "not_food" });
    return;
  }

  const match = findDish(parsed.name, dishes as Dish[]);
  const dish: Dish = match ?? {
    name: parsed.name,
    type: "",
    origin: "",
    description: parsed.shortDescription,
  };

  log("success", { matchedDataset: Boolean(match), returnedName: dish.name });
  res.status(200).json({ dish });
}
