import { calculateQuantity } from "./quantity";
import { buildTree, type Row } from "./types";

export type DetailRow = {
  uid: string;
  meal: string;
  dish: string;
  foodId: string;
  foodName: string;
  inputGrams: number;
  inputBasis: Row["inputBasis"];
  conversionFactor: number;
  wastePercent: number | null;
  edibleGrams: number;
  rawGrams: number | null;
  energyKcal: number;
  proteinG: number;
  lipidG: number;
  glucidG: number;
};

export type IngredientTotal = {
  key: string;
  foodName: string;
  wastePercent: number | null;
  edibleGrams: number;
  rawGrams: number | null;
  hasMissingRawAmount: boolean;
};

export type ReportField = { key: string; label: string; unit: string };
export type FoodReportValues = Record<string, { source: string; values: Record<string, number | null> }>;
export type ReportLine = {
  kind: "food" | "dish" | "meal" | "day";
  key: string;
  meal: string;
  dish: string;
  foodName: string;
  edibleGrams: number;
  rawGrams: number | null;
  values: Record<string, { total: number; incomplete: boolean }>;
};

const numberOrZero = (value: number | null | undefined) => (typeof value === "number" ? value : 0);

export function buildDetailRows(rows: Row[]): DetailRow[] {
  return rows
    .filter((row) => row.foodId)
    .map((row) => {
      const quantity = calculateQuantity({
        grams: row.inputGrams,
        basis: row.inputBasis,
        conversionFactor: row.conversionFactor,
        wastePercent: row.wastePercent,
      });
      const factor = row.grams / 100;
      return {
        uid: row.uid,
        meal: row.meal || "(Chưa phân bữa)",
        dish: row.dish || "(Chưa phân món)",
        foodId: row.foodId,
        foodName: row.foodName,
        inputGrams: row.inputGrams,
        inputBasis: row.inputBasis,
        conversionFactor: row.conversionFactor,
        wastePercent: row.wastePercent,
        // `grams` là giá trị chuẩn đã được MealInput xác nhận là phần ăn được.
        edibleGrams: row.grams,
        rawGrams: quantity.rawGrams,
        energyKcal: numberOrZero(row.nutrients.energyKcal) * factor,
        proteinG: numberOrZero(row.nutrients.proteinG) * factor,
        lipidG: numberOrZero(row.nutrients.lipidG) * factor,
        glucidG: numberOrZero(row.nutrients.glucidG) * factor,
      };
    });
}

export function aggregateIngredients(items: DetailRow[]): IngredientTotal[] {
  const totals = new Map<string, IngredientTotal>();
  for (const item of items) {
    const key = `${item.foodId}|${item.wastePercent ?? "unknown"}`;
    const current = totals.get(key);
    if (!current) {
      totals.set(key, {
        key,
        foodName: item.foodName,
        wastePercent: item.wastePercent,
        edibleGrams: item.edibleGrams,
        rawGrams: item.rawGrams,
        hasMissingRawAmount: item.rawGrams === null,
      });
      continue;
    }
    current.edibleGrams += item.edibleGrams;
    if (item.rawGrams === null || current.rawGrams === null) {
      current.rawGrams = null;
      current.hasMissingRawAmount = true;
    } else {
      current.rawGrams += item.rawGrams;
    }
  }
  return [...totals.values()].sort((a, b) => a.foodName.localeCompare(b.foodName, "vi"));
}

function valueFor(row: Row, key: string, reportValues: FoodReportValues): number | null {
  const snapshot = row.nutrients[key];
  if (typeof snapshot === "number") return snapshot;
  return reportValues[row.foodId]?.values[key] ?? null;
}

function summarize(rows: Row[], fields: ReportField[], reportValues: FoodReportValues) {
  const values: ReportLine["values"] = {};
  for (const field of fields) {
    let total = 0;
    let incomplete = false;
    for (const row of rows) {
      const raw = valueFor(row, field.key, reportValues);
      if (raw === null) {
        incomplete = true;
      } else {
        total += (raw * row.grams) / 100;
      }
    }
    values[field.key] = { total, incomplete };
  }
  return values;
}

/** Tạo dòng thực phẩm + tổng món/bữa/ngày theo thứ tự bữa lâm sàng và món đang nhập. */
export function buildReportLines(rows: Row[], fields: ReportField[], reportValues: FoodReportValues): ReportLine[] {
  const foods = buildTree(rows).flatMap((meal) => meal.dishes.flatMap((dish) => dish.rows));
  const out: ReportLine[] = [];
  let mealRows: Row[] = [];
  let dishRows: Row[] = [];
  let currentMeal = "";
  let currentDish = "";

  const closeDish = () => {
    if (!dishRows.length) return;
    out.push({ kind: "dish", key: `dish-${out.length}`, meal: currentMeal, dish: currentDish, foodName: `Tổng món: ${currentDish || "(Chưa đặt món)"}`, edibleGrams: dishRows.reduce((sum, row) => sum + row.grams, 0), rawGrams: null, values: summarize(dishRows, fields, reportValues) });
    dishRows = [];
  };
  const closeMeal = () => {
    if (!mealRows.length) return;
    out.push({ kind: "meal", key: `meal-${out.length}`, meal: currentMeal, dish: "", foodName: `Tổng bữa: ${currentMeal || "(Chưa đặt bữa)"}`, edibleGrams: mealRows.reduce((sum, row) => sum + row.grams, 0), rawGrams: null, values: summarize(mealRows, fields, reportValues) });
    mealRows = [];
  };

  for (const row of foods) {
    if (mealRows.length && row.meal !== currentMeal) {
      closeDish();
      closeMeal();
    } else if (dishRows.length && row.dish !== currentDish) {
      closeDish();
    }
    currentMeal = row.meal;
    currentDish = row.dish;
    mealRows.push(row);
    dishRows.push(row);
    const quantity = calculateQuantity({ grams: row.inputGrams, basis: row.inputBasis, conversionFactor: row.conversionFactor, wastePercent: row.wastePercent });
    out.push({ kind: "food", key: row.uid, meal: row.meal, dish: row.dish, foodName: row.foodName, edibleGrams: row.grams, rawGrams: quantity.rawGrams, values: summarize([row], fields, reportValues) });
  }
  closeDish();
  closeMeal();
  if (foods.length) out.push({ kind: "day", key: "day", meal: "", dish: "", foodName: "TỔNG CẢ NGÀY", edibleGrams: foods.reduce((sum, row) => sum + row.grams, 0), rawGrams: null, values: summarize(foods, fields, reportValues) });
  return out;
}
