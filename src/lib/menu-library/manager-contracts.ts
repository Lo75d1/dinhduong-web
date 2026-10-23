import type { MenuLibraryDraft, MealCode } from "./contracts";
import { EATING_CONTEXT_OPTIONS, LIFE_STAGE_OPTIONS } from "./contracts";
export const LIBRARY_SECTIONS = [{
  value: "individual",
  label: "Cá thể"
}, {
  value: "collective",
  label: "Tập thể"
}, {
  value: "hospital",
  label: "Bệnh viện"
}] as const;
export const HOSPITAL_USES = [{
  value: "patient_guidance",
  label: "Thực đơn bệnh lý",
  description: "Khuyến nghị cho người bệnh"
}, {
  value: "hospital_kitchen",
  label: "Suất ăn bệnh lý",
  description: "Phục vụ người bệnh tại bệnh viện"
}] as const;
export const MEAL_OPTIONS: {
  value: MealCode;
  label: string;
}[] = [{
  value: "breakfast",
  label: "Bữa sáng"
}, {
  value: "lunch",
  label: "Bữa trưa"
}, {
  value: "dinner",
  label: "Bữa tối"
}, {
  value: "afternoon_snack",
  label: "Bữa phụ chiều"
}, {
  value: "afternoon_main",
  label: "Bữa chính chiều"
}, {
  value: "shift_main",
  label: "Bữa ca"
}, {
  value: "other",
  label: "Bữa khác"
}];
export type ManagerFilters = {
  q: string;
  section: string;
  hospitalUse: string;
  availability: string;
};
export const EMPTY_MANAGER_FILTERS: ManagerFilters = {
  q: "",
  section: "individual",
  hospitalUse: "",
  availability: "active"
};
export type CatalogGroup = Pick<MenuLibraryDraft["groups"][number], "id" | "label" | "lifeStage" | "ageYears" | "ageMonths" | "designEnergyKcal" | "dietCode">;
export type CatalogMenu = {
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
  section: string;
  hospitalUse: string | null;
  availability: string;
  reviewState: string;
  description: string | null;
  tags: string[];
  unitLabel: string | null;
  eatingContext: string | null;
  groups: CatalogGroup[];
  days: {
    id: string;
    dayIndex: number;
    date: string | null;
    mealCount: number;
    mealLabels: string[];
  }[];
};
export type ManagerCatalog = {
  items: CatalogMenu[];
  total: number;
  nextOffset: number | null;
  csrf?: string;
};
export type TemplateRef = {
  id: string;
  revision: number;
};
export type MealRef = TemplateRef & {
  dayId: string;
  mealId: string;
  groupId: string;
};
export type MealSelection = MealRef & {
  title: string;
  label: string;
  dayIndex: number;
};
export type MealTarget = TemplateRef & {
  dayId: string;
  groupId: string;
};
export type BatchOperation = {
  action: "trash" | "restore";
  items: TemplateRef[];
} | {
  action: "tag";
  items: TemplateRef[];
  tags: string[];
} | {
  action: "section";
  items: TemplateRef[];
  section: string;
  hospitalUse: string | null;
} | {
  action: "remove_meals";
  meals: MealRef[];
} | {
  action: "transfer";
  meals: MealRef[];
  targets: MealTarget[];
  mode: "copy" | "move";
} | {
  action: "reorder";
  item: TemplateRef;
  dayId: string;
  mealIds: string[];
};
export type BatchRequest = BatchOperation & {
  requestKey: string;
  reason: string;
};
export type BatchResult = {
  items: TemplateRef[];
  replayed?: boolean;
};
export function menuSectionLabel(section: string, hospitalUse?: string | null) {
  return section === "hospital" ? HOSPITAL_USES.find(use => use.value === hospitalUse)?.label ?? "Bệnh viện" : LIBRARY_SECTIONS.find(item => item.value === section)?.label ?? section;
}
export function parseTags(value: string) {
  return [...new Set(value.split(/[,\n]/).map(tag => tag.trim().replace(/^#+/, "")).filter(Boolean))];
}
export function menuTags(item: CatalogMenu) {
  return [...new Set([...(item.tags ?? []), ...item.groups.flatMap(group => LIFE_STAGE_OPTIONS.find(option => option.value === group.lifeStage)?.label ?? []), EATING_CONTEXT_OPTIONS.find(option => option.value === item.eatingContext)?.label].filter((tag): tag is string => !!tag))];
}
export function reorderSelectedMeals(order: string[], movingIds: string[], overId: string) {
  const moving = new Set(movingIds);
  if (moving.has(overId) || !order.includes(overId)) return order;
  const block = order.filter(id => moving.has(id)),
    rest = order.filter(id => !moving.has(id));
  if (!block.length) return order;
  const down = order.indexOf(block[0]) < order.indexOf(overId);
  rest.splice(rest.indexOf(overId) + (down ? 1 : 0), 0, ...block);
  return rest;
}
export function energyLabel(groups: CatalogGroup[]) {
  const values = [...new Set(groups.flatMap(group => group.designEnergyKcal != null ? [group.designEnergyKcal] : []))].sort((a, b) => a - b);
  return values.length ? `${values.map(value => value.toLocaleString("vi-VN")).join(" / ")} kcal` : "Chưa nhập năng lượng";
}
export function mealCountLabel(days: CatalogMenu["days"]) {
  if (!days.length) return "Chưa có ngày ăn";
  const counts = days.map(day => day.mealCount),
    min = Math.min(...counts),
    max = Math.max(...counts);
  return `${min === max ? min : `${min}–${max}`} bữa/ngày`;
}
