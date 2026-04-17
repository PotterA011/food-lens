import dishes from "../src/data/dishes.json";
import { findDish, type Dish } from "./_lib/match";

export const config = { runtime: "nodejs" };

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let file: Blob | null = null;
  try {
    const form = await req.formData();
    const entry = form.get("image");
    if (entry instanceof Blob) file = entry;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!file) return Response.json({ error: "no_image" }, { status: 400 });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const model = process.env.VISION_MODEL ?? "openai/gpt-4o";

  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${b64}`;

  const upstream = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
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
    },
  );

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("OpenRouter error", upstream.status, detail);
    return Response.json({ error: "upstream_error" }, { status: 502 });
  }

  const raw = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = raw?.choices?.[0]?.message?.content;
  let parsed: VisionOutput;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    console.error("Bad JSON from model", content);
    return Response.json({ error: "bad_model_output" }, { status: 502 });
  }

  if (!parsed?.isFood) {
    return Response.json({ error: "not_food" }, { status: 200 });
  }

  const match = findDish(parsed.name, dishes as Dish[]);
  const dish: Dish = match ?? {
    name: parsed.name,
    type: "",
    origin: "",
    description: parsed.shortDescription,
  };

  return Response.json({ dish });
}
