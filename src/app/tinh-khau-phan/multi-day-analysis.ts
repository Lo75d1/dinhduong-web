import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import type { Profile } from "./PersonalProfile";
import {
  findRecommendation,
  resolveRecommendationTarget,
  type RecommendationRow,
} from "./matchRecommendation";
import { dayMealsOrdered, type MenuDay } from "./multi-day";
import type { Row } from "./types";

export type EnergyStatus = "dat" | "thieu" | "vuot" | "unknown";
export type RecommendationTone = "good" | "adjust" | "attention" | "data";

export type StrictMetric = {
  value: number | null;
  incomplete: boolean;
};

export type EnergyTarget = {
  value: number | null;
  source: "RNI" | "Mifflin–St Jeor" | null;
};

export type NutrientDefinition = {
  key: string;
  label: string;
  unit: string;
  recommendationKey: string | null;
  isUpperLimit?: boolean;
};

export type MacroPeriodSummary = {
  key: "proteinG" | "lipidG" | "glucidG";
  label: string;
  grams: StrictMetric;
  averageGramsPerDay: number | null;
  energyKcal: number | null;
  energySharePct: number | null;
  recommendedMinPct: number | null;
  recommendedMaxPct: number | null;
  status: EnergyStatus;
  gramsPerKgPerDay: number | null;
};

export type NutrientPeriodSummary = {
  key: string;
  label: string;
  unit: string;
  total: StrictMetric;
  averagePerDay: number | null;
  targetPerDay: number | null;
  targetPeriod: number | null;
  percentOfTarget: number | null;
  comparableDays: number;
  achievedDays: number;
  status: EnergyStatus;
  isUpperLimit: boolean;
  targetType: string | null;
};

export type MealPeriodAnalysis = {
  meal: string;
  energy: StrictMetric;
  targetKcal: number | null;
  targetSharePct: number | null;
  status: EnergyStatus;
  nutrients: Record<string, StrictMetric>;
};

export type DayPeriodAnalysis = {
  dayId: string;
  label: string;
  date: string;
  hasData: boolean;
  energy: StrictMetric;
  targetKcal: number | null;
  gapKcal: number | null;
  status: EnergyStatus;
  meals: MealPeriodAnalysis[];
  nutrients: Record<string, StrictMetric>;
  macroEnergyShare: Record<"proteinG" | "lipidG" | "glucidG", number | null>;
  foodGroupCount: number | null;
  foodGroupIncomplete: boolean;
  dishCount: number;
  foodCount: number;
};

export type MealAggregate = {
  meal: string;
  daysPresent: number;
  energy: StrictMetric;
  averageEnergyPerDataDay: number | null;
  distributionPct: number | null;
  targetSharePct: number | null;
  targetPeriodKcal: number | null;
  gapKcal: number | null;
  status: EnergyStatus;
  protein: StrictMetric;
  lipid: StrictMetric;
  glucid: StrictMetric;
};

export type DishPeriodSummary = {
  dish: string;
  days: string[];
  meals: string[];
  appearances: number;
  foodCount: number;
  energy: StrictMetric;
  protein: StrictMetric;
  lipid: StrictMetric;
  glucid: StrictMetric;
  sodium: StrictMetric;
};

export type FoodGroupPeriodSummary = {
  group: string;
  days: string[];
  edibleGrams: number;
  energy: StrictMetric;
  energySharePct: number | null;
};

export type PeriodRecommendation = {
  id: string;
  tone: RecommendationTone;
  title: string;
  text: string;
};

export type PeriodAnalysis = {
  target: EnergyTarget;
  days: DayPeriodAnalysis[];
  calendarDayCount: number;
  dataDayCount: number;
  emptyDayCount: number;
  completeEnergyDayCount: number;
  totalEnergy: StrictMetric;
  targetPeriodKcal: number | null;
  periodGapKcal: number | null;
  periodEnergyStatus: EnergyStatus;
  averageEnergyKcal: number | null;
  averageGapKcal: number | null;
  averageFoodGroups: number | null;
  achievedDays: number;
  lowDays: number;
  highDays: number;
  unknownDays: number;
  macros: MacroPeriodSummary[];
  nutrients: NutrientPeriodSummary[];
  mealAggregates: MealAggregate[];
  dishes: DishPeriodSummary[];
  foodGroups: FoodGroupPeriodSummary[];
  uniqueDishCount: number;
  uniqueFoodCount: number;
  missingFoodGroupRows: number;
  recommendations: PeriodRecommendation[];
};

export type ShoppingItem = {
  key: string;
  foodId: string;
  foodName: string;
  edibleGrams: number;
  rawGrams: number | null;
  wastePercent: number | null;
  days: string[];
};

export const PERIOD_NUTRIENTS: NutrientDefinition[] = [
  { key: "fiberG", label: "Chất xơ", unit: "g", recommendationKey: "fiber" },
  { key: "waterG", label: "Nước", unit: "g", recommendationKey: "water" },
  { key: "calciumMg", label: "Canxi", unit: "mg", recommendationKey: "calcium" },
  { key: "ironMg", label: "Sắt", unit: "mg", recommendationKey: "iron" },
  { key: "zincMg", label: "Kẽm", unit: "mg", recommendationKey: "zinc" },
  { key: "sodiumMg", label: "Natri", unit: "mg", recommendationKey: "sodium", isUpperLimit: true },
  { key: "potassiumMg", label: "Kali", unit: "mg", recommendationKey: "potassium" },
  { key: "magnesiumMg", label: "Magie", unit: "mg", recommendationKey: "magnesium" },
  { key: "phosphorusMg", label: "Phospho", unit: "mg", recommendationKey: "phosphorus" },
  { key: "vitARaeMcg", label: "Vitamin A", unit: "µg", recommendationKey: "vitA" },
  { key: "vitCMg", label: "Vitamin C", unit: "mg", recommendationKey: "vitC" },
  { key: "vitB1Mg", label: "Vitamin B1", unit: "mg", recommendationKey: "vitB1" },
  { key: "vitB2Mg", label: "Vitamin B2", unit: "mg", recommendationKey: "vitB2" },
  { key: "vitB3Mg", label: "Vitamin B3", unit: "mg", recommendationKey: "vitB3" },
];

const ACTIVITY_FACTOR: Record<Profile["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  very_heavy: 1.9,
};

const PHYSIOLOGY_BONUS: Record<Profile["physiology"], number> = {
  normal: 0,
  pregnant_1: 50,
  pregnant_2: 250,
  pregnant_3: 450,
  lactating_1: 500,
  lactating_2: 500,
};

const MACROS = [
  { key: "proteinG" as const, label: "Đạm", factor: 4, minKey: "proteinMinPct", maxKey: "proteinMaxPct" },
  { key: "lipidG" as const, label: "Béo", factor: 9, minKey: "lipidMinPct", maxKey: "lipidMaxPct" },
  { key: "glucidG" as const, label: "Bột đường", factor: 4, minKey: "glucidMinPct", maxKey: "glucidMaxPct" },
];

function numberFromProfile(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function profileRecommendation(profile: Profile | null, rows: RecommendationRow[]) {
  if (!profile) return { recommendation: null, baseRecommendation: null };
  const ageValue = numberFromProfile(profile.age);
  const ageYr = profile.ageUnit === "thang" ? ageValue / 12 : ageValue;
  const ageMonth = profile.ageUnit === "thang" ? ageValue : ageValue * 12;
  if (ageValue <= 0) return { recommendation: null, baseRecommendation: null };
  const input = {
    gender: profile.gender,
    physiology: profile.physiology,
    ageYr,
    ageMonth,
    activityLevel: profile.activityLevel,
  } as const;
  const recommendation = findRecommendation(rows, input);
  const physiological = profile.gender === "Nữ" && profile.physiology !== "normal";
  const baseRecommendation = physiological
    ? findRecommendation(rows, { ...input, physiology: "normal" })
    : null;
  return { recommendation, baseRecommendation };
}

function normalizedPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value <= 1 ? value * 100 : value;
}

export function strictNutrientTotal(rows: Row[], key: string): StrictMetric {
  const foods = rows.filter((row) => row.foodId);
  if (!foods.length) return { value: null, incomplete: false };
  let total = 0;
  let incomplete = false;
  for (const row of foods) {
    const raw = row.nutrients?.[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      incomplete = true;
      continue;
    }
    total += (raw * (row.grams || 0)) / 100;
  }
  // Vẫn TÍNH phần có dữ liệu; giữ cờ incomplete để UI đánh dấu (≥) thay vì "—".
  return { value: total, incomplete };
}

export function energyTargetForProfile(
  profile: Profile | null,
  recommendations: RecommendationRow[],
): EnergyTarget {
  if (!profile) return { value: null, source: null };
  const { recommendation, baseRecommendation } = profileRecommendation(profile, recommendations);
  const physiological = profile.gender === "Nữ" && profile.physiology !== "normal";
  if (physiological) {
    if (recommendation?.energyKcal != null && baseRecommendation?.energyKcal != null) {
      return { value: recommendation.energyKcal + baseRecommendation.energyKcal, source: "RNI" };
    }
  } else if (recommendation?.energyKcal != null) {
    return { value: recommendation.energyKcal, source: "RNI" };
  }

  const ageValue = numberFromProfile(profile.age);
  const ageYr = profile.ageUnit === "thang" ? ageValue / 12 : ageValue;
  const ageMonth = profile.ageUnit === "thang" ? ageValue : ageValue * 12;
  const weight = numberFromProfile(profile.weight);
  const height = numberFromProfile(profile.height);
  if (ageMonth <= 216 || weight <= 0 || height <= 0) return { value: null, source: null };
  const bmr = profile.gender === "Nữ"
    ? 10 * weight + 6.25 * height - 5 * ageYr - 161
    : 10 * weight + 6.25 * height - 5 * ageYr + 5;
  return {
    value: Math.round(bmr * ACTIVITY_FACTOR[profile.activityLevel] + PHYSIOLOGY_BONUS[profile.physiology]),
    source: "Mifflin–St Jeor",
  };
}

export function energyStatus(actual: number | null, target: number | null): EnergyStatus {
  if (actual == null || target == null || target <= 0) return "unknown";
  const ratio = actual / target;
  if (ratio < 0.9) return "thieu";
  if (ratio > 1.1) return "vuot";
  return "dat";
}

function adequacyStatus(actual: number | null, target: number | null, isUpperLimit: boolean): EnergyStatus {
  if (actual == null || target == null || target <= 0) return "unknown";
  if (isUpperLimit) return actual > target * 1.1 ? "vuot" : "dat";
  return actual < target * 0.9 ? "thieu" : "dat";
}

function diversityForRows(rows: Row[]) {
  const foods = rows.filter((row) => row.foodId);
  if (!foods.length) return { count: 0, incomplete: false };
  const groups = new Set<string>();
  let incomplete = false;
  for (const row of foods) {
    const group = row.classify?.foodGroup?.trim();
    if (group) groups.add(group);
    else incomplete = true;
  }
  return { count: groups.size, incomplete };
}

function nutrientMap(rows: Row[]) {
  const result: Record<string, StrictMetric> = {};
  for (const field of CORE_CALC_FIELDS) result[field.key] = strictNutrientTotal(rows, field.key);
  return result;
}

function macroShares(metrics: Record<string, StrictMetric>) {
  const energies = MACROS.map((macro) => metrics[macro.key]?.value == null ? null : metrics[macro.key].value! * macro.factor);
  const complete = energies.every((value): value is number => value != null);
  const total = complete ? energies.reduce((sum, value) => sum + value, 0) : null;
  return Object.fromEntries(MACROS.map((macro, index) => [
    macro.key,
    total && energies[index] != null ? energies[index]! / total * 100 : null,
  ])) as Record<"proteinG" | "lipidG" | "glucidG", number | null>;
}

function buildDishSummaries(days: MenuDay[]) {
  const map = new Map<string, { rows: Row[]; days: Set<string>; meals: Set<string>; appearances: Set<string>; foods: Set<string> }>();
  for (const day of days) {
    for (const row of day.rows.filter((item) => item.foodId)) {
      const key = row.dish.trim() || "(Chưa đặt tên món)";
      const current = map.get(key) ?? { rows: [], days: new Set(), meals: new Set(), appearances: new Set(), foods: new Set() };
      current.rows.push(row);
      current.days.add(day.label);
      current.meals.add(row.meal);
      current.appearances.add(`${day.id}|${row.meal}`);
      current.foods.add(row.foodId);
      map.set(key, current);
    }
  }
  return [...map.entries()].map<DishPeriodSummary>(([dish, item]) => ({
    dish,
    days: [...item.days],
    meals: [...item.meals],
    appearances: item.appearances.size,
    foodCount: item.foods.size,
    energy: strictNutrientTotal(item.rows, "energyKcal"),
    protein: strictNutrientTotal(item.rows, "proteinG"),
    lipid: strictNutrientTotal(item.rows, "lipidG"),
    glucid: strictNutrientTotal(item.rows, "glucidG"),
    sodium: strictNutrientTotal(item.rows, "sodiumMg"),
  })).sort((a, b) => (b.energy.value ?? -1) - (a.energy.value ?? -1));
}

function buildFoodGroupSummaries(days: MenuDay[], totalEnergy: number | null) {
  const map = new Map<string, { rows: Row[]; days: Set<string>; grams: number }>();
  for (const day of days) {
    for (const row of day.rows.filter((item) => item.foodId && item.classify?.foodGroup?.trim())) {
      const group = row.classify.foodGroup!.trim();
      const current = map.get(group) ?? { rows: [], days: new Set(), grams: 0 };
      current.rows.push(row);
      current.days.add(day.label);
      current.grams += row.grams || 0;
      map.set(group, current);
    }
  }
  return [...map.entries()].map<FoodGroupPeriodSummary>(([group, item]) => {
    const energy = strictNutrientTotal(item.rows, "energyKcal");
    return {
      group,
      days: [...item.days],
      edibleGrams: item.grams,
      energy,
      energySharePct: energy.value != null && totalEnergy != null && totalEnergy > 0 ? energy.value / totalEnergy * 100 : null,
    };
  }).sort((a, b) => b.edibleGrams - a.edibleGrams);
}

function recommendationText(input: Omit<PeriodRecommendation, "id">, index: number): PeriodRecommendation {
  return { ...input, id: `${input.tone}-${index}` };
}

function buildRecommendations(analysis: Omit<PeriodAnalysis, "recommendations">) {
  const items: Omit<PeriodRecommendation, "id">[] = [];
  const round = (value: number) => Math.round(value * 10) / 10;
  if (!analysis.dataDayCount) {
    items.push({ tone: "data", title: "Chưa có ngày đủ dữ liệu", text: "Hãy thêm món và thực phẩm vào ít nhất một ngày để bắt đầu phân tích toàn kỳ." });
  } else if (analysis.periodGapKcal != null && analysis.averageGapKcal != null) {
    const gap = Math.abs(round(analysis.periodGapKcal));
    const daily = Math.abs(round(analysis.averageGapKcal));
    if (analysis.periodEnergyStatus === "thieu") {
      items.push({ tone: "attention", title: "Năng lượng toàn kỳ đang thiếu", text: `Tổng thiếu ${gap} kcal trên ${analysis.dataDayCount} ngày có dữ liệu, trung bình thiếu ${daily} kcal/ngày. Ưu tiên điều chỉnh ở ${analysis.lowDays} ngày dưới 90% mục tiêu.` });
    } else if (analysis.periodEnergyStatus === "vuot") {
      items.push({ tone: "attention", title: "Năng lượng toàn kỳ đang vượt", text: `Tổng vượt ${gap} kcal trên ${analysis.dataDayCount} ngày có dữ liệu, trung bình vượt ${daily} kcal/ngày. Kiểm tra ${analysis.highDays} ngày trên 110% mục tiêu.` });
    } else {
      items.push({ tone: "good", title: "Năng lượng toàn kỳ trong khoảng mục tiêu", text: `Trung bình toàn kỳ nằm trong khoảng 90–110% nhu cầu; vẫn nên xem riêng ${analysis.lowDays} ngày thiếu và ${analysis.highDays} ngày vượt để giảm dao động.` });
    }
  } else {
    items.push({ tone: "data", title: "Chưa đối chiếu được năng lượng", text: "Cần hồ sơ/RNI và dữ liệu năng lượng đầy đủ để tính tổng thiếu hoặc vượt của cả kỳ." });
  }

  for (const macro of analysis.macros) {
    if (macro.status === "thieu" || macro.status === "vuot") {
      items.push({ tone: "adjust", title: `${macro.label} phân bổ ${macro.status === "thieu" ? "thấp" : "cao"}`, text: `${macro.energySharePct == null ? "Chưa đủ dữ liệu" : `${round(macro.energySharePct)}% năng lượng`} so với khoảng khuyến nghị ${macro.recommendedMinPct == null ? "—" : round(macro.recommendedMinPct)}–${macro.recommendedMaxPct == null ? "—" : round(macro.recommendedMaxPct)}%. Xem bảng theo bữa và món đóng góp để điều chỉnh đúng vị trí.` });
    }
  }

  const priorityNutrients = new Set(["fiberG", "calciumMg", "ironMg", "sodiumMg", "potassiumMg", "vitCMg"]);
  for (const nutrient of analysis.nutrients.filter((item) => priorityNutrients.has(item.key))) {
    if (nutrient.status === "thieu" || nutrient.status === "vuot") {
      items.push({ tone: nutrient.key === "sodiumMg" ? "attention" : "adjust", title: `${nutrient.label} ${nutrient.status === "thieu" ? "chưa đạt" : "vượt mốc"}`, text: `Trung bình ${nutrient.averagePerDay == null ? "—" : round(nutrient.averagePerDay)} ${nutrient.unit}/ngày, đáp ứng ${nutrient.percentOfTarget == null ? "—" : `${round(nutrient.percentOfTarget)}%`} mục tiêu của các ngày có dữ liệu.` });
    }
  }

  const mealDeviation = analysis.mealAggregates
    .filter((meal) => meal.distributionPct != null && meal.targetSharePct != null)
    .sort((a, b) => Math.abs((b.distributionPct ?? 0) - (b.targetSharePct ?? 0)) - Math.abs((a.distributionPct ?? 0) - (a.targetSharePct ?? 0)))[0];
  if (mealDeviation && Math.abs(mealDeviation.distributionPct! - mealDeviation.targetSharePct!) >= 5) {
    items.push({ tone: "adjust", title: `Phân bổ bữa ${mealDeviation.meal} lệch mục tiêu`, text: `Bữa này chiếm ${round(mealDeviation.distributionPct!)}% năng lượng toàn kỳ, trong khi mục tiêu đã đặt là ${round(mealDeviation.targetSharePct!)}%.` });
  }

  if (analysis.missingFoodGroupRows > 0 || analysis.completeEnergyDayCount < analysis.dataDayCount) {
    items.push({ tone: "data", title: "Cần hoàn thiện dữ liệu nguồn", text: `${analysis.missingFoodGroupRows} dòng thực phẩm chưa có nhóm phân loại; ${analysis.dataDayCount - analysis.completeEnergyDayCount} ngày chưa đủ dữ liệu năng lượng. Các tổng bị thiếu được giữ “—”, không quy thành 0.` });
  }
  if (analysis.emptyDayCount > 0) {
    items.push({ tone: "data", title: `${analysis.emptyDayCount} ngày đang để trống`, text: `Báo cáo chỉ tính trung bình và nhu cầu toàn kỳ trên ${analysis.dataDayCount} ngày thực sự có thực phẩm.` });
  }
  return items.slice(0, 10).map(recommendationText);
}

export function analyzeMenuPeriod(
  days: MenuDay[],
  profile: Profile | null,
  recommendations: RecommendationRow[],
  mealTargetShares: Record<string, number> = {},
): PeriodAnalysis {
  const target = energyTargetForProfile(profile, recommendations);
  const { recommendation, baseRecommendation } = profileRecommendation(profile, recommendations);
  const validTargetShares = Object.values(mealTargetShares).length > 0 &&
    Math.abs(Object.values(mealTargetShares).reduce((sum, value) => sum + value, 0) - 100) <= 0.5;

  const analyses = days.map<DayPeriodAnalysis>((day) => {
    const foodRows = day.rows.filter((row) => row.foodId);
    const hasData = foodRows.length > 0;
    const nutrients = nutrientMap(day.rows);
    const energy = nutrients.energyKcal;
    const diversity = diversityForRows(day.rows);
    const meals = dayMealsOrdered(day).map<MealPeriodAnalysis>((meal) => {
      const rows = meal.dishes.flatMap((dish) => dish.rows);
      const mealNutrients = nutrientMap(rows);
      const mealEnergy = mealNutrients.energyKcal;
      const share = validTargetShares && typeof mealTargetShares[meal.meal] === "number"
        ? mealTargetShares[meal.meal]
        : null;
      const mealTarget = share != null && target.value != null ? target.value * share / 100 : null;
      return { meal: meal.meal, energy: mealEnergy, targetKcal: mealTarget, targetSharePct: share, status: energyStatus(mealEnergy.value, mealTarget), nutrients: mealNutrients };
    });
    return {
      dayId: day.id,
      label: day.label,
      date: day.date,
      hasData,
      energy,
      targetKcal: hasData ? target.value : null,
      gapKcal: hasData && energy.value != null && target.value != null ? energy.value - target.value : null,
      status: hasData ? energyStatus(energy.value, target.value) : "unknown",
      meals,
      nutrients,
      macroEnergyShare: macroShares(nutrients),
      foodGroupCount: hasData && !diversity.incomplete ? diversity.count : null,
      foodGroupIncomplete: diversity.incomplete,
      dishCount: new Set(foodRows.map((row) => `${row.meal}|${row.dish}`)).size,
      foodCount: foodRows.length,
    };
  });

  const dataDays = analyses.filter((day) => day.hasData);
  const dataMenuDays = days.filter((day) => day.rows.some((row) => row.foodId));
  const allRows = dataMenuDays.flatMap((day) => day.rows.filter((row) => row.foodId));
  const totalEnergy = strictNutrientTotal(allRows, "energyKcal");
  const targetPeriodKcal = target.value != null && dataDays.length ? target.value * dataDays.length : null;
  const periodGapKcal = totalEnergy.value != null && targetPeriodKcal != null ? totalEnergy.value - targetPeriodKcal : null;
  const periodEnergyStatus = energyStatus(totalEnergy.value, targetPeriodKcal);
  const averageEnergyKcal = totalEnergy.value != null && dataDays.length ? totalEnergy.value / dataDays.length : null;
  const averageGapKcal = periodGapKcal != null && dataDays.length ? periodGapKcal / dataDays.length : null;
  const completeGroups = dataDays.map((day) => day.foodGroupCount).filter((value): value is number => value != null);
  const averageFoodGroups = completeGroups.length === dataDays.length && dataDays.length
    ? completeGroups.reduce((sum, value) => sum + value, 0) / dataDays.length
    : null;

  const totalNutrients = nutrientMap(allRows);
  const macroEnergy = MACROS.map((macro) => totalNutrients[macro.key]?.value == null ? null : totalNutrients[macro.key].value! * macro.factor);
  const macroEnergyTotal = macroEnergy.every((value): value is number => value != null)
    ? macroEnergy.reduce((sum, value) => sum + value, 0)
    : null;
  const weight = profile ? numberFromProfile(profile.weight) : 0;
  const physiological = profile?.gender === "Nữ" && profile.physiology !== "normal";
  const rangeRecommendation = physiological && baseRecommendation ? baseRecommendation : recommendation;
  const macros = MACROS.map<MacroPeriodSummary>((macro, index) => {
    const grams = totalNutrients[macro.key];
    const averageGramsPerDay = grams.value != null && dataDays.length ? grams.value / dataDays.length : null;
    const energySharePct = macroEnergyTotal && macroEnergy[index] != null ? macroEnergy[index]! / macroEnergyTotal * 100 : null;
    const recommendedMinPct = normalizedPercent(rangeRecommendation?.[macro.minKey]);
    const recommendedMaxPct = normalizedPercent(rangeRecommendation?.[macro.maxKey]);
    const status = energySharePct == null || recommendedMinPct == null || recommendedMaxPct == null
      ? "unknown"
      : energySharePct < recommendedMinPct ? "thieu" : energySharePct > recommendedMaxPct ? "vuot" : "dat";
    return {
      key: macro.key,
      label: macro.label,
      grams,
      averageGramsPerDay,
      energyKcal: macroEnergy[index],
      energySharePct,
      recommendedMinPct,
      recommendedMaxPct,
      status,
      gramsPerKgPerDay: macro.key === "proteinG" && averageGramsPerDay != null && weight > 0 ? averageGramsPerDay / weight : null,
    };
  });

  const nutrients = PERIOD_NUTRIENTS.map<NutrientPeriodSummary>((definition) => {
    const total = totalNutrients[definition.key] ?? strictNutrientTotal(allRows, definition.key);
    const targetInfo = definition.recommendationKey
      ? resolveRecommendationTarget(recommendation, baseRecommendation, definition.recommendationKey)
      : null;
    const targetPerDay = targetInfo?.value ?? null;
    const targetPeriod = targetPerDay != null && dataDays.length ? targetPerDay * dataDays.length : null;
    const averagePerDay = total.value != null && dataDays.length ? total.value / dataDays.length : null;
    const percentOfTarget = total.value != null && targetPeriod != null && targetPeriod > 0 ? total.value / targetPeriod * 100 : null;
    const comparable = dataDays.filter((day) => day.nutrients[definition.key]?.value != null && targetPerDay != null);
    const achieved = comparable.filter((day) => {
      const value = day.nutrients[definition.key].value!;
      return definition.isUpperLimit ? value <= targetPerDay! : value >= targetPerDay! * 0.9;
    });
    return {
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      total,
      averagePerDay,
      targetPerDay,
      targetPeriod,
      percentOfTarget,
      comparableDays: comparable.length,
      achievedDays: achieved.length,
      status: adequacyStatus(averagePerDay, targetPerDay, Boolean(definition.isUpperLimit)),
      isUpperLimit: Boolean(definition.isUpperLimit),
      targetType: targetInfo?.type ?? null,
    };
  });

  const mealOrder: string[] = [];
  for (const day of days) for (const meal of dayMealsOrdered(day)) if (!mealOrder.includes(meal.meal)) mealOrder.push(meal.meal);
  const mealAggregates = mealOrder.map<MealAggregate>((meal) => {
    const mealRowsByDay = dataMenuDays.map((day) => day.rows.filter((row) => row.foodId && row.meal === meal));
    const rows = mealRowsByDay.flat();
    const energy = strictNutrientTotal(rows, "energyKcal");
    const share = validTargetShares && typeof mealTargetShares[meal] === "number" ? mealTargetShares[meal] : null;
    const targetPeriod = share != null && target.value != null && dataDays.length ? target.value * dataDays.length * share / 100 : null;
    return {
      meal,
      daysPresent: mealRowsByDay.filter((items) => items.length > 0).length,
      energy,
      averageEnergyPerDataDay: energy.value != null && dataDays.length ? energy.value / dataDays.length : null,
      distributionPct: energy.value != null && totalEnergy.value != null && totalEnergy.value > 0 ? energy.value / totalEnergy.value * 100 : null,
      targetSharePct: share,
      targetPeriodKcal: targetPeriod,
      gapKcal: energy.value != null && targetPeriod != null ? energy.value - targetPeriod : null,
      status: energyStatus(energy.value, targetPeriod),
      protein: strictNutrientTotal(rows, "proteinG"),
      lipid: strictNutrientTotal(rows, "lipidG"),
      glucid: strictNutrientTotal(rows, "glucidG"),
    };
  });

  const dishes = buildDishSummaries(dataMenuDays);
  const foodGroups = buildFoodGroupSummaries(dataMenuDays, totalEnergy.value);
  const uniqueFoodCount = new Set(allRows.map((row) => row.foodId)).size;
  const missingFoodGroupRows = allRows.filter((row) => !row.classify?.foodGroup?.trim()).length;
  const base: Omit<PeriodAnalysis, "recommendations"> = {
    target,
    days: analyses,
    calendarDayCount: days.length,
    dataDayCount: dataDays.length,
    emptyDayCount: days.length - dataDays.length,
    completeEnergyDayCount: dataDays.filter((day) => day.energy.value != null).length,
    totalEnergy,
    targetPeriodKcal,
    periodGapKcal,
    periodEnergyStatus,
    averageEnergyKcal,
    averageGapKcal,
    averageFoodGroups,
    achievedDays: dataDays.filter((day) => day.status === "dat").length,
    lowDays: dataDays.filter((day) => day.status === "thieu").length,
    highDays: dataDays.filter((day) => day.status === "vuot").length,
    unknownDays: analyses.filter((day) => day.status === "unknown").length,
    macros,
    nutrients,
    mealAggregates,
    dishes,
    foodGroups,
    uniqueDishCount: dishes.length,
    uniqueFoodCount,
    missingFoodGroupRows,
  };
  return { ...base, recommendations: buildRecommendations(base) };
}

export function buildPeriodShoppingList(days: MenuDay[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem & { daySet: Set<string>; rawIncomplete: boolean }>();
  for (const day of days) {
    for (const row of day.rows) {
      if (!row.foodId) continue;
      const waste = typeof row.wastePercent === "number" && row.wastePercent >= 0 && row.wastePercent < 100
        ? row.wastePercent
        : null;
      const key = `${row.foodId}|${waste ?? "unknown"}`;
      const current = map.get(key) ?? {
        key,
        foodId: row.foodId,
        foodName: row.foodName || "(Chưa đặt tên)",
        edibleGrams: 0,
        rawGrams: 0,
        wastePercent: waste,
        days: [],
        daySet: new Set<string>(),
        rawIncomplete: false,
      };
      current.edibleGrams += row.grams || 0;
      if (waste == null) current.rawIncomplete = true;
      else current.rawGrams = (current.rawGrams ?? 0) + (row.grams || 0) / (1 - waste / 100);
      current.daySet.add(day.label);
      map.set(key, current);
    }
  }
  return [...map.values()]
    .map((item) => ({
      key: item.key,
      foodId: item.foodId,
      foodName: item.foodName,
      edibleGrams: item.edibleGrams,
      rawGrams: item.rawIncomplete ? null : item.rawGrams,
      wastePercent: item.wastePercent,
      days: [...item.daySet],
    }))
    .sort((a, b) => a.foodName.localeCompare(b.foodName, "vi"));
}
