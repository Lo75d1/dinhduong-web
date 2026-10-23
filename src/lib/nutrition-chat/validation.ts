import { ALL_NUTRIENT_FIELDS, CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import type { CustomFoodInput, FoodSource, MenuInput, MenuRowInput, RecipeSource, TargetInput } from "./contracts";
import type { Profile } from "@/app/tinh-khau-phan/PersonalProfile";

export class NutritionInputError extends Error {
  constructor(message: string, public readonly field = "input", public readonly status = 400) { super(message); this.name = "NutritionInputError"; }
}
export const NUTRIENT_KEYS = new Set(ALL_NUTRIENT_FIELDS.map(f => f.key));
export const NUTRITION_LIMITS = { days: 90, rows: 1000, fields: 40, customFoods:100, catalogue: 6000, uploadBytes: 5 * 1024 * 1024, jsonBytes: 512 * 1024 } as const;
export const SOURCE_SCHEMA = { type: "object", additionalProperties: false, required: ["kind", "label", "confirmed"], properties: { kind: { type: "string", enum: ["catalog", "label", "document", "user", "reference", "unknown"] }, label: { type: "string", maxLength: 500 }, url: { type: "string", maxLength: 2083 }, confirmed: { type: "boolean" } } };
const numeric = { type: "number", minimum: 0, maximum: 1000000 };
export const AI_FILLED_FIELDS = ["quantity", "servings", "conversionFactor", "densityGPerMl", "mealTime", "householdMeasure", "customFood.portionAmount", "customFood.wastePercent", ...[...NUTRIENT_KEYS].map(key => `customFood.nutrients.${key}`)];
const recipeSchema = { type: "object", additionalProperties: false, required: ["kind", "label"], properties: { kind: { type: "string", enum: ["catalog", "user", "ai"] }, label: { type: "string", maxLength: 500 }, dishId: { type: "string", maxLength: 100 }, url: { type: "string", maxLength: 2083 } } };
export const MENU_INPUT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["title", "mode", "days", "comparison"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 160 }, mode: { type: "string", enum: ["recall24h", "menu"] },
    fields: { type: "array", uniqueItems: true, maxItems: NUTRITION_LIMITS.fields, items: { type: "string", enum: [...NUTRIENT_KEYS] } },
    aiComment: { type: "string", maxLength: 8000 },
    clinicalContext: { type: "object", additionalProperties: false, properties: { conditions: { type: "array", maxItems: 10, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 200 } }, notes: { type: "string", maxLength: 1500 }, targetGroup: { type: "string", enum: ["NguoiLon", "TreEm"] }, dietCodeId: { type: "string", minLength: 1, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$" }, selection: { type: "string", enum: ["proposed", "user_confirmed", "prescribed"] } } },
    profile: { type: "object", additionalProperties: false, description: "Tùy chọn khi chỉ tính thành phần hoặc dùng mục tiêu manual. Chỉ gửi khi biết đủ các trường bắt buộc; không tự đoán tuổi, giới hay tình trạng sinh lý. Nếu cần tính nhu cầu, hỏi phần còn thiếu trước khi gửi.", required: ["age", "ageUnit", "gender", "activityLevel", "physiology"], properties: {
      age: { type: "string", maxLength: 20, pattern: "^\\d+(?:\\.\\d+)?$", description: "Tuổi người dùng cung cấp, chuỗi số; đọc cùng ageUnit." },
      ageUnit: { type: "string", enum: ["tuoi", "thang"] }, gender: { type: "string", enum: ["Nam", "Nữ"] },
      height: { type: "string", maxLength: 20, description: "Chiều cao cm; chưa biết dùng chuỗi rỗng hoặc bỏ trường." }, weight: { type: "string", maxLength: 20, description: "Cân nặng kg; chưa biết dùng chuỗi rỗng hoặc bỏ trường." },
      activityLevel: { type: "string", enum: ["sedentary", "light", "moderate", "heavy", "very_heavy"] }, physiology: { type: "string", enum: ["normal", "pregnant_1", "pregnant_2", "pregnant_3", "lactating_1", "lactating_2"] },
      pregnancyWeek: { type: "string", maxLength: 20 }, prePregnancyWeight: { type: "string", maxLength: 20 }, pregnancyNote: { type: "string", maxLength: 1000 },
    } },
    comparison: { type: "object", additionalProperties: false, required: ["mode"], properties: { mode: { type: "string", enum: ["none", "profile", "manual"] }, targets: { type: "array", maxItems: 40, items: { type: "object", additionalProperties: false, required: ["key", "value", "source"], properties: { key: { type: "string", enum: [...NUTRIENT_KEYS] }, value: numeric, source: { type: "string", minLength: 1, maxLength: 500 }, isUpperLimit: { type: "boolean" } } } } } },
    days: { type: "array", minItems: 1, maxItems: NUTRITION_LIMITS.days, items: { type: "object", additionalProperties: false, required: ["id", "label", "date", "rows"], properties: {
      id: { type: "string", minLength: 1, maxLength: 100 }, label: { type: "string", minLength: 1, maxLength: 100 }, date: { type: "string", maxLength: 10 },
      rows: { type: "array", maxItems: NUTRITION_LIMITS.rows, items: { type: "object", additionalProperties: false, required: ["id", "meal", "dish", "quantity", "unit", "servings", "basis", "recipeSource"], properties: {
        id: { type: "string", minLength: 1, maxLength: 100 }, meal: { type: "string", minLength: 1, maxLength: 160 }, dish: { type: "string", minLength: 1, maxLength: 160 }, foodId: { type: "string", minLength: 1, maxLength: 100 },
        quantity: { anyOf: [numeric, { type: "null" }] }, unit: { type: "string", enum: ["g", "ml"] }, servings: { type: "number", exclusiveMinimum: 0, maximum: 10000 }, basis: { type: "string", enum: ["edible", "raw", "cooked"] },
        conversionFactor: { type: "number", exclusiveMinimum: 0, maximum: 1000 }, conversionSource: { type: "string", maxLength: 500 }, densityGPerMl: { type: "number", exclusiveMinimum: 0, maximum: 100 }, densitySource: { type: "string", maxLength: 500 },
        actualFoodName: { type: "string", maxLength: 300 }, estimateAccepted: { type: "boolean" }, recipeSource: recipeSchema, replacedFromFoodId: { type: "string", maxLength: 100 }, note: { type: "string", maxLength: 1000 },
        mealTime: { type: "string", pattern: "^(?:[01][0-9]|2[0-3]):[0-5][0-9]$" }, householdMeasure: { type: "string", maxLength: 100 }, sourceState: { type: "string", enum: ["raw_clean", "cooked", "as_sold"] },
        aiFilledFields: { type: "array", uniqueItems: true, maxItems: AI_FILLED_FIELDS.length, items: { type: "string", enum: AI_FILLED_FIELDS } },
        customFood: { type: "object", additionalProperties: false, required: ["id", "name", "source", "basis", "nutrients"], properties: {
          id: { type: "string", minLength: 1, maxLength: 100 }, name: { type: "string", minLength: 1, maxLength: 300 }, source: SOURCE_SCHEMA, basis: { type: "string", enum: ["100g", "100ml", "portion"] },
          portionAmount: { type: "number", exclusiveMinimum: 0, maximum: 1000000 }, portionUnit: { type: "string", enum: ["g", "ml"] }, wastePercent: { anyOf: [{ type: "number", minimum: 0, exclusiveMaximum: 100 }, { type: "null" }] }, foodGroup: { anyOf: [{ type: "string", maxLength: 100 }, { type: "null" }] },
          nutrients: { type: "object", additionalProperties: false, properties: Object.fromEntries([...NUTRIENT_KEYS].map(k => [k, { anyOf: [numeric, { type: "null" }] }])) },
        } },
      } } },
    } } },
  },
} as const;

function object(value: unknown, allowed: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NutritionInputError("Cần dữ liệu dạng đối tượng.", path);
  const data = value as Record<string, unknown>;
  for (const key of Object.keys(data)) if (!allowed.includes(key)) throw new NutritionInputError(`Trường không được phép: ${key}`, `${path}.${key}`);
  return data;
}
function text(value: unknown, max: number, path: string, empty = false): string {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (!empty && !value.trim())) throw new NutritionInputError("Chuỗi không hợp lệ hoặc quá dài.", path);
  return value.trim();
}
function number(value: unknown, min: number, max: number, path: string, positive = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (positive && value === 0)) throw new NutritionInputError("Số không hợp lệ hoặc ngoài giới hạn.", path);
  return value;
}
function choice<T extends string>(value: unknown, options: readonly T[], path: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) throw new NutritionInputError("Giá trị lựa chọn không hợp lệ.", path);
  return value as T;
}
function boolean(value: unknown, path: string): boolean { if (typeof value !== "boolean") throw new NutritionInputError("Cần giá trị đúng/sai.", path); return value; }
function url(value: unknown, path: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  const raw = text(value, 2083, path); let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new NutritionInputError("URL nguồn không hợp lệ.", path); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new NutritionInputError("Nguồn phải là URL HTTPS không chứa thông tin đăng nhập.", path);
  return parsed.href;
}
function source(value: unknown, path: string): FoodSource {
  const d = object(value, ["kind", "label", "url", "confirmed"], path);
  return { kind: choice(d.kind, ["catalog", "label", "document", "user", "reference", "unknown"] as const, `${path}.kind`), label: text(d.label, 500, `${path}.label`, d.kind === "unknown"), url: url(d.url, `${path}.url`), confirmed: boolean(d.confirmed, `${path}.confirmed`) };
}
function recipe(value: unknown, path: string): RecipeSource {
  const d = object(value, ["kind", "label", "dishId", "url"], path);
  return { kind: choice(d.kind, ["catalog", "user", "ai"] as const, `${path}.kind`), label: text(d.label, 500, `${path}.label`), ...(d.dishId !== undefined ? { dishId: text(d.dishId, 100, `${path}.dishId`) } : {}), ...(d.url ? { url: url(d.url, `${path}.url`) } : {}) };
}
export function parseCustomFoodInput(value: unknown, path = "food"): CustomFoodInput {
  const d = object(value, ["id", "name", "source", "basis", "portionAmount", "portionUnit", "nutrients", "wastePercent", "foodGroup"], path);
  const s = source(d.source, `${path}.source`);
  if (s.kind === "catalog" || s.kind === "reference") throw new NutritionInputError("Nguyên liệu ngoài kho cần nguồn riêng; tham chiếu kho phải dùng Food ID.", path);
  const n = object(d.nutrients, [...NUTRIENT_KEYS], `${path}.nutrients`);
  const nutrients = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v === null ? null : number(v, 0, 1000000, `${path}.nutrients.${k}`)]));
  if (s.kind === "unknown" && Object.values(nutrients).some(v => v !== null)) throw new NutritionInputError("Chưa có nguồn thì không được điền số dinh dưỡng.", path);
  const basis = choice(d.basis, ["100g", "100ml", "portion"] as const, `${path}.basis`);
  const result: CustomFoodInput = { id: text(d.id, 100, `${path}.id`), name: text(d.name, 300, `${path}.name`), source: s, basis, nutrients };
  if (d.portionAmount !== undefined) result.portionAmount = number(d.portionAmount, 0, 1000000, `${path}.portionAmount`, true);
  if (d.portionUnit !== undefined) result.portionUnit = choice(d.portionUnit, ["g", "ml"] as const, `${path}.portionUnit`);
  if (basis === "portion" && (result.portionAmount === undefined || result.portionUnit === undefined)) throw new NutritionInputError("Nguồn theo phần cần khối lượng và đơn vị của phần.", path);
  if (d.wastePercent !== undefined) result.wastePercent = d.wastePercent === null ? null : number(d.wastePercent, 0, 99.9999, `${path}.wastePercent`);
  if (d.foodGroup !== undefined) result.foodGroup = d.foodGroup === null ? null : text(d.foodGroup, 100, `${path}.foodGroup`, true);
  return result;
}
function row(value: unknown, path: string): MenuRowInput {
  const d = object(value, ["id", "meal", "dish", "foodId", "customFood", "quantity", "unit", "servings", "basis", "conversionFactor", "conversionSource", "densityGPerMl", "densitySource", "actualFoodName", "estimateAccepted", "recipeSource", "replacedFromFoodId", "note", "mealTime", "householdMeasure", "sourceState", "aiFilledFields"], path);
  if ((d.foodId !== undefined) === (d.customFood !== undefined)) throw new NutritionInputError("Mỗi nguyên liệu phải chọn đúng một Food ID hoặc nguồn ngoài kho.", path);
  const r: MenuRowInput = { id: text(d.id, 100, `${path}.id`), meal: text(d.meal, 160, `${path}.meal`), dish: text(d.dish, 160, `${path}.dish`), quantity: d.quantity === null ? null : number(d.quantity, 0, 1000000, `${path}.quantity`), unit: choice(d.unit, ["g", "ml"] as const, `${path}.unit`), servings: number(d.servings, 0, 10000, `${path}.servings`, true), basis: choice(d.basis, ["edible", "raw", "cooked"] as const, `${path}.basis`), recipeSource: recipe(d.recipeSource, `${path}.recipeSource`) };
  if (d.foodId !== undefined) r.foodId = text(d.foodId, 100, `${path}.foodId`);
  if (d.customFood !== undefined) r.customFood = parseCustomFoodInput(d.customFood, `${path}.customFood`);
  for (const k of ["conversionSource", "densitySource", "actualFoodName", "replacedFromFoodId", "note"] as const) if (d[k] !== undefined) r[k] = text(d[k], k === "note" ? 1000 : k === "replacedFromFoodId" ? 100 : 500, `${path}.${k}`, k === "note");
  if (d.conversionFactor !== undefined) r.conversionFactor = number(d.conversionFactor, 0, 1000, `${path}.conversionFactor`, true);
  if (d.densityGPerMl !== undefined) r.densityGPerMl = number(d.densityGPerMl, 0, 100, `${path}.densityGPerMl`, true);
  if (d.estimateAccepted !== undefined) r.estimateAccepted = boolean(d.estimateAccepted, `${path}.estimateAccepted`);
  if (d.mealTime !== undefined) {
    r.mealTime = text(d.mealTime, 5, `${path}.mealTime`);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.mealTime)) throw new NutritionInputError("Giờ ăn cần dạng HH:mm.", `${path}.mealTime`);
  }
  if (d.householdMeasure !== undefined) r.householdMeasure = text(d.householdMeasure, 100, `${path}.householdMeasure`, true);
  if (d.sourceState !== undefined) r.sourceState = choice(d.sourceState, ["raw_clean", "cooked", "as_sold"] as const, `${path}.sourceState`);
  if (d.aiFilledFields !== undefined) {
    if (!Array.isArray(d.aiFilledFields) || d.aiFilledFields.length > AI_FILLED_FIELDS.length || new Set(d.aiFilledFields).size !== d.aiFilledFields.length || d.aiFilledFields.some(key => typeof key !== "string" || !AI_FILLED_FIELDS.includes(key))) throw new NutritionInputError("Danh sách số AI điền không hợp lệ.", `${path}.aiFilledFields`);
    if (!r.customFood && d.aiFilledFields.some(key => key.startsWith("customFood."))) throw new NutritionInputError("Dấu AI của nguồn tự nhập cần nguồn tự nhập.", `${path}.aiFilledFields`);
    r.aiFilledFields = [...d.aiFilledFields];
  }
  if (r.actualFoodName && !r.foodId) throw new NutritionInputError("Tham chiếu tương tự cần Food ID trong kho.", path);
  return r;
}
export function parseNutritionProfile(value: unknown): Profile {
  const d = object(value, ["age", "ageUnit", "gender", "height", "weight", "activityLevel", "physiology", "pregnancyWeek", "prePregnancyWeight", "pregnancyNote"], "profile");
  for (const [key, label] of [["age", "tuổi"], ["ageUnit", "đơn vị tuổi (tuoi/thang)"], ["gender", "giới tính"], ["activityLevel", "mức vận động"], ["physiology", "tình trạng sinh lý"]] as const) {
    if (d[key] === undefined || typeof d[key] === "string" && !d[key].trim()) throw new NutritionInputError(`Hồ sơ còn thiếu ${label}. Hỏi người dùng, không tự điền. Chỉ tính thành phần: chọn comparison.mode=none và bỏ profile; mục tiêu có nguồn đã biết: chọn manual và bỏ profile. Giữ các dữ kiện đã biết để bổ sung sau.`, `profile.${key}`, 422);
  }
  for (const [key, max, required] of [["age",150,true],["height",300,false],["weight",600,false],["pregnancyWeek",45,false],["prePregnancyWeight",600,false]] as const) {
    const raw = d[key];
    if (!required && (raw === undefined || raw === "")) continue;
    if (typeof raw !== "string" || !/^\d+(?:\.\d+)?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) > (key === "age" && d.ageUnit === "thang" ? 1800 : max) || (key !== "age" && Number(raw) <= 0)) throw new NutritionInputError("Số trong hồ sơ không hợp lệ.", `profile.${key}`);
  }
  return { age: text(d.age, 20, "profile.age"), ageUnit: choice(d.ageUnit, ["tuoi", "thang"] as const, "profile.ageUnit"), gender: choice(d.gender, ["Nam", "Nữ"] as const, "profile.gender"), height: text(d.height ?? "", 20, "profile.height", true), weight: text(d.weight ?? "", 20, "profile.weight", true), activityLevel: choice(d.activityLevel, ["sedentary", "light", "moderate", "heavy", "very_heavy"] as const, "profile.activityLevel"), physiology: choice(d.physiology, ["normal", "pregnant_1", "pregnant_2", "pregnant_3", "lactating_1", "lactating_2"] as const, "profile.physiology"), pregnancyWeek: text(d.pregnancyWeek ?? "", 20, "profile.pregnancyWeek", true), prePregnancyWeight: text(d.prePregnancyWeight ?? "", 20, "profile.prePregnancyWeight", true), pregnancyNote: text(d.pregnancyNote ?? "", 1000, "profile.pregnancyNote", true) };
}
export function parseMenuInput(value: unknown): MenuInput {
  const d = object(value, ["title", "mode", "days", "fields", "comparison", "profile", "aiComment", "clinicalContext"], "input");
  if (!Array.isArray(d.days) || !d.days.length || d.days.length > NUTRITION_LIMITS.days) throw new NutritionInputError("Số ngày phải từ 1 đến 90.", "days");
  const ids = new Set<string>(), rowIds = new Set<string>(); let count = 0;
  const days = d.days.map((raw, index) => {
    const p = `days.${index}`, day = object(raw, ["id", "label", "date", "rows"], p), id = text(day.id, 100, `${p}.id`), date = text(day.date, 10, `${p}.date`, true);
    if (ids.has(id)) throw new NutritionInputError("ID ngày bị trùng.", p); ids.add(id);
    const calendar = date ? new Date(`${date}T00:00:00Z`) : null;
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !calendar || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date)) throw new NutritionInputError("Ngày phải là ngày lịch hợp lệ yyyy-mm-dd.", p);
    if (!Array.isArray(day.rows)) throw new NutritionInputError("Thiếu danh sách nguyên liệu.", p);
    count += day.rows.length; if (count > NUTRITION_LIMITS.rows) throw new NutritionInputError("Tối đa 1000 dòng mỗi lần tính.", p, 413);
    const rows = day.rows.map((r, i) => { const parsed = row(r, `${p}.rows.${i}`); if (rowIds.has(parsed.id)) throw new NutritionInputError("ID dòng bị trùng.", p); rowIds.add(parsed.id); return parsed; });
    return { id, date, label: text(day.label, 100, `${p}.label`), rows };
  });
  if (count === 0) throw new NutritionInputError("Cần ít nhất một nguyên liệu; ngày khác có thể để trống.", "days");
  if(new Set(days.flatMap(day=>day.rows.flatMap(row=>row.customFood?[row.customFood.id]:[]))).size>NUTRITION_LIMITS.customFoods)throw new NutritionInputError("Tối đa 100 nguồn tự nhập mỗi bản để giữ tương thích Excel.","customFoods",413);
  const comp = object(d.comparison, ["mode", "targets"], "comparison");
  const comparison: MenuInput["comparison"] = { mode: choice(comp.mode, ["none", "profile", "manual"] as const, "comparison.mode") };
  if (comp.targets !== undefined) {
    if (!Array.isArray(comp.targets) || comp.targets.length > 40) throw new NutritionInputError("Danh sách mục tiêu không hợp lệ.", "comparison.targets");
    const seen = new Set<string>();
    comparison.targets = comp.targets.map((raw, i): TargetInput => { const p = `comparison.targets.${i}`, t = object(raw, ["key", "value", "source", "isUpperLimit"], p), key = text(t.key, 100, p); if (!NUTRIENT_KEYS.has(key) || seen.has(key)) throw new NutritionInputError("Mục tiêu không có trong danh sách chất hoặc bị trùng.", p); seen.add(key); return { key, value: number(t.value, 0, 1000000, p), source: text(t.source, 500, p), ...(t.isUpperLimit !== undefined ? { isUpperLimit: boolean(t.isUpperLimit, p) } : {}) }; });
  }
  if (comparison.mode !== "manual" && comparison.targets?.length) throw new NutritionInputError("Mục tiêu tự nhập chỉ dùng ở chế độ manual.", "comparison");
  if (comparison.mode === "manual" && !comparison.targets?.length) throw new NutritionInputError("Cần ít nhất một mục tiêu có nguồn.", "comparison");
  const parsed: MenuInput = { title: text(d.title, 160, "title"), mode: choice(d.mode, ["recall24h", "menu"] as const, "mode"), days, comparison };
  if (d.profile !== undefined) parsed.profile = parseNutritionProfile(d.profile);
  if (d.clinicalContext !== undefined) {
    const p = "clinicalContext", c = object(d.clinicalContext, ["conditions", "notes", "targetGroup", "dietCodeId", "selection"], p);
    const clinical: NonNullable<MenuInput["clinicalContext"]> = {};
    if (c.conditions !== undefined) {
      if (!Array.isArray(c.conditions) || c.conditions.length > 10) throw new NutritionInputError("Tối đa 10 tình trạng đã được cung cấp.", p);
      clinical.conditions = c.conditions.map(value => text(value, 200, `${p}.conditions`));
      if (new Set(clinical.conditions).size !== clinical.conditions.length) throw new NutritionInputError("Tình trạng bị lặp.", p);
    }
    if (c.notes !== undefined) clinical.notes = text(c.notes, 1500, `${p}.notes`, true);
    if (c.targetGroup !== undefined) clinical.targetGroup = choice(c.targetGroup, ["NguoiLon", "TreEm"] as const, `${p}.targetGroup`);
    if (c.dietCodeId !== undefined) {
      clinical.dietCodeId = text(c.dietCodeId, 100, `${p}.dietCodeId`);
      if (!/^[A-Za-z0-9_-]+$/.test(clinical.dietCodeId)) throw new NutritionInputError("ID mã chế độ ăn không hợp lệ.", p);
      clinical.selection = choice(c.selection, ["proposed", "user_confirmed", "prescribed"] as const, `${p}.selection`);
      if (!clinical.targetGroup) throw new NutritionInputError("Cần xác nhận đối tượng của mã chế độ ăn.", `${p}.targetGroup`);
    } else if (c.selection !== undefined) throw new NutritionInputError("Trạng thái chọn mã cần có dietCodeId.", p);
    parsed.clinicalContext = clinical;
  }
  if (comparison.mode === "profile" && !parsed.profile) throw new NutritionInputError("Tính nhu cầu theo hồ sơ cần tuổi, đơn vị tuổi, giới tính, mức vận động và tình trạng sinh lý đã được cung cấp. Hỏi phần thiếu; hoặc chọn none để chỉ tính thành phần, manual nếu có mục tiêu xác nhận kèm nguồn.", "profile", 422);
  if (d.aiComment !== undefined) parsed.aiComment = text(d.aiComment, 8000, "aiComment", true);
  if (d.fields !== undefined) {
    if (!Array.isArray(d.fields) || !d.fields.length || d.fields.length > NUTRITION_LIMITS.fields) throw new NutritionInputError("Cần chọn từ 1 đến 40 chất.", "fields");
    parsed.fields = [...new Set(d.fields.map(k => { const key = text(k, 100, "fields"); if (!NUTRIENT_KEYS.has(key)) throw new NutritionInputError("Chất không được hỗ trợ.", "fields"); return key; }))];
  } else parsed.fields = CORE_CALC_FIELDS.map(f => f.key);
  return parsed;
}
