import data from "../data/dishes.json";

export type Dish = {
  name: string;
  type: string;
  origin: string;
  description: string;
  calories?: number;
  priceMYR?: string;
  ingredients?: string[];
};

export const dishes: Dish[] = data;
