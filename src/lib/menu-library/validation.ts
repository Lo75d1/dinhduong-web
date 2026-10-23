import { COOKING_METHOD_OPTIONS, TEXTURE_OPTIONS, LIFE_STAGE_OPTIONS, EATING_CONTEXT_OPTIONS, type MenuLibraryDraft } from "./contracts";
import { contentReadiness, librarySection, hospitalUse } from "./content-policy";
import { MEAL_REFERENCE_RULES, REFERENCE_SOURCES } from "./catalog";
import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import { NutritionInputError, parseNutritionProfile } from "@/lib/nutrition-chat/validation";

type Schema = { type?: string; enum?: readonly unknown[]; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: false; items?: Schema; minItems?: number; maxItems?: number; minLength?: number; maxLength?: number; pattern?: string; minimum?: number; maximum?: number; exclusiveMinimum?: number; anyOf?: Schema[] };
const text = (maxLength = 200): Schema => ({ type: "string", minLength: 1, maxLength });
const id: Schema = { ...text(100), pattern: "^[A-Za-z0-9_-]+$" };
const number = (maximum = 1_000_000): Schema => ({ type: "number", minimum: 0, maximum });
const integer = (minimum: number, maximum: number): Schema => ({ type: "integer", minimum, maximum });
const en = (...values: string[]): Schema => ({ type: "string", enum: values });
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: "null" }] });
const obj = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties).filter(key => !optional.includes(key)) });
const arr = (items: Schema, maxItems: number, minItems = 0): Schema => ({ type: "array", items, maxItems, minItems });
const profileSchema = obj({
  age: text(20), ageUnit: en("tuoi", "thang"), gender: en("Nam", "Nữ"),
  height: { type: "string", minLength: 0, maxLength: 20 }, weight: { type: "string", minLength: 0, maxLength: 20 },
  activityLevel: en("sedentary", "light", "moderate", "heavy", "very_heavy"),
  physiology: en("normal", "pregnant_1", "pregnant_2", "pregnant_3", "lactating_1", "lactating_2"),
  pregnancyWeek: { type: "string", minLength: 0, maxLength: 20 }, prePregnancyWeight: { type: "string", minLength: 0, maxLength: 20 }, pregnancyNote: { type: "string", minLength: 0, maxLength: 1000 },
}, ["height", "weight", "pregnancyWeek", "prePregnancyWeight", "pregnancyNote"]);

export const MENU_LIBRARY_DRAFT_SCHEMA = obj({
  schemaVersion: en("1.0.0", "1.1.0", "1.2.0"), id, version: integer(1, 1_000_000), status: en("draft"), title: text(),
  description: nullable(text(1000)), tags: arr(text(50), 20),
  direction: en("individual", "collective"),
  librarySection: en("individual", "collective", "hospital"),
  hospitalUse: nullable(en("patient_guidance", "hospital_kitchen")),
  availability: obj({ state: en("active", "archived"), reason: nullable(text(1000)) }),
  eatingContext: nullable(en(...EATING_CONTEXT_OPTIONS.map(option => option.value))),
  unit: nullable(obj({ id, label: text(), type: en("school", "workplace", "agency", "hospital", "other") })),
  coverage: en("full_day", "served_meals"), derivedFrom: nullable(obj({ templateId: id, version: integer(1, 1_000_000) })),
  groups: arr(obj({
    id, label: text(), schoolLevel: nullable(en("nursery", "kindergarten", "primary", "lower_secondary", "upper_secondary")),
    ageYears: nullable(obj({ min: integer(0, 120), max: integer(0, 120) })), gender: en("male", "female", "mixed", "unspecified"),
    lifeStage: nullable(en(...LIFE_STAGE_OPTIONS.map(option => option.value))),
    ageMonths: nullable(obj({ min: integer(0, 216), max: integer(0, 216) })),
    guidance: obj({ notes: arr(text(1000), 20), recommendations: arr(text(1000), 20) }),
    recommendationProfile: nullable(profileSchema),
    activity: nullable(text()), goal: nullable(text()), designEnergyKcal: nullable({ type: "number", exclusiveMinimum: 0, maximum: 20000 }), dietCode: nullable(id),
    dailyReferences: arr(obj({ nutrient: { type: "string", enum: ALL_NUTRIENT_FIELDS.map(field => field.key) }, unit: text(20), kind: en("target", "range", "minimum", "maximum"), target: nullable(number()), min: nullable(number()), max: nullable(number()), denominator: en("person_day"), sourceId: id, sourceVersion: text(150), locator: text(500) }), 30),
  }, ["designEnergyKcal", "lifeStage", "ageMonths", "guidance", "recommendationProfile"]), 20, 1),
  days: arr(obj({ id, dayIndex: integer(1, 31), date: nullable({ ...text(10), pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), meals: arr(obj({
    id, code: en("breakfast", "lunch", "afternoon_main", "afternoon_snack", "dinner", "shift_main", "other"), label: text(100),
    eatingContext: nullable(en(...EATING_CONTEXT_OPTIONS.map(option => option.value))),
    groupPortions: arr(obj({ groupId: id, headcount: nullable(integer(0, 100_000)), mealRuleIds: arr(id, 6), dishes: arr(obj({
      id, recipeId: nullable(id), label: text(), sourceKind: en("catalog", "ai", "manual"),
      preparation: obj({ method: nullable(en(...COOKING_METHOD_OPTIONS.map(option => option.value))), texture: nullable(en(...TEXTURE_OPTIONS.map(option => option.value))), steps: arr(text(1000), 20), notes: arr(text(1000), 20) }),
      ingredients: arr(obj({ foodId: id, quantityPerPortion: number(100_000), unit: en("g", "ml"), basis: en("edible_raw"), edibleFraction: nullable({ type: "number", exclusiveMinimum: 0, maximum: 1 }), cookingYield: nullable({ type: "number", exclusiveMinimum: 0, maximum: 100 }) }), 30),
    }, ["preparation"]), 12) }), 20),
  }, ["eatingContext"]), 8) }), 31, 1),
}, ["eatingContext", "librarySection", "hospitalUse", "availability", "description", "tags"]);

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
    if (typeof value !== "string" || !value.trim() && schema.minLength !== 0 || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? 1000) || /[\x00-\x1f\x7f]/.test(value) || schema.pattern && !new RegExp(schema.pattern).test(value)) return bad();
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
  const section = librarySection(draft), use = hospitalUse(draft);
  const hospitalMatches = use === "patient_guidance" ? draft.direction === "individual"
    : use === "hospital_kitchen" && draft.direction === "collective" && draft.unit?.type === "hospital";
  if (section === "hospital" ? !hospitalMatches : section !== draft.direction || draft.hospitalUse != null || draft.unit?.type === "hospital") menuInputError("Kho và mục bệnh viện không khớp đối tượng / đơn vị.", "librarySection");
  if (draft.availability?.state === "archived" && !draft.availability.reason?.trim()) menuInputError("Cần lý do ngừng dùng; nội dung và lịch sử vẫn được giữ.", "availability.reason");
  for (const group of draft.groups) {
    if (group.recommendationProfile) parseNutritionProfile(group.recommendationProfile);
    if (group.ageYears && group.ageYears.min > group.ageYears.max) menuInputError("Khoảng tuổi không hợp lệ.", "ageYears");
    if (group.ageMonths && group.ageMonths.min > group.ageMonths.max) menuInputError("Khoảng tuổi theo tháng không hợp lệ.", "ageMonths");
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
  const clean = structuredClone(draft);
  for (const group of clean.groups) if (group.recommendationProfile) group.recommendationProfile = parseNutritionProfile(group.recommendationProfile);
  return clean;
}

export function draftWarnings(draft: MenuLibraryDraft): string[] {
  const warnings = ["Đã lưu bản nháp; chưa duyệt chuyên môn và chưa tính dinh dưỡng/đi chợ tập thể."];
  if (draft.groups.some(group => !group.dailyReferences.length)) warnings.push("Còn nhóm chưa có mốc nhu cầu ngày.");
  if (draft.days.some(day => !day.meals.length || day.meals.some(meal => meal.groupPortions.length < draft.groups.length || meal.groupPortions.some(portion => portion.headcount !== 0 && !portion.dishes.length)))) warnings.push("Còn thiếu bữa, nhóm hoặc món; dữ kiện thiếu được giữ nguyên.");
  if (draft.days.some(day => day.meals.some(meal => meal.groupPortions.some(portion => portion.headcount === null)))) warnings.push("Chưa đủ số suất để tổng hợp số lượng phục vụ/đi chợ; vẫn có thể phân tích định lượng một suất.");
  const readiness = contentReadiness(draft);
  if (readiness.length) warnings.push(`Chưa đủ nội dung sử dụng: ${readiness.length} mục cần bổ sung. Xem tại ngày / nhóm tương ứng.`);
  return warnings;
}
