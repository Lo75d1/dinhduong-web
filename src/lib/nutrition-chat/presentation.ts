import type { FoodSource, MenuRowInput, ResolvedRow } from "./contracts";

export const AI_NUMBER_LEGEND = "* Số AI tự điền; — chưa có dữ liệu.";
export const RECALL_HEADERS = ["Giờ ăn", "Bữa ăn\n(Chính/Phụ)", "Tên món ăn", "Thành phần món ăn", "Số lượng thực phẩm chín\n(bát, cốc, thìa, gắp,…)", "Số lượng thực phẩm chín\n(g)", "Hệ số quy đổi", "Số lượng thực phẩm sống sạch\n(g)", "Ghi chú"];
export const RECALL_ENERGY_HEADERS = ["STT", "Tên thực phẩm sống sạch", "Số lượng thực phẩm sống sạch (g)", "Năng lượng (kcal)", "Protein (g)", "Lipid (g)", "Glucid (g)"];

export function aiFilled(row: MenuRowInput, field: string) { return row.aiFilledFields?.includes(field) === true; }
export function hasAiNumbers(row: MenuRowInput) { return row.aiFilledFields?.some(field => field !== "mealTime" && field !== "householdMeasure") === true; }
export function displayNumber(value: number | null | undefined, automatic = false) {
  return value == null || !Number.isFinite(value) ? "—" : `${automatic ? "*" : ""}${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}`;
}
export function wholeVddDish(row: ResolvedRow) { return row.food.source.kind === "catalog" && row.food.source.label === "VDD" && row.food.foodType === "MA"; }
export function briefFoodSource(source: FoodSource) {
  if (source.kind === "catalog") return ["VDD", "RNI"].includes(source.label) ? source.label : "Kho";
  return { label: "Nhãn", document: "Tài liệu", user: "Người dùng", reference: "Tham chiếu", unknown: "Chưa rõ" }[source.kind];
}

/** Presentation only. Never infer a raw weight from a cooked catalogue entry. */
export function recallAmounts(row: ResolvedRow) {
  const inputGrams = row.quantity == null ? null : row.unit === "g" ? row.quantity * row.servings : row.densityGPerMl && row.densitySource ? row.quantity * row.servings * row.densityGPerMl : null;
  const cookedGrams = row.basis === "cooked" || row.basis === "edible" && row.sourceState === "cooked" ? inputGrams : null;
  const rawCleanGrams = row.sourceState === "raw_clean" && !wholeVddDish(row) ? row.edibleGrams : null;
  const conversionFactor = rawCleanGrams !== null && row.basis === "cooked" ? row.conversionFactor ?? null : null;
  return { cookedGrams, rawCleanGrams, conversionFactor };
}

export function preservedRowMetadata(row: MenuRowInput) {
  return { mealTime: row.mealTime, householdMeasure: row.householdMeasure, sourceState: row.sourceState, aiFilledFields: row.aiFilledFields };
}
