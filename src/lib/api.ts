import type { Dish } from "./dish";

export type User = {
  id: string;
  email: string | null;
  name: string | null;
  picture_url: string | null;
};

export type DishDetails = {
  dish: Dish;
  ingredients: string[] | null;
  history: string | null;
  saved: boolean;
};

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: User | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch("/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => undefined);
}

export async function searchDishes(q: string): Promise<Dish[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Dish[] };
  return data.results ?? [];
}

export async function fetchDish(id: string): Promise<DishDetails | null> {
  const res = await fetch(`/api/dish/${encodeURIComponent(id)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  return (await res.json()) as DishDetails;
}

export async function correctDish(
  originalName: string,
  correctedName: string,
): Promise<DishDetails | null> {
  const res = await fetch("/api/correct", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalName, correctedName }),
  });
  if (!res.ok) return null;
  return (await res.json()) as DishDetails;
}

export async function saveDish(id: string): Promise<boolean> {
  const res = await fetch(`/api/saved/${encodeURIComponent(id)}`, {
    method: "POST",
    credentials: "same-origin",
  });
  return res.ok;
}

export async function unsaveDish(id: string): Promise<boolean> {
  const res = await fetch(`/api/saved/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return res.ok;
}

export async function fetchSaved(): Promise<Dish[]> {
  const res = await fetch("/api/saved", { credentials: "same-origin" });
  if (!res.ok) return [];
  const data = (await res.json()) as { dishes?: Dish[] };
  return data.dishes ?? [];
}
