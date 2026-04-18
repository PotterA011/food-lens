import data from "../data/dishes.json";

export type Dish = {
  id?: string;
  name: string;
  type: string;
  origin: string;
  description: string;
};

export const dishes: Dish[] = data as Dish[];
