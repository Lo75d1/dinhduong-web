import type { NutritionFood } from "../../../src/lib/nutrition-chat/contracts";
import { NutritionInputError } from "../../../src/lib/nutrition-chat/validation";
let energy = 130;
let label = "Nguồn giả lập kiểm thử", foodType = "CB";
export function setFixtureFoodEnergy(value: number) { energy = value; }
export function setFixtureFoodSource(value: string, type: string) { label = value; foodType = type; }
export async function loadNutritionFoods(ids: string[]): Promise<NutritionFood[]> {
  return ids.includes("fixture-rice") ? [{
    id: "fixture-rice", name: "Cơm (fixture)", unit: "g", source: { kind: "catalog", label, confirmed: true },
    foodType, wastePercent: null, foodGroup: "Lương thực", nutrients: {
      energyKcal: energy, proteinG: 2.5, lipidG: 0.3, glucidG: 28, calciumMg: null,
    },
  }] : [];
}
export async function loadNutritionRecommendations() { return []; }
export async function loadNutritionCatalogue() { return loadNutritionFoods(["fixture-rice"]); }
export async function searchNutritionFoods() { return { items: await loadNutritionCatalogue(), total: 1, nextOffset: null, note: "Fixture data only" }; }
export async function getNutritionFood(id: string) {
  const foods = await loadNutritionFoods([id]);
  if (!foods.length) throw new NutritionInputError("Không tìm thấy Food fixture.", "foodId", 404);
  return foods[0];
}
export async function searchNutritionDishes() { return { items: [], total: 0 }; }
export async function getNutritionDish() { throw new NutritionInputError("Không có Dish fixture.", "dishId", 404); }
