import { dishes, type Dish } from "./dish";

export async function recognize(_image: File): Promise<Dish> {
  await new Promise((r) => setTimeout(r, 800));
  return dishes[Math.floor(Math.random() * dishes.length)];
}
