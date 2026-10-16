import type { MenuInput, NutrientTotal, ResolvedDay } from "./contracts";

export type ClinicalContext = {
  conditions?: string[];
  notes?: string;
  targetGroup?: "NguoiLon" | "TreEm";
  dietCodeId?: string;
  selection?: "proposed" | "user_confirmed" | "prescribed";
};
export const DIET_METRICS = [
  { key: "energyKcal", label: "Năng lượng", unit: "kcal", prefix: "energy", suffix: "Kcal" },
  { key: "proteinG", label: "Đạm", unit: "g", prefix: "protein", suffix: "G" },
  { key: "lipidG", label: "Béo", unit: "g", prefix: "lipid", suffix: "G" },
  { key: "glucidG", label: "Bột đường", unit: "g", prefix: "glucid", suffix: "G" },
  { key: "sodiumMg", label: "Natri", unit: "mg", prefix: "sodium", suffix: "Mg" },
  { key: "potassiumMg", label: "Kali", unit: "mg", prefix: "potassium", suffix: "Mg" },
] as const;
export const DIET_NUTRIENT_KEYS = DIET_METRICS.map(metric => metric.key);
export const DIET_REFERENCE_NOTICE = "Đối chiếu khoảng tham khảo trong kho, không phải xác nhận phù hợp điều trị. Ghi chú theo kg cân nặng và chỉ định cá nhân cần được làm rõ riêng.";
export const DIET_STATUS_LABELS = { within: "Trong khoảng tham khảo", below: "Thấp hơn khoảng", above: "Cao hơn khoảng", unknown: "Chưa đủ cơ sở" } as const;
export const CLINICAL_TARGET_LABELS: Record<string, string> = { NguoiLon: "Người lớn", TreEm: "Trẻ em" };
export type DietRange = { key: string; label: string; unit: string; min: number | null; max: number | null };
export type NutritionDietCode = {
  id: string; code: string; name: string; targetGroup: string; diseaseGroup: string;
  ranges: DietRange[]; note: string | null;
  source: { label: string; url: string };
  qualityWarnings: string[];
  rawWater: { min: number | null; max: number | null; columnUnit: "ml"; unitVerified: false };
};
export type ClinicalMetric = DietRange & {
  average: number | null; status: keyof typeof DIET_STATUS_LABELS;
  assessedDays: number; withinDays: number; dataDays: number; incomplete: boolean; estimated: boolean;
};
export type ClinicalAssessment = {
  context: ClinicalContext; diet: NutritionDietCode | null; metrics: ClinicalMetric[];
  referenceOnly: true; notice: string;
};

/** Preserve the existing MCDA catalogue without inventing units or patient targets. */
export function nutritionDietCode(raw: Record<string, unknown>): NutritionDietCode {
  const qualityWarnings: string[] = [];
  const number = (key: string) => typeof raw[key] === "number" && Number.isFinite(raw[key]) && raw[key] >= 0 ? raw[key] as number : null;
  const ranges: DietRange[] = [...DIET_METRICS, { key: "meals", label: "Số bữa", unit: "bữa", prefix: "meals", suffix: "" }].map(metric => {
    let min = number(`${metric.prefix}Min${metric.suffix}`), max = number(`${metric.prefix}Max${metric.suffix}`);
    if (min !== null && max !== null && min > max) { qualityWarnings.push(`${metric.label}: khoảng nguồn cần xác minh, chưa dùng để đối chiếu.`); min = null; max = null; }
    return { key: metric.key, label: metric.label, unit: metric.unit, min, max };
  });
  const note = typeof raw.note === "string" ? raw.note.slice(0, 8000) : null;
  if (note && /(?:\/\s*kg|\bkg\b|cân nặng)/iu.test(note)) qualityWarnings.push("Ghi chú nguồn có mức theo kg cân nặng; khoảng số trong kho chỉ là tham khảo, không tự đổi thành mục tiêu của người này.");
  const rawWater = { min: number("waterMinMl"), max: number("waterMaxMl"), columnUnit: "ml" as const, unitVerified: false as const };
  if (rawWater.min !== null || rawWater.max !== null) qualityWarnings.push("Đơn vị nước trong bảng MCDA chưa được xác minh; giữ số gốc, không tự đổi lít/ml và không đối chiếu nước.");
  return { id: String(raw.id), code: String(raw.code), name: String(raw.name), targetGroup: String(raw.targetGroup), diseaseGroup: String(raw.diseaseGroup), ranges, note,
    source: { label: "Kho mã chế độ ăn Dinh dưỡng 2598 · bảng MCDA", url: "https://dinhduong2598.food/api/diet-codes" }, qualityWarnings, rawWater };
}
export function dietRangeText(range: Pick<DietRange, "min" | "max" | "unit">): string {
  const n = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  if (range.min === null && range.max === null) return "—";
  if (range.min === range.max) return `${n(range.min!)} ${range.unit}`;
  return range.min === null ? `≤ ${n(range.max!)} ${range.unit}` : range.max === null ? `≥ ${n(range.min)} ${range.unit}` : `${n(range.min)}–${n(range.max)} ${range.unit}`;
}
export function dietStatus(actual: number | null, min: number | null, max: number | null): ClinicalMetric["status"] {
  if (actual === null || !Number.isFinite(actual) || min === null && max === null) return "unknown";
  return min !== null && actual < min ? "below" : max !== null && actual > max ? "above" : "within";
}
export function assessClinicalContext(input: MenuInput, days: ResolvedDay[], totals: Record<string, NutrientTotal>, diet?: NutritionDietCode): ClinicalAssessment | undefined {
  const context = input.clinicalContext;
  if (!context) return undefined;
  const dataDays = days.filter(day => day.rows.length);
  const confirmed = context.selection === "user_confirmed" || context.selection === "prescribed";
  const applicable = Boolean(diet && context.targetGroup === diet.targetGroup && confirmed);
  const metrics = diet?.ranges.map(range => {
    const values = dataDays.map(day => {
      if (range.key === "meals") return day.rows.some(row => row.quantity === null) ? null : new Set(day.rows.filter(row => row.quantity !== 0).map(row => row.meal)).size;
      let sum = 0;
      for (const row of day.rows) {
        if (row.referenceAmount === null || row.food.nutrients[range.key] == null && row.referenceAmount !== 0) return null;
        sum += row.referenceAmount === 0 ? 0 : row.referenceAmount * row.food.nutrients[range.key]! / 100;
      }
      return sum;
    });
    const total = totals[range.key], estimated = range.key === "meals" ? false : total?.estimated ?? false;
    const incomplete = values.some(value => value === null) || !dataDays.length;
    const average = incomplete ? null : values.reduce<number>((sum, value) => sum + value!, 0) / values.length;
    const assessed = applicable ? values.filter((value): value is number => value !== null && !estimated && dietStatus(value, range.min, range.max) !== "unknown") : [];
    return { ...range, average, status: applicable && !incomplete && !estimated ? dietStatus(average, range.min, range.max) : "unknown" as const,
      assessedDays: assessed.length, withinDays: assessed.filter(value => dietStatus(value, range.min, range.max) === "within").length, dataDays: dataDays.length, incomplete, estimated };
  }) ?? [];
  return { context, diet: diet ?? null, metrics, referenceOnly: true, notice: DIET_REFERENCE_NOTICE };
}
