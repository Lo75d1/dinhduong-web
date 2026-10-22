import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import { nutritionDigest, resolveMenu } from "@/lib/nutrition-chat/core";
import type { MenuInput, NutritionFood } from "@/lib/nutrition-chat/contracts";
import type { MenuLibraryDraft } from "./contracts";

export const LIBRARY_ANALYSIS_FIELDS = ALL_NUTRIENT_FIELDS.filter(field => [
  "energyKcal", "proteinG", "lipidG", "glucidG", "fiberG", "calciumMg", "ironMg", "sodiumMg",
].includes(field.key));

/** Per-person calculation only. No whole-school averages, headcount multiplication or shopping conversion. */
export function analyzeLibraryDraft(draft: MenuLibraryDraft, foods: NutritionFood[]) {
  const sections = draft.days.flatMap(day => draft.groups.map(group => {
    const input: MenuInput = {
      title: draft.title, mode: "menu", comparison: { mode: "none" },
      fields: LIBRARY_ANALYSIS_FIELDS.map(field => field.key),
      days: day.meals.map(meal => ({ id: meal.id, label: meal.label, date: day.date ?? "", rows:
        meal.groupPortions.filter(portion => portion.groupId === group.id).flatMap(portion => portion.dishes.flatMap(dish => dish.ingredients.map((ingredient, index) => ({
          id: `${meal.id}:${dish.id}:${index}`, meal: meal.label, dish: dish.label, foodId: ingredient.foodId,
          quantity: ingredient.quantityPerPortion, unit: ingredient.unit, servings: 1, basis: "edible" as const,
          sourceState: "raw_clean" as const,
          recipeSource: { kind: dish.sourceKind === "catalog" ? "catalog" as const : dish.sourceKind === "ai" ? "ai" as const : "user" as const, label: dish.sourceKind, ...(dish.recipeId ? { dishId: dish.recipeId } : {}) },
        })))),
      })),
    };
    const resolved = resolveMenu(input, foods);
    const rows = resolved.days.flatMap(item => item.rows);
    const totals = Object.fromEntries(LIBRARY_ANALYSIS_FIELDS.map(field => [field.key, resolved.totals[field.key]]));
    const energy = totals.energyKcal;
    const macroPercent = Object.fromEntries(["proteinG", "lipidG", "glucidG"].map(key => [key,
      !energy.incomplete && energy.value !== null && energy.value > 0 && !totals[key].incomplete && totals[key].value !== null
        ? totals[key].value! * (key === "lipidG" ? 9 : 4) / energy.value * 100 : null,
    ]));
    const target = group.designEnergyKcal ?? null;
    const structureMissing = !day.meals.length || day.meals.some(meal => {
      const portion = meal.groupPortions.find(item => item.groupId === group.id);
      return !portion || !portion.dishes.length || portion.dishes.some(dish => !dish.ingredients.length);
    });
    return {
      dayId: day.id, dayIndex: day.dayIndex, groupId: group.id, groupLabel: group.label,
      targetEnergyKcal: target, targetSource: target === null ? null : "Mục tiêu thiết kế do người biên soạn nhập; không phải nhu cầu cá nhân đã đánh giá.",
      energyPercent: target !== null && !energy.incomplete && energy.value !== null ? energy.value / target * 100 : null,
      totals, macroPercent, structureMissing,
      meals: resolved.dayTotals.map(meal => ({ id: meal.id, label: meal.label, totals: Object.fromEntries(LIBRARY_ANALYSIS_FIELDS.map(field => [field.key, meal.totals[field.key]])) })),
      ingredients: rows.map(row => ({ id: row.id, foodId: row.food.id, name: row.food.name, meal: row.meal, dish: row.dish, source: row.food.source.label, quantity: row.quantity, unit: row.unit })),
      missingInputs: resolved.missingInputs,
      warnings: [...new Set(rows.flatMap(row => row.food.qualityWarnings ?? []))],
    };
  }));
  const payload = { engineVersion: "menu-library-review-1", revision: draft.version, coverage: draft.coverage, fields: LIBRARY_ANALYSIS_FIELDS, sections };
  // Include source values as well as output: source changes invalidate a previous preview.
  const digest = nutritionDigest({ draft, foods, payload });
  return { ...payload, digest, canApprove: sections.length > 0 && sections.every(section => !section.structureMissing && !section.missingInputs.length) };
}
export type LibraryAnalysis = ReturnType<typeof analyzeLibraryDraft>;
