import type { MenuLibraryDraft } from "../../../src/lib/menu-library/contracts";

// UI-only fixtures. No production food IDs, targets, recipe codes or API writes.
// Both layouts render these same objects. Names, menus and headcounts are examples.
type Group = MenuLibraryDraft["groups"][number];
export type ExampleTemplate = { draft: MenuLibraryDraft; updatedAt: string };
const group = (id: string, label: string, schoolLevel: Group["schoolLevel"] = null): Group => ({
  id, label, schoolLevel, ageYears: null, gender: "unspecified", activity: null,
  goal: null, dietCode: null, dailyReferences: [],
});
const primary = [group("age-6-7", "6–7 tuổi", "primary"), group("age-8-9", "8–9 tuổi", "primary"), group("age-10-11", "10–11 tuổi", "primary")];
primary.forEach((g, i) => { g.ageYears = { min: 6 + i * 2, max: 7 + i * 2 }; });
const menus = [
  ["Cơm trắng", "Thịt kho trứng", "Canh bí xanh", "Rau luộc"],
  ["Cơm trắng", "Cá sốt cà chua", "Canh rau ngót", "Bí đỏ hấp"],
  ["Cơm trắng", "Gà kho gừng", "Canh cải thịt", "Su su xào"],
  ["Cơm trắng", "Đậu phụ sốt thịt", "Canh bầu", "Rau cải luộc"],
  ["Cơm trắng", "Thịt viên sốt", "Canh củ quả", "Đậu cô ve xào"],
];
function sample(id: string, title: string, unit: MenuLibraryDraft["unit"], groups: Group[], days: number, snack: boolean, revision = 1): ExampleTemplate {
  return { updatedAt: `2026-10-${revision === 2 ? "21" : "20"}T03:00:00Z`, draft: {
    schemaVersion: "1.0.0", id, version: revision, status: "draft", title,
    direction: unit ? "collective" : "individual", unit, coverage: unit ? "served_meals" : "full_day", derivedFrom: null, groups,
    days: Array.from({ length: days }, (_, index) => ({
      id: `${id}-day-${index + 1}`, dayIndex: index + 1, date: null,
      meals: (unit ? [{ code: "lunch", label: "Trưa", names: menus[index % menus.length] }, ...(snack ? [{ code: "afternoon_snack", label: "Xế", names: [index % 2 ? "Sữa chua · Chuối" : "Cháo thịt bằm"] }] : [])] : [
        { code: "breakfast", label: "Sáng", names: ["Phở gà"] }, { code: "lunch", label: "Trưa", names: menus[index % menus.length] }, { code: "dinner", label: "Tối", names: ["Cơm trắng", "Cá hấp", "Canh rau"] },
      ]).map((meal, mi) => ({
        id: `${id}-${index + 1}-${mi}`, code: meal.code as MenuLibraryDraft["days"][number]["meals"][number]["code"], label: meal.label,
        groupPortions: groups.map((g, gi) => ({
          groupId: g.id, headcount: !unit ? 1 : index === 0 && mi === 0 ? [120, null, 0][gi % 3] : null, mealRuleIds: [],
          dishes: meal.names.map((label, di) => ({ id: `${id}-${index}-${mi}-${gi}-${di}`, label, recipeId: null, sourceKind: "manual", ingredients: [] })),
        })),
      })),
    })),
  } };
}
const school = { id: "demo-primary", label: "Tiểu học minh họa", type: "school" as const };
export const examples: ExampleTemplate[] = [
  sample("demo-primary-week-1", "Tuần 1 · Trưa và xế", school, primary, 5, true, 2),
  sample("demo-primary-week-2", "Tuần 2 · Bữa trưa", school, primary, 5, false),
  sample("demo-kindergarten", "Tuần 1 · Trưa và phụ chiều", { id: "demo-kindergarten-unit", label: "Mẫu giáo minh họa", type: "school" }, [group("age-3-4", "3–4 tuổi", "kindergarten"), group("age-5-6", "5–6 tuổi", "kindergarten")], 5, true),
  sample("demo-workplace", "Bữa trưa · Chu kỳ 3 ngày", { id: "demo-workplace-unit", label: "Doanh nghiệp minh họa", type: "workplace" }, [group("staff", "Nhân viên")], 3, false),
  sample("demo-individual", "Ăn thông thường · 3 ngày", null, [group("person", "Một người")], 3, false),
];
