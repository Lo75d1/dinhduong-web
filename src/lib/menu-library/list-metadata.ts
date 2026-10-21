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
    unitLabel: typeof unit.label === "string" ? unit.label : null,
    dayCount: days?.length ?? null,
    groupCount: Array.isArray(draft.groups) ? draft.groups.length : null,
    mealLabels: [...new Set(labels)],
  };
}
