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
