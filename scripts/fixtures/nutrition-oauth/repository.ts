import type { NutritionFood } from "../../../src/lib/nutrition-chat/contracts";
import { NutritionInputError } from "../../../src/lib/nutrition-chat/validation";
import { nutritionDietCode } from "../../../src/lib/nutrition-chat/clinical";
import { sanitizeNutritionFood } from "../../../src/lib/nutrition-chat/core";
let dietEnergyMax = 200;
export function setFixtureDietEnergyMax(value: number) { dietEnergyMax = value; }
export async function loadNutritionDietCode(id: string) {
  if (id !== "fixture-diet") throw new NutritionInputError("Không tìm thấy mã fixture.", "clinicalContext.dietCodeId", 404);
  return nutritionDietCode({ id, code: "TEST-01", name: "Chế độ giả lập chỉ kiểm thử", targetGroup: "NguoiLon", diseaseGroup: "Kiểm thử", energyMinKcal: 100, energyMaxKcal: dietEnergyMax, proteinMinG: 2, proteinMaxG: 5, mealsMin: 1, mealsMax: 3, note: "Dữ liệu giả lập, không dùng cho người bệnh." });
}
export async function searchNutritionDietCodes() { return { items: [await loadNutritionDietCode("fixture-diet")], total: 1, nextOffset: null }; }
let energy = 130;
let label = "Nguồn giả lập kiểm thử", foodType = "CB";
export function setFixtureFoodEnergy(value: number) { energy = value; }
export function setFixtureFoodSource(value: string, type: string) { label = value; foodType = type; }
let requestedFields: string[] = [];
export function fixtureRequestedNutrientFields() { return requestedFields; }
export async function loadNutritionFoods(ids: string[], fields: string[] = []): Promise<NutritionFood[]> {
  requestedFields = fields;
  return ids.includes("fixture-rice") ? [sanitizeNutritionFood({
    id: "fixture-rice", name: "Cơm (fixture)", unit: "g", source: { kind: "catalog", label, confirmed: true },
    foodType, wastePercent: null, foodGroup: "Lương thực", nutrients: {
      energyKcal: energy, proteinG: 2.5, lipidG: 0.3, glucidG: 28, calciumMg: null,
    },
  })] : [];
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
