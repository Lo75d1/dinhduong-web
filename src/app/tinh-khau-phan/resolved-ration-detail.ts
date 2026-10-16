import type { NutrientTotal, ResolvedMenu, ResolvedRow } from "@/lib/nutrition-chat/contracts";

/** Display arithmetic only: quantities are already resolved against each source's
 * 100 g / 100 ml basis on the server. Never repeat density/cooking conversions. */
export function resolvedDisplayTotal(rows: ResolvedRow[], key: string): NutrientTotal {
  let known = 0, count = 0;
  const missingRows: string[] = [];
  for (const row of rows) {
    if (row.referenceAmount === 0) continue;
    const value = row.food.nutrients[key];
    if (row.referenceAmount === null || value == null) missingRows.push(row.id);
    else { known += row.referenceAmount * value / 100; count++; }
  }
  return { value: !rows.length ? null : rows.every(row => row.referenceAmount === 0) ? 0 : count ? known : null, incomplete: missingRows.length > 0, missingRows,
    estimated: rows.some(row => row.referenceAmount !== 0 && (Boolean(row.actualFoodName) || row.recipeSource.kind === "ai" || row.food.source.kind === "unknown")) };
}

export function resolvedAmountText(rows: ResolvedRow[]) {
  const units = new Map<string, { value: number; missing: boolean; known: boolean }>();
  for (const row of rows) {
    const unit = row.food.unit, current = units.get(unit) ?? { value: 0, missing: false, known: false };
    if (row.referenceAmount === null) current.missing = true;
    else { current.value += row.referenceAmount; current.known = true; }
    units.set(unit, current);
  }
  return [...units].map(([unit, amount]) => amount.known ? `${amount.missing ? "≥ " : ""}${amount.value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${unit}` : `— ${unit}`).join(" + ") || "—";
}

export type ResolvedDetailLine = {
  key: string; kind: "food" | "dish" | "meal" | "day"; meal: string; dish: string;
  label: string; rows: ResolvedRow[]; values: Record<string, NutrientTotal>;
};
export function resolvedDetailLines(menu: ResolvedMenu, dayId: string, keys: string[]): ResolvedDetailLine[] {
  const day = menu.days.find(item => item.id === dayId);
  if (!day) return [];
  const lines: ResolvedDetailLine[] = [], meals = new Map<string, Map<string, ResolvedRow[]>>();
  for (const row of day.rows) {
    const dishes = meals.get(row.meal) ?? new Map<string, ResolvedRow[]>();
    dishes.set(row.dish, [...(dishes.get(row.dish) ?? []), row]); meals.set(row.meal, dishes);
  }
  const make = (kind: ResolvedDetailLine["kind"], meal: string, dish: string, rows: ResolvedRow[], label: string, key: string) => ({ kind, meal, dish, rows, label, key, values: Object.fromEntries(keys.map(key => [key, resolvedDisplayTotal(rows, key)])) });
  for (const [meal, dishes] of meals) {
    const mealRows: ResolvedRow[] = [];
    for (const [dish, rows] of dishes) {
      for (const row of rows) lines.push(make("food", meal, dish, [row], row.actualFoodName || row.food.name, `food:${row.id}`));
      lines.push(make("dish", meal, dish, rows, `Tổng món: ${dish || "Chưa đặt món"}`, `dish:${meal}:${dish}`)); mealRows.push(...rows);
    }
    const line = make("meal", meal, "", mealRows, `Tổng bữa: ${meal}`, `meal:${meal}`);
    const canonical = menu.analysis.days.find(item => item.dayId === dayId)?.meals.find(item => item.meal === meal);
    for (const key of keys) if (canonical?.nutrients[key]) line.values[key] = { ...line.values[key], ...canonical.nutrients[key] };
    lines.push(line);
  }
  const total = make("day", "", "", day.rows, `Tổng ${day.label}`, `day:${day.id}`), canonical = menu.dayTotals.find(item => item.id === dayId);
  for (const key of keys) if (canonical?.totals[key]) total.values[key] = canonical.totals[key];
  lines.push(total);
  return lines;
}

export function resolvedShoppingItems(rows: ResolvedRow[]) {
  const groups = new Map<string, ResolvedRow[]>();
  for (const row of rows) groups.set(row.food.id, [...(groups.get(row.food.id) ?? []), row]);
  return [...groups].map(([id, items]) => ({ id, name: items[0].food.name, source: items[0].food.source.label,
    amount: resolvedAmountText(items), rawGrams: items.every(row => row.rawGrams !== null) ? items.reduce((sum, row) => sum + row.rawGrams!, 0) : null,
    rows: items }));
}
