import { createHash } from "node:crypto";
import { ALL_NUTRIENT_FIELDS, CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { EMPTY_CLASSIFY } from "@/lib/food-classify";
import { calculateQuantity } from "@/app/tinh-khau-phan/quantity";
import { analyzeMenuPeriod, strictNutrientTotal, PERIOD_NUTRIENTS, energyStatus } from "@/app/tinh-khau-phan/multi-day-analysis";
import type { RecommendationRow } from "@/app/tinh-khau-phan/matchRecommendation";
import type { MenuDay } from "@/app/tinh-khau-phan/multi-day";
import type { Row } from "@/app/tinh-khau-phan/types";
import { CONTRACT_VERSION, type CustomFoodInput, type MenuInput, type MenuRowInput, type NutritionFood, type NutrientTotal, type ResolvedMenu, type ResolvedRow } from "./contracts";
import { NutritionInputError } from "./validation";
import { assessClinicalContext, DIET_NUTRIENT_KEYS, type NutritionDietCode } from "./clinical";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b, "en")).map(([k,v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function nutritionDigest(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }

export function normalizeCustomFood(value: CustomFoodInput): NutritionFood {
  const factor = value.basis === "portion" ? 100 / value.portionAmount! : 1;
  const unit = value.basis === "100ml" ? "ml" : value.basis === "portion" ? value.portionUnit! : "g";
  return { id: `custom:${value.id}`, name: value.name, unit, source: value.source, wastePercent: value.wastePercent ?? null, foodGroup: value.foodGroup ?? null, nutrients: Object.fromEntries(Object.entries(value.nutrients).map(([k,v]) => [k, v === null ? null : v * factor])) };
}

function sourceQuality(food: NutritionFood): { food: NutritionFood; warnings: string[] } {
  const warnings: string[] = [], nutrients = { ...food.nutrients };
  for (const field of ALL_NUTRIENT_FIELDS) {
    const value = nutrients[field.key];
    if (value === undefined) continue;
    if (value !== null && (!Number.isFinite(value) || value < 0 || (food.unit === "g" && field.unit === "g" && value > 100) || (food.unit === "g" && field.key === "energyKcal" && value > 1000))) {
      nutrients[field.key] = null;
      warnings.push(`${food.name}: ${field.label} cần xác minh đơn vị/cơ sở tính; không dùng giá trị này để cộng.`);
    }
  }
  if (food.unit === "g" && ["proteinG","lipidG","glucidG"].every(k => typeof nutrients[k] === "number") && ["proteinG","lipidG","glucidG"].reduce((sum,k) => sum + (nutrients[k] ?? 0), 0) > 110) {
    for (const key of ["energyKcal","proteinG","lipidG","glucidG"]) nutrients[key] = null;
    warnings.push(`${food.name}: tổng đạm/béo/bột đường không phù hợp cơ sở 100 g; cần xác minh trước khi tính các chất chính.`);
  }
  return { food: { ...food, nutrients, qualityWarnings: [...(food.qualityWarnings ?? []), ...warnings] }, warnings: [...(food.qualityWarnings ?? []), ...warnings] };
}
export function sanitizeNutritionFood(food: NutritionFood): NutritionFood { return sourceQuality(food).food; }
function resolveRow(row: MenuRowInput, catalogue: Map<string, NutritionFood>): ResolvedRow {
  const original = row.customFood ? normalizeCustomFood(row.customFood) : catalogue.get(row.foodId!);
  if (!original) throw new NutritionInputError(`Không tìm thấy thực phẩm ${row.foodId}. Hãy tra lại tên/ID.`, `row.${row.id}.foodId`, 422);
  const quality = sourceQuality(original), food = quality.food, warnings = quality.warnings;
  if (row.recipeSource.kind === "ai") warnings.push("Công thức do AI đề xuất, định lượng là bản người dùng xác nhận; không phải công thức gốc đã kiểm chứng.");
  if (row.actualFoodName) warnings.push(`Ước tính ${row.actualFoodName} theo ${food.name}; giữ riêng tên thực tế và thực phẩm tham chiếu.`);
  if (food.source.kind === "unknown") warnings.push("Nguyên liệu chưa có nguồn số liệu; các chất liên quan được báo thiếu.");
  let amount = row.quantity === null ? null : row.quantity * row.servings;
  if (amount !== null && amount!==0 && row.unit !== food.unit) amount = !row.densityGPerMl || !row.densitySource ? null : row.unit === "ml" ? amount * row.densityGPerMl : amount / row.densityGPerMl;
  if (amount !== null && amount!==0 && row.basis === "cooked") amount = !row.conversionFactor || !row.conversionSource ? null : amount * row.conversionFactor;
  if (amount !== null && amount!==0 && row.basis === "raw") amount = food.wastePercent === null ? null : amount * (1 - food.wastePercent / 100);
  let edibleGrams: number | null = null, rawGrams: number | null = null;
  if (amount !== null) {
    edibleGrams = food.unit === "g" ? amount : row.densityGPerMl && row.densitySource ? amount * row.densityGPerMl : null;
    if (edibleGrams !== null && food.wastePercent !== null) {
      const q = calculateQuantity({ grams: edibleGrams, basis: "edible", wastePercent: food.wastePercent });
      rawGrams = q.rawGrams;
    }
  }
  if(amount===0){edibleGrams=0;rawGrams=0;}
  if (amount !== null && !Number.isFinite(amount)) throw new NutritionInputError("Khối lượng quy đổi vượt giới hạn.", `row.${row.id}`, 422);
  return { ...row, food, referenceAmount: amount, edibleGrams, rawGrams, warnings };
}
function engineRow(row: ResolvedRow): Row {
  // The existing nutrient reducer scales a per-100 source by this numeric amount.
  // ml sources stay ml in the external contract; mass-only summaries are suppressed below.
  return { uid: row.id, meal: row.meal, dish: row.dish, foodId: row.food.id, foodName: row.actualFoodName || row.food.name, grams: row.referenceAmount ?? 0, inputGrams: row.referenceAmount ?? 0, inputBasis: "edible", conversionFactor: 1, wastePercent: row.food.wastePercent, note: row.note ?? "", nutrients: row.referenceAmount === null ? Object.fromEntries(ALL_NUTRIENT_FIELDS.map(f => [f.key, null])) : row.food.nutrients, classify: { ...EMPTY_CLASSIFY, foodGroup: row.food.foodGroup } };
}
function totals(rows: ResolvedRow[], keys: string[]): Record<string, NutrientTotal> {
  return Object.fromEntries(keys.map(key => {
    const relevant = rows.filter(row => row.referenceAmount !== 0);
    const missingRows = relevant.filter(row => row.referenceAmount === null || row.food.nutrients[key] == null).map(row => row.id);
    const known = relevant.filter(row => row.referenceAmount !== null && row.food.nutrients[key] != null);
    const metric = strictNutrientTotal(relevant.map(engineRow), key);
    const value = rows.length === 0 ? null : relevant.length === 0 ? 0 : known.length === 0 ? null : metric.value;
    return [key, { value, incomplete: missingRows.length > 0, missingRows, estimated: relevant.some(row => Boolean(row.actualFoodName) || row.recipeSource.kind === "ai" || row.food.source.kind === "unknown") }];
  }));
}
export function resolveMenu(input: MenuInput, catalogue: NutritionFood[], recommendations: RecommendationRow[] = [], diet?: NutritionDietCode): ResolvedMenu {
  if (input.clinicalContext?.dietCodeId && input.clinicalContext.dietCodeId !== diet?.id) throw new NutritionInputError("Mã chế độ ăn chưa được đọc đúng từ kho.", "clinicalContext.dietCodeId", 422);
  const foodMap = new Map(catalogue.map(food => [food.id, food]));
  const days = input.days.map(day => ({ ...day, rows: day.rows.map(row => resolveRow(row, foodMap)) }));
  const rows = days.flatMap(day => day.rows), missingInputs: ResolvedMenu["missingInputs"] = [];
  const add = (rowId: string, field: string, message: string) => missingInputs.push({ rowId, field, message });
  if (diet && input.clinicalContext?.selection === "proposed") add("clinical", "clinicalContext.selection", "Cần xác nhận mã chế độ ăn trước khi chốt; đây mới là mã được đề xuất.");
  if (diet && input.clinicalContext?.targetGroup !== diet.targetGroup) add("clinical", "clinicalContext.targetGroup", "Đối tượng đã cung cấp không khớp mã chế độ ăn; cần chọn lại mã hoặc xác nhận đối tượng.");
  const customDefinitions = new Map<string,string>();
  for (const row of rows) {
    if (row.customFood) { const definition = canonicalJson(row.customFood), existing = customDefinitions.get(row.food.id); if (existing && existing !== definition) throw new NutritionInputError("Cùng ID nguyên liệu ngoài kho có số liệu/nguồn khác nhau.", row.id); customDefinitions.set(row.food.id, definition); }
    if (row.quantity === null) add(row.id, "quantity", "Cần xác nhận định lượng.");
    if (row.sourceState === "raw_clean" && row.food.foodType === "MA") add(row.id, "sourceState", "Món hoàn chỉnh chưa có cơ sở sống sạch; cần xác minh nguyên liệu và quy đổi.");
    if (row.quantity!==0 && row.unit !== row.food.unit && (!row.densityGPerMl || !row.densitySource)) add(row.id, "density", "Đổi ml/g cần khối lượng riêng và nguồn; không quy đổi 1:1.");
    if (row.quantity!==0 && row.basis === "cooked" && (!row.conversionFactor || !row.conversionSource)) add(row.id, "conversion", "Lượng chín cần hệ số quy về trạng thái nguồn và nguồn hệ số.");
    if (row.quantity!==0 && row.basis === "raw" && row.food.wastePercent === null) add(row.id, "wastePercent", "Chưa có tỷ lệ thải bỏ để tính phần ăn được từ lượng mua vào.");
    if (row.actualFoodName && row.estimateAccepted !== true) add(row.id, "estimateAccepted", "Cần người dùng chấp nhận phép tính theo thực phẩm tham chiếu.");
    if (row.food.source.kind !== "catalog" && row.food.source.kind !== "unknown" && !row.food.source.confirmed) add(row.id, "source.confirmed", "Cần xác nhận nguồn số liệu ngoài kho.");
  }
  const selected = new Set(input.fields ?? CORE_CALC_FIELDS.map(f => f.key));
  const fields = ALL_NUTRIENT_FIELDS.filter(field => selected.has(field.key));
  const allKeys = [...new Set([...CORE_CALC_FIELDS.map(f => f.key), ...fields.map(f => f.key), ...(diet ? DIET_NUTRIENT_KEYS : [])])];
  const dayTotals = days.map(day => ({ id: day.id, label: day.label, date: day.date, hasData: day.rows.length > 0, totals: totals(day.rows, allKeys) }));
  const overall = totals(rows, allKeys);
  const engineDays: MenuDay[] = days.map(day => ({ id: day.id, label: day.label, date: day.date, rows: day.rows.map(engineRow) }));
  const analysis = analyzeMenuPeriod(engineDays, input.comparison.mode === "profile" ? input.profile ?? null : null, input.comparison.mode === "profile" ? recommendations : []);
  let targets: ResolvedMenu["targets"] = [];
  if (input.comparison.mode === "manual") targets = input.comparison.targets!.map(t => ({ key: t.key, value: t.value, source: t.source, isUpperLimit: t.isUpperLimit ?? false }));
  if (input.comparison.mode === "profile") {
    targets = [{ key: "energyKcal", value: analysis.target.value, source: analysis.target.source, isUpperLimit: false }, ...analysis.nutrients.map(n => ({ key: n.key, value: n.targetPerDay, source: n.targetPerDay !== null ? `Khuyến nghị ${n.targetType ?? "theo hồ sơ"}` : null, isUpperLimit: n.isUpperLimit }))];
    if (!targets.some(t => t.value !== null)) add("profile", "recommendation", "Chưa xác định được mục tiêu từ hồ sơ/nguồn; bổ sung hồ sơ hoặc chọn chỉ tính thành phần.");
  }
  targets=targets.map(target=>({...target,value:target.value!==null && Number.isFinite(target.value) && target.value>=0?target.value:null}));
  const energyTarget = targets.find(t => t.key === "energyKcal");
  if (input.comparison.mode !== "profile") analysis.target = { value: energyTarget?.value ?? null, source: null };
  analysis.days.forEach((day, index) => {
    const t = dayTotals[index].totals.energyKcal;
    day.energy = { value: t.value, incomplete: t.incomplete };
    day.targetKcal = day.hasData ? energyTarget?.value ?? null : null;
    day.gapKcal = !t.incomplete && t.value !== null && day.targetKcal !== null ? t.value - day.targetKcal : null;
    day.status = t.incomplete ? "unknown" : energyStatus(t.value, day.targetKcal);
    for (const key of allKeys) { const m = dayTotals[index].totals[key]; day.nutrients[key] = { value: m.value, incomplete: m.incomplete }; }
    day.meals.forEach(meal => {
      const metrics = totals(days[index].rows.filter(r => r.meal === meal.meal), allKeys);
      for (const key of allKeys) meal.nutrients[key] = { value: metrics[key].value, incomplete: metrics[key].incomplete };
      meal.energy = meal.nutrients.energyKcal;
      if (meal.energy.incomplete) meal.status = "unknown";
    });
  });
  analysis.totalEnergy = { value: overall.energyKcal.value, incomplete: overall.energyKcal.incomplete };
  analysis.targetPeriodKcal = energyTarget?.value != null ? energyTarget.value * analysis.dataDayCount : null;
  analysis.periodGapKcal = !overall.energyKcal.incomplete && overall.energyKcal.value !== null && analysis.targetPeriodKcal !== null ? overall.energyKcal.value - analysis.targetPeriodKcal : null;
  analysis.periodEnergyStatus = overall.energyKcal.incomplete ? "unknown" : energyStatus(overall.energyKcal.value, analysis.targetPeriodKcal);
  analysis.averageEnergyKcal = overall.energyKcal.value !== null && analysis.dataDayCount ? overall.energyKcal.value / analysis.dataDayCount : null;
  analysis.averageGapKcal = analysis.periodGapKcal !== null && analysis.dataDayCount ? analysis.periodGapKcal / analysis.dataDayCount : null;
  analysis.completeEnergyDayCount = dayTotals.filter(day => day.hasData && !day.totals.energyKcal.incomplete).length;
  analysis.achievedDays = analysis.days.filter(day => day.status === "dat").length;
  analysis.lowDays = analysis.days.filter(day => day.status === "thieu").length;
  analysis.highDays = analysis.days.filter(day => day.status === "vuot").length;
  analysis.unknownDays = analysis.days.filter(day => day.status === "unknown").length;
  analysis.nutrients.forEach(metric => {
    const total = overall[metric.key], target = targets.find(t => t.key === metric.key);
    if (total) { metric.total = { value: total.value, incomplete: total.incomplete }; metric.averagePerDay = total.value !== null && analysis.dataDayCount ? total.value / analysis.dataDayCount : null; }
    metric.targetPerDay = target?.value ?? null; metric.targetPeriod = target?.value != null ? target.value * analysis.dataDayCount : null;
    metric.percentOfTarget = total && !total.incomplete && total.value !== null && metric.targetPeriod && metric.targetPeriod > 0 ? total.value / metric.targetPeriod * 100 : null;
    metric.isUpperLimit=target?.isUpperLimit??metric.isUpperLimit;
    const status=(value:number|null,goal:number|null,incomplete:boolean)=>incomplete || value===null || goal===null || goal<=0?"unknown":metric.isUpperLimit?(value>goal*1.1?"vuot":"dat"):(value<goal*0.9?"thieu":"dat");
    metric.status=status(total?.value??null,metric.targetPeriod,total?.incomplete??true);
    const comparable=dayTotals.filter(day=>day.hasData && !day.totals[metric.key].incomplete && day.totals[metric.key].value!==null && metric.targetPerDay!==null && metric.targetPerDay>0);
    metric.comparableDays=comparable.length;
    metric.achievedDays=comparable.filter(day=>status(day.totals[metric.key].value,metric.targetPerDay,false)==="dat").length;
  });
  const macroEnergy=["proteinG","lipidG","glucidG"].reduce((sum,key)=>sum+(overall[key].value??0)*(key==="lipidG"?9:4),0);
  analysis.macros.forEach(m => {
    const total = overall[m.key]; m.grams = { value: total.value, incomplete: total.incomplete };
    m.averageGramsPerDay = total.value !== null && analysis.dataDayCount ? total.value / analysis.dataDayCount : null;
    m.energyKcal = total.value !== null ? total.value * (m.key === "lipidG" ? 9 : 4) : null;
    const incomplete=["proteinG","lipidG","glucidG"].some(k=>overall[k].incomplete || overall[k].value===null);
    m.energySharePct=!incomplete && macroEnergy>0 && m.energyKcal!==null?m.energyKcal/macroEnergy*100:null;
    if(incomplete || input.comparison.mode==="none"){m.status="unknown";}
  });
  analysis.mealAggregates.forEach(meal => {
    const metrics = totals(rows.filter(r => r.meal === meal.meal), allKeys);
    meal.energy = { value: metrics.energyKcal.value, incomplete: metrics.energyKcal.incomplete };
    meal.protein = { value: metrics.proteinG.value, incomplete: metrics.proteinG.incomplete };
    meal.lipid = { value: metrics.lipidG.value, incomplete: metrics.lipidG.incomplete };
    meal.glucid = { value: metrics.glucidG.value, incomplete: metrics.glucidG.incomplete };
    meal.averageEnergyPerDataDay = meal.energy.value !== null && analysis.dataDayCount ? meal.energy.value / analysis.dataDayCount : null;
    meal.distributionPct = !meal.energy.incomplete && !overall.energyKcal.incomplete && meal.energy.value !== null && overall.energyKcal.value ? meal.energy.value / overall.energyKcal.value * 100 : null;
    if (meal.energy.incomplete) { meal.status = "unknown"; meal.gapKcal = null; }
  });
  analysis.dishes.forEach(dish => {
    const metrics = totals(rows.filter(r => r.dish === dish.dish), [...allKeys,"sodiumMg"]);
    for (const [key, field] of [["energyKcal","energy"],["proteinG","protein"],["lipidG","lipid"],["glucidG","glucid"],["sodiumMg","sodium"]] as const) dish[field] = { value: metrics[key].value, incomplete: metrics[key].incomplete };
  });
  analysis.recommendations = []; // Chat/Excel derive current commentary from the normalized metrics, never stale UI text.
  // Existing group reducer assumes every source amount is grams. Build its mass
  // separately so ml with documented density cannot be mistaken for g.
  analysis.foodGroups.forEach(group=>{group.edibleGrams=rows.filter(row=>row.food.foodGroup===group.group).reduce((sum,row)=>sum+(row.edibleGrams??0),0);});
  if (rows.some(row => row.edibleGrams === null)) { analysis.foodGroups = []; }
  const warnings = [...new Set(rows.flatMap(row => row.warnings))];
  if (rows.some(row => row.rawGrams === null)) warnings.push("Lượng mua/đi chợ chưa đủ dữ liệu thải bỏ hoặc đổi đơn vị ở một số nguyên liệu.");
  if (Object.values(overall).some(m => m.incomplete)) warnings.push("Một số tổng chỉ gồm phần có số liệu; không dùng để kết luận chắc chắn về mức đáp ứng nhu cầu.");
  const sourceSnapshot = rows.map(row => ({ id: row.id, food: row.food }));
  const clinicalAssessment = assessClinicalContext(input, days, overall, diet);
  const dataVersion = `sha256:${nutritionDigest({ sourceSnapshot, targets, ...(diet ? { dietCode: diet } : {}) })}`;
  const digest = nutritionDigest({ contractVersion: CONTRACT_VERSION, input, dataVersion });
  return { contractVersion: CONTRACT_VERSION, digest, input, title: input.title, mode: input.mode, days, fields, generatedAt: new Date().toISOString(), dataVersion, aiComment: input.aiComment ?? "", totals: overall, dayTotals, targets, analysis, warnings, missingInputs, ...(clinicalAssessment ? { clinicalAssessment } : {}) };
}

export function assertMenuComplete(menu: ResolvedMenu) {
  if (menu.missingInputs.length) throw new NutritionInputError(`Còn ${menu.missingInputs.length} thông tin cần xác nhận trước khi chốt.`, menu.missingInputs[0].field, 422);
}
export const COMPARABLE_NUTRIENTS = PERIOD_NUTRIENTS;
