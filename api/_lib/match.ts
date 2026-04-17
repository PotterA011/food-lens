export type Dish = {
  name: string;
  type: string;
  origin: string;
  description: string;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function editDistance(a: string, b: string): number {
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

export function findDish(query: string, dishes: Dish[]): Dish | null {
  const q = norm(query);
  if (!q) return null;

  let exact: Dish | null = null;
  let starts: Dish | null = null;
  let contains: Dish | null = null;
  let fuzzy: { dish: Dish; d: number } | null = null;

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
