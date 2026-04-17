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

  const form = new FormData();
  form.append("image", blob, "photo.jpg");

  let res: Response;
  try {
    res = await fetch("/api/recognize", { method: "POST", body: form });
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
