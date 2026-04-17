import { downscale } from "./image";
import type { Dish } from "./dish";

export type RecognizeResult =
  | { kind: "dish"; dish: Dish }
  | { kind: "not_food" }
  | { kind: "error"; message: string };

export async function recognize(image: File): Promise<RecognizeResult> {
  let blob: Blob;
  try {
    blob = await downscale(image);
  } catch {
    blob = image;
  }

  const imageBase64 = await blobToBase64(blob);

  let res: Response;
  try {
    res = await fetch("/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        mimeType: blob.type || "image/jpeg",
      }),
    });
  } catch (err) {
    return { kind: "error", message: (err as Error).message || "Network error" };
  }

  const data = (await res.json().catch(() => ({}))) as {
    dish?: Dish;
    error?: string;
  };

  if (data.error === "not_food") return { kind: "not_food" };
  if (!res.ok) {
    return { kind: "error", message: data.error ?? `HTTP ${res.status}` };
  }
  if (data.dish) return { kind: "dish", dish: data.dish };
  return { kind: "error", message: "Unexpected response" };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
