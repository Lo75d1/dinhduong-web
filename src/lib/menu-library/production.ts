import type { MenuLibraryDraft } from "./contracts";

/** Gram precision for the scale. Per-serving source data and nutrition stay exact. */
export function productionAmount(perPortion: number, portions: number) {
  if (!Number.isFinite(perPortion) || perPortion < 0 || !Number.isSafeInteger(portions) || portions < 1 || portions > 100000) return null;
  const exact = perPortion * portions;
  return { exact, grams: Math.round(exact), belowScale: exact > 0 && exact < 1 };
}
export function ingredientQuantity(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
}
/** Legacy fractions may be read/retained. A changed/new cooking quantity uses whole units. */
export function changedFractionalQuantity(original: MenuLibraryDraft | null, next: MenuLibraryDraft) {
  for (const day of next.days) for (const meal of day.meals) for (const portion of meal.groupPortions) for (const dish of portion.dishes) {
    const old = original?.days.find(d => d.id === day.id)?.meals.find(m => m.id === meal.id)?.groupPortions.find(p => p.groupId === portion.groupId)?.dishes.find(d => d.id === dish.id);
    for (let i = 0; i < dish.ingredients.length; i++) {
      const item = dish.ingredients[i];
      if (Number.isInteger(item.quantityPerPortion)) continue;
      const sameFood = old?.ingredients.filter(row => row.foodId === item.foodId) ?? [];
      const ordinal = dish.ingredients.slice(0, i).filter(row => row.foodId === item.foodId).length;
      if (sameFood[ordinal]?.quantityPerPortion !== item.quantityPerPortion) return true;
    }
  }
  return false;
}
