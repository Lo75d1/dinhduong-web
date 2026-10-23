export type DailyFilters = { q: string; direction: string; eatingContext: string; unitType: string; diet: string; energy: string; meal: string; review: string; section: string; hospitalUse: string; lifeStage: string; availability: string };
export const EMPTY_DAILY_FILTERS: DailyFilters = { q: "", direction: "", eatingContext: "", unitType: "", diet: "", energy: "", meal: "", review: "", section: "", hospitalUse: "", lifeStage: "", availability: "active" };
export type DailyGroup = { id: string; label: string; energy: number | null; diet: string | null; code: string | null; dietName: string | null; lifeStage?: string | null };
export type DailyMenu = {
  id: string; title: string; direction: string; revision: number; updatedAt: string;
  dayId: string; dayIndex: number; date: string | null; dayCount: number; coverage: string;
  unitLabel: string | null; unitType: string | null; eatingContext: string | null; reviewState: string;
  section?: string; hospitalUse?: string | null; availability?: string;
  groups: DailyGroup[]; meals: { id: string; code: string; label: string; dishes: string[] }[];
};
export type DailyCatalog = { items: DailyMenu[]; total: number; nextOffset: number | null; diets: { id: string; code: string; name: string }[]; energies: number[] };

export function validDailyFilters(filters: DailyFilters, offset: number) {
  return filters.q.length <= 100 && ["", "individual", "collective"].includes(filters.direction)
    && ["", "home", "restaurant", "mixed"].includes(filters.eatingContext)
    && ["", "school", "workplace", "agency", "hospital", "other"].includes(filters.unitType)
    && (!filters.diet || /^[A-Za-z0-9_-]{1,100}$/.test(filters.diet))
    && (!filters.energy || /^\d+(\.\d+)?$/.test(filters.energy) && Number(filters.energy) > 0 && Number(filters.energy) <= 20000)
    && ["", "breakfast", "lunch", "afternoon_main", "afternoon_snack", "dinner", "shift_main", "other"].includes(filters.meal)
    && ["", "draft", "approved", "changes_requested"].includes(filters.review)
    && ["", "individual", "collective", "hospital"].includes(filters.section)
    && ["", "patient_guidance", "hospital_kitchen"].includes(filters.hospitalUse)
    && ["", "complementary_feeding", "child", "adult", "unclassified"].includes(filters.lifeStage)
    && ["active", "archived", "all"].includes(filters.availability)
    && Number.isSafeInteger(offset) && offset >= 0 && offset <= 100000;
}

export function dailyMenuTitle(title: string) {
  return title.split(/[·|]/).map(s => s.trim()).filter(s => s && !/^BV$/i.test(s)
    && !/^\d+\s*ngày$/i.test(s) && !/^\d+(?:\/\d+)*\s*kcal$/i.test(s)
    && !/^(người bệnh|bếp, lượng 1 suất)$/i.test(s)).join(" · ") || title;
}
