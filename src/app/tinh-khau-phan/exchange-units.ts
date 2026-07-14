import { normalizeVi } from "@/lib/normalize";
import type { Row } from "./types";

export type ExchangeRule = { type: "glucid" | "protein" | "lipid" | "qty" | "other"; divisor: number; unitText: string };
export type ExchangeGroup = { group: string; grams: number; kcal: number; protein: number; lipid: number; glucid: number; rule: ExchangeRule; units: number | null };

export function getExchangeRule(group: string): ExchangeRule | null {
  const value = normalizeVi(group);
  if (value.includes("luong thuc")) return { type: "glucid", divisor: 20, unitText: "1 ĐV ≈ 20g Glucid (~90 kcal)" };
  if (value.includes("dau") || value.includes("mo")) return { type: "lipid", divisor: 5, unitText: "1 ĐV ≈ 5g Lipid" };
  if (value.includes("thit") || value.includes("hai san") || /(^|[\s,])ca(?=$|[\s,])/.test(value)) return { type: "protein", divisor: 7, unitText: "1 ĐV ≈ 7g Protein" };
  if (value.includes("rau") || value.includes("cu") || value.includes("qua")) return { type: "qty", divisor: 100, unitText: "1 ĐV ≈ 100g rau/củ/quả" };
  if (value.includes("hat")) return { type: "protein", divisor: 7, unitText: "1 ĐV ≈ 7g Protein (hạt/đậu)" };
  if (value.includes("trung")) return { type: "protein", divisor: 7, unitText: "1 ĐV ≈ 7g Protein" };
  if (value.includes("sua")) return { type: "qty", divisor: 100, unitText: "1 ĐV ≈ 100g sữa/chế phẩm" };
  if (value.includes("gia vi")) return null;
  return { type: "other", divisor: 1, unitText: "Chưa có quy tắc quy đổi" };
}

export function aggregateExchangeGroups(rows: Row[]): ExchangeGroup[] {
  const groups = new Map<string, ExchangeGroup>();
  for (const row of rows) {
    if (!row.foodId) continue;
    const group = row.classify.foodGroup ?? "Chưa phân nhóm";
    const rule = getExchangeRule(group);
    if (!rule) continue;
    const current = groups.get(group) ?? { group, grams: 0, kcal: 0, protein: 0, lipid: 0, glucid: 0, rule, units: null };
    const factor = row.grams / 100;
    current.grams += row.grams;
    current.kcal += (row.nutrients.energyKcal ?? 0) * factor;
    current.protein += (row.nutrients.proteinG ?? 0) * factor;
    current.lipid += (row.nutrients.lipidG ?? 0) * factor;
    current.glucid += (row.nutrients.glucidG ?? 0) * factor;
    groups.set(group, current);
  }
  return [...groups.values()].map((group) => {
    const base = group.rule.type === "glucid" ? group.glucid : group.rule.type === "protein" ? group.protein : group.rule.type === "lipid" ? group.lipid : group.rule.type === "qty" ? group.grams : null;
    return { ...group, units: base === null ? null : base / group.rule.divisor };
  });
}
