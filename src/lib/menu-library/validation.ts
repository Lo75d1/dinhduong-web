import { EATING_CONTEXT_OPTIONS, type MenuLibraryDraft } from "./contracts";
import { MEAL_REFERENCE_RULES, REFERENCE_SOURCES } from "./catalog";
import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import { NutritionInputError } from "@/lib/nutrition-chat/validation";

type Schema = { type?: string; enum?: readonly unknown[]; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: false; items?: Schema; minItems?: number; maxItems?: number; minLength?: number; maxLength?: number; pattern?: string; minimum?: number; maximum?: number; exclusiveMinimum?: number; anyOf?: Schema[] };
const text = (maxLength = 200): Schema => ({ type: "string", minLength: 1, maxLength });
const id: Schema = { ...text(100), pattern: "^[A-Za-z0-9_-]+$" };
const number = (maximum = 1_000_000): Schema => ({ type: "number", minimum: 0, maximum });
const integer = (minimum: number, maximum: number): Schema => ({ type: "integer", minimum, maximum });
const en = (...values: string[]): Schema => ({ type: "string", enum: values });
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: "null" }] });
const obj = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties).filter(key => !optional.includes(key)) });
const arr = (items: Schema, maxItems: number, minItems = 0): Schema => ({ type: "array", items, maxItems, minItems });

export const MENU_LIBRARY_DRAFT_SCHEMA = obj({
  schemaVersion: en("1.0.0", "1.1.0"), id, version: integer(1, 1_000_000), status: en("draft"), title: text(),
  direction: en("individual", "collective"),
  eatingContext: nullable(en(...EATING_CONTEXT_OPTIONS.map(option => option.value))),
  unit: nullable(obj({ id, label: text(), type: en("school", "workplace", "agency", "hospital", "other") })),
  coverage: en("full_day", "served_meals"), derivedFrom: nullable(obj({ templateId: id, version: integer(1, 1_000_000) })),
  groups: arr(obj({
    id, label: text(), schoolLevel: nullable(en("nursery", "kindergarten", "primary", "lower_secondary", "upper_secondary")),
    ageYears: nullable(obj({ min: integer(0, 120), max: integer(0, 120) })), gender: en("male", "female", "mixed", "unspecified"),
    activity: nullable(text()), goal: nullable(text()), designEnergyKcal: nullable({ type: "number", exclusiveMinimum: 0, maximum: 20000 }), dietCode: nullable(id),
    dailyReferences: arr(obj({ nutrient: { type: "string", enum: ALL_NUTRIENT_FIELDS.map(field => field.key) }, unit: text(20), kind: en("target", "range", "minimum", "maximum"), target: nullable(number()), min: nullable(number()), max: nullable(number()), denominator: en("person_day"), sourceId: id, sourceVersion: text(150), locator: text(500) }), 30),
  }, ["designEnergyKcal"]), 20, 1),
  days: arr(obj({ id, dayIndex: integer(1, 31), date: nullable({ ...text(10), pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), meals: arr(obj({
    id, code: en("breakfast", "lunch", "afternoon_main", "afternoon_snack", "dinner", "shift_main", "other"), label: text(100),
    eatingContext: nullable(en(...EATING_CONTEXT_OPTIONS.map(option => option.value))),
    groupPortions: arr(obj({ groupId: id, headcount: nullable(integer(0, 100_000)), mealRuleIds: arr(id, 6), dishes: arr(obj({
      id, recipeId: nullable(id), label: text(), sourceKind: en("catalog", "ai", "manual"),
      ingredients: arr(obj({ foodId: id, quantityPerPortion: number(100_000), unit: en("g", "ml"), basis: en("edible_raw"), edibleFraction: nullable({ type: "number", exclusiveMinimum: 0, maximum: 1 }), cookingYield: nullable({ type: "number", exclusiveMinimum: 0, maximum: 100 }) }), 30),
    }), 12) }), 20),
  }, ["eatingContext"]), 8) }), 31, 1),
}, ["eatingContext"]);

export function menuInputError(message: string, field = "content", status = 400): never {
  throw new NutritionInputError(message, field, status);
}
function validate(schema: Schema, value: unknown, path: string): void {
  if (schema.anyOf) {
    if (value === null && schema.anyOf.some(item => item.type === "null")) return;
    return validate(schema.anyOf.find(item => item.type !== "null")!, value, path);
  }
  const bad = () => menuInputError("Trường không hợp lệ hoặc vượt giới hạn.", path);
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return bad();
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some(key => !Object.hasOwn(schema.properties!, key)) || schema.required!.some(key => !Object.hasOwn(record, key))) return bad();
    for (const [key, item] of Object.entries(record)) validate(schema.properties![key], item, `${path}.${key}`);
  } else if (schema.type === "array") {
    if (!Array.isArray(value) || value.length < schema.minItems! || value.length > schema.maxItems!) return bad();
    value.forEach((item, index) => validate(schema.items!, item, `${path}[${index}]`));
  } else if (schema.type === "string") {
    if (typeof value !== "string" || !value.trim() || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? 1000) || /[\x00-\x1f\x7f]/.test(value) || schema.pattern && !new RegExp(schema.pattern).test(value)) return bad();
  } else if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || schema.type === "integer" && !Number.isInteger(value) || schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum || schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) return bad();
  } else if (schema.type === "null" && value !== null) return bad();
  if (schema.enum && !schema.enum.includes(value)) return bad();
}

export function validateMenuLibraryDraft(value: unknown): MenuLibraryDraft {
  validate(MENU_LIBRARY_DRAFT_SCHEMA, value, "content");
  const draft = value as MenuLibraryDraft;
  const unique = (ids: (string | number)[], field: string) => { if (new Set(ids).size !== ids.length) menuInputError("Mã hoặc số thứ tự bị trùng.", field); };
  unique(draft.groups.map(group => group.id), "groups"); unique(draft.days.map(day => day.id), "days"); unique(draft.days.map(day => day.dayIndex), "dayIndex");
  if (draft.direction === "collective" && !draft.unit || draft.direction === "individual" && (draft.unit !== null || draft.groups.length !== 1)) menuInputError("Cá nhân cần một nhóm và unit=null; tập thể cần đơn vị.", "unit");
  for (const group of draft.groups) {
    if (group.ageYears && group.ageYears.min > group.ageYears.max) menuInputError("Khoảng tuổi không hợp lệ.", "ageYears");
    if (group.schoolLevel && draft.unit?.type !== "school") menuInputError("Cấp học cần đơn vị trường học.", "schoolLevel");
    unique(group.dailyReferences.map(ref => ref.nutrient), "dailyReferences");
    for (const ref of group.dailyReferences) {
      const source = REFERENCE_SOURCES.find(source => source.id === ref.sourceId);
      if (!source || source.verification !== "extracted" || source.version !== ref.sourceVersion) menuInputError("Nguồn nhu cầu chưa đủ hoặc sai phiên bản.", "dailyReferences");
      if (ALL_NUTRIENT_FIELDS.find(field => field.key === ref.nutrient)?.unit !== ref.unit) menuInputError("Đơn vị mục tiêu không khớp chất dinh dưỡng.", "dailyReferences.unit");
      const valid = ref.kind === "target" ? ref.target !== null && ref.min === null && ref.max === null : ref.kind === "range" ? ref.target === null && ref.min !== null && ref.max !== null && ref.min <= ref.max : ref.kind === "minimum" ? ref.target === null && ref.min !== null && ref.max === null : ref.target === null && ref.min === null && ref.max !== null;
      if (!valid) menuInputError("Mốc mục tiêu/khoảng/tối thiểu/tối đa chưa nhất quán.", "dailyReferences");
    }
  }
  let rows = 0;
  const mealIds: string[] = [];
  for (const day of draft.days) {
    if (day.date && (Number.isNaN(Date.parse(day.date)) || new Date(day.date).toISOString().slice(0, 10) !== day.date)) menuInputError("Ngày lịch không tồn tại.", "date");
    for (const meal of day.meals) {
      if (draft.eatingContext && draft.eatingContext !== "mixed" && meal.eatingContext && meal.eatingContext !== draft.eatingContext) menuInputError("Bữa có bối cảnh khác: đặt bối cảnh thực đơn là Kết hợp và khai báo riêng từng bữa.", "eatingContext");
      mealIds.push(meal.id); unique(meal.groupPortions.map(group => group.groupId), "groupPortions");
      for (const portion of meal.groupPortions) {
        const group = draft.groups.find(group => group.id === portion.groupId);
        if (!group) menuInputError("groupId không thuộc thực đơn.", "groupId");
        unique(portion.mealRuleIds, "mealRuleIds"); unique(portion.dishes.map(dish => dish.id), "dishes");
        for (const ruleId of portion.mealRuleIds) {
          const rule = MEAL_REFERENCE_RULES.find(rule => rule.id === ruleId);
          if (!rule || rule.mealCode !== meal.code) menuInputError("Quy tắc không khớp mã bữa.", "mealRuleIds");
          const expected = group.schoolLevel === "nursery" ? "nursery_2021" : group.schoolLevel === "kindergarten" ? "kindergarten_2021" : group.schoolLevel ? "general_school" : "worker_reference";
          if (rule.profile !== expected || rule.profile === "worker_reference" && !["workplace", "agency", "other"].includes(draft.unit?.type ?? "")) menuInputError("Quy tắc bữa không đúng đối tượng.", "mealRuleIds");
        }
        for (const dish of portion.dishes) {
          if (dish.sourceKind === "catalog" ? !dish.recipeId : dish.recipeId !== null) menuInputError("Chỉ công thức trong kho mới có recipeId.", "recipeId");
          rows += dish.ingredients.length;
        }
      }
    }
  }
  unique(mealIds, "meals.id");
  if (rows > 1200) menuInputError("Chia thực đơn thành kỳ nhỏ hơn (tối đa 1.200 dòng).", "ingredients", 413);
  return structuredClone(draft);
}

export function draftWarnings(draft: MenuLibraryDraft): string[] {
  const warnings = ["Đã lưu bản nháp; chưa duyệt chuyên môn và chưa tính dinh dưỡng/đi chợ tập thể."];
  if (draft.groups.some(group => !group.dailyReferences.length)) warnings.push("Còn nhóm chưa có mốc nhu cầu ngày.");
  if (draft.days.some(day => !day.meals.length || day.meals.some(meal => meal.groupPortions.length < draft.groups.length || meal.groupPortions.some(portion => portion.headcount !== 0 && !portion.dishes.length)))) warnings.push("Còn thiếu bữa, nhóm hoặc món; dữ kiện thiếu được giữ nguyên.");
  if (draft.days.some(day => day.meals.some(meal => meal.groupPortions.some(portion => portion.headcount === null)))) warnings.push("Chưa đủ số suất để tổng hợp số lượng phục vụ/đi chợ; vẫn có thể phân tích định lượng một suất.");
  return warnings;
}
