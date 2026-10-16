import { NutritionInputError } from "./validation";

export type NutritionReportContext = { kitchenMode?: boolean; mealShares?: Record<string, number>; dietCodeId?: string };

/** Presentation settings only; never accept calculated totals or source nutrient overrides. */
export function parseNutritionReportContext(value: unknown): NutritionReportContext {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NutritionInputError("Thiết lập báo cáo không hợp lệ.");
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some(key => !["kitchenMode", "mealShares", "dietCodeId"].includes(key))) throw new NutritionInputError("Thiết lập báo cáo có trường không hỗ trợ.");
  const result: NutritionReportContext = {};
  if (item.kitchenMode !== undefined) {
    if (typeof item.kitchenMode !== "boolean") throw new NutritionInputError("Loại báo cáo không hợp lệ.");
    result.kitchenMode = item.kitchenMode;
  }
  if (item.dietCodeId !== undefined) {
    if (typeof item.dietCodeId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(item.dietCodeId)) throw new NutritionInputError("Mã chế độ ăn đã chọn không hợp lệ.");
    result.dietCodeId = item.dietCodeId;
  }
  if (item.mealShares !== undefined) {
    if (!item.mealShares || typeof item.mealShares !== "object" || Array.isArray(item.mealShares) || Object.keys(item.mealShares).length > 1000) throw new NutritionInputError("Mục tiêu từng bữa không hợp lệ.");
    result.mealShares = Object.fromEntries(Object.entries(item.mealShares).map(([meal, percent]) => {
      if (!meal.trim() || meal.length > 120 || typeof percent !== "number" || !Number.isFinite(percent) || percent < 0 || percent > 100) throw new NutritionInputError("Tỷ lệ bữa cần từ 0 đến 100%.");
      return [meal, percent];
    }));
  }
  return result;
}
