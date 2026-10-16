import raw from "./who-growth-data.generated.json";

export type WhoIndicator = "wfa" | "lhfa" | "wfl" | "wfh" | "bfa";
export type WhoGrowthEntry = {
  sex: "Nam" | "Nu";
  indicator: WhoIndicator;
  coordinate: "ageMonths" | "sizeCm";
  x: number;
  l: number;
  m: number;
  s: number;
  source: string;
  sourceFile: string;
};

export const WHO_GROWTH_ENTRIES = raw.entries as WhoGrowthEntry[];

export function standardsFor(sex: "Nam" | "Nu", indicator: WhoIndicator) {
  return WHO_GROWTH_ENTRIES.filter((entry) => entry.sex === sex && entry.indicator === indicator);
}

export function nearestStandard(entries: WhoGrowthEntry[], coordinate: number) {
  return entries.reduce<WhoGrowthEntry | null>((nearest, entry) => !nearest || Math.abs(entry.x - coordinate) < Math.abs(nearest.x - coordinate) ? entry : nearest, null);
}

export function lmsZScore(value: number, standard: Pick<WhoGrowthEntry, "l" | "m" | "s">) {
  if (!(value > 0) || !(standard.m > 0) || !(standard.s > 0)) return null;
  const score = standard.l === 0 ? Math.log(value / standard.m) / standard.s : (Math.pow(value / standard.m, standard.l) - 1) / (standard.l * standard.s);
  return Number.isFinite(score) ? score : null;
}

export type WhoGrowthAssessmentRow = { label: string; value: number; unit: string; indicator: WhoIndicator; score: number; source: string; status: string };
function classifyGrowth(indicator: WhoIndicator, score: number, ageMonths: number) {
  if (indicator === "lhfa") return score < -3 ? "Thấp còi nặng" : score < -2 ? "Thấp còi" : "Trong dải tham khảo";
  if (indicator === "wfa") return score < -3 ? "Nhẹ cân nặng" : score < -2 ? "Nhẹ cân" : "Trong dải tham khảo";
  const overweightCutoff = ageMonths <= 60 ? 2 : 1;
  const obesityCutoff = ageMonths <= 60 ? 3 : 2;
  return score < -3 ? "Gầy còm nặng" : score < -2 ? "Gầy còm" : score > obesityCutoff ? "Béo phì" : score > overweightCutoff ? "Thừa cân" : ageMonths <= 60 && score > 1 ? "Nguy cơ thừa cân" : "Trong dải tham khảo";
}

/** One owner for the existing web table and the Excel table; charts stay in the UI. */
export function assessWhoGrowth(entries: WhoGrowthEntry[], ageMonths: number, weightKg: number, heightCm: number): WhoGrowthAssessmentRow[] {
  if (!(ageMonths > 0) || ageMonths > 228 || !(weightKg > 0) || !(heightCm > 0)) return [];
  function assess(indicator: WhoIndicator, coordinate: number, value: number, label: string, unit: string): WhoGrowthAssessmentRow | null {
    const standard = nearestStandard(entries.filter(entry => entry.indicator === indicator), coordinate);
    if (!standard) return null;
    const score = lmsZScore(value, standard);
    return score === null ? null : { label, value, unit, indicator, score, source: standard.source, status: classifyGrowth(indicator, score, ageMonths) };
  }
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  return [ageMonths <= 120 ? assess("wfa", ageMonths, weightKg, "Cân nặng theo tuổi", "kg") : null,
    assess("lhfa", ageMonths, heightCm, "Chiều cao theo tuổi", "cm"), assess("bfa", ageMonths, bmi, "BMI theo tuổi", "kg/m²"),
    ageMonths <= 60 ? assess(ageMonths < 24 ? "wfl" : "wfh", heightCm, weightKg, ageMonths < 24 ? "Cân nặng theo chiều dài" : "Cân nặng theo chiều cao", "kg") : null].filter((item): item is WhoGrowthAssessmentRow => item !== null);
}
