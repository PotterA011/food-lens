import { dishes, type Dish } from "./dish";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const index: { dish: Dish; key: string }[] = dishes.map((d) => ({
  dish: d,
  key: norm(d.name),
}));

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

export function search(query: string, limit = 8): Dish[] {
  const q = norm(query.trim());
  if (!q) return [];

  const starts: Dish[] = [];
  const contains: Dish[] = [];
  const fuzzy: { dish: Dish; d: number }[] = [];

  for (const { dish, key } of index) {
    if (key.startsWith(q)) starts.push(dish);
    else if (key.includes(q)) contains.push(dish);
    else if (q.length >= 3) {
      const d = editDistance(q, key);
      if (d <= 2) fuzzy.push({ dish, d });
    }
  }

  fuzzy.sort((a, b) => a.d - b.d);

  return [...starts, ...contains, ...fuzzy.map((f) => f.dish)].slice(0, limit);
}
