import { EATING_CONTEXT_OPTIONS, type EatingContext } from "./contracts";
/** Small read-only projection; never send the full draft in a catalog response. */
export function menuListMetadata(document: unknown) {
  const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const draft = record(document), unit = record(draft.unit);
  const days = Array.isArray(draft.days) ? draft.days : null;
  const labels = days?.flatMap(day => {
    const meals = record(day).meals;
    return Array.isArray(meals) ? meals.flatMap(meal => typeof record(meal).label === "string" ? [record(meal).label as string] : []) : [];
  }) ?? [];
  return {
    eatingContext: EATING_CONTEXT_OPTIONS.some(option => option.value === draft.eatingContext) ? draft.eatingContext as EatingContext : null,
    unitLabel: typeof unit.label === "string" ? unit.label : null,
    dayCount: days?.length ?? null,
    groupCount: Array.isArray(draft.groups) ? draft.groups.length : null,
    mealLabels: [...new Set(labels)],
  };
}
