"use client";

import { useEffect, useMemo, useState } from "react";
import { NUTRIENT_GROUPS } from "@/lib/nutrient-fields";
import { findRecommendation, resolveRecommendationTarget, type RecommendationRow } from "./matchRecommendation";
import type { Profile } from "./PersonalProfile";
import type { Row } from "./types";

const DEFAULT_KEYS = ["fiberG", "calciumMg", "ironMg", "zincMg", "sodiumMg", "potassiumMg", "vitARaeMcg", "vitCMg"];
const RECOMMENDATION_KEYS: Record<string, string> = {
  fiberG: "fiber", calciumMg: "calcium", ironMg: "iron", zincMg: "zinc", potassiumMg: "potassium", magnesiumMg: "magnesium", phosphorusMg: "phosphorus", vitARaeMcg: "vitA", vitCMg: "vitC", vitB1Mg: "vitB1", vitB2Mg: "vitB2", vitB3Mg: "vitB3",
};

type FoodValues = Record<string, Record<string, number | null>>;
const round = (value: number) => Math.round(value * 10) / 10;

function numberValue(value: string) {
  const result = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(result) ? result : 0;
}

export default function MicronutrientComparison({ rows, profile }: { rows: Row[]; profile: Profile | null }) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_KEYS);
  const [foodValues, setFoodValues] = useState<FoodValues>({});
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const ids = useMemo(() => [...new Set(rows.filter((row) => row.foodId).map((row) => row.foodId))], [rows]);
  const fields = useMemo(() => NUTRIENT_GROUPS.slice(1, 3).flatMap((group) => group.fields).filter((field) => selectedKeys.includes(field.key)), [selectedKeys]);
  const idsKey = ids.join(",");
  const fieldsKey = fields.map((field) => field.key).join(",");

  useEffect(() => {
    if (!idsKey || !fieldsKey) return;
    fetch("/api/foods/report-nutrients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, fields: fields.map((field) => field.key) }) })
      .then((response) => response.json())
      .then((data) => {
        const next: FoodValues = {};
        for (const item of data.items ?? []) {
          next[item.id] = {};
          for (const field of fields) next[item.id][field.key] = typeof item[field.key] === "number" ? item[field.key] : null;
        }
        setFoodValues(next);
      })
      .catch(() => setFoodValues({}));
  }, [idsKey, fieldsKey, fields, ids]);

  useEffect(() => {
    fetch("/api/nutrition-recommendations").then((response) => response.json()).then((data) => setRecommendations(data.items ?? [])).catch(() => setRecommendations([]));
  }, []);

  const recommendation = useMemo(() => {
    if (!profile) return null;
    const ageYr = profile.ageUnit === "thang" ? numberValue(profile.age) / 12 : numberValue(profile.age);
    const ageMonth = profile.ageUnit === "thang" ? numberValue(profile.age) : numberValue(profile.age) * 12;
    if (!ageYr) return null;
    return findRecommendation(recommendations, { gender: profile.gender, physiology: profile.physiology, ageYr, ageMonth, activityLevel: profile.activityLevel });
  }, [profile, recommendations]);
  const baseRecommendation = useMemo(() => {
    if (!profile || profile.gender !== "Nữ" || profile.physiology === "normal") return null;
    const ageYr = profile.ageUnit === "thang" ? numberValue(profile.age) / 12 : numberValue(profile.age);
    const ageMonth = profile.ageUnit === "thang" ? numberValue(profile.age) : numberValue(profile.age) * 12;
    if (!ageYr) return null;
    return findRecommendation(recommendations, { gender: "Nữ", physiology: "normal", ageYr, ageMonth, activityLevel: profile.activityLevel });
  }, [profile, recommendations]);

  const summaries = fields.map((field) => {
    let total = 0;
    let hasValue = false;
    let incomplete = false;
    for (const row of rows) {
      if (!row.foodId) continue;
      const value = foodValues[row.foodId]?.[field.key];
      if (typeof value !== "number") { incomplete = true; continue; }
      hasValue = true;
      total += (value * row.grams) / 100;
    }
    const targetKey = RECOMMENDATION_KEYS[field.key];
    const targetInfo = targetKey ? resolveRecommendationTarget(recommendation, baseRecommendation, targetKey) : null;
    const target = targetInfo?.value ?? null;
    const percent = hasValue && typeof target === "number" && target > 0 ? (total / target) * 100 : null;
    return { field, total, hasValue, incomplete, target, targetInfo, percent };
  });

  function toggle(key: string) { setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); }

  if (!ids.length) return null;

  return <section className="rounded-lg border border-neutral-200 bg-white p-4" aria-label="Vi chất và chất không sinh năng lượng">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-3"><div><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">VI CHẤT &amp; CHẤT KHÔNG SINH NĂNG LƯỢNG</p><h2 className="mt-1 text-lg font-semibold text-neutral-900">Đối chiếu vi chất khẩu phần</h2><p className="mt-1 text-sm text-neutral-700">Tổng khẩu phần, khuyến nghị theo hồ sơ và phần trăm đáp ứng.</p></div><details className="rounded-md border border-neutral-300 bg-white text-sm"><summary className="cursor-pointer px-3 py-1.5 font-semibold text-neutral-900">⚙ Chọn chất ({fields.length})</summary><div className="max-h-80 w-80 overflow-auto border-t border-neutral-200 p-3">{NUTRIENT_GROUPS.slice(1, 3).map((group) => <fieldset key={group.title} className="mb-3"><legend className="mb-1 text-xs font-semibold text-neutral-800">{group.title}</legend>{group.fields.map((field) => <label key={field.key} className="flex items-center gap-2 py-0.5 text-xs text-neutral-900"><input type="checkbox" checked={selectedKeys.includes(field.key)} onChange={() => toggle(field.key)} />{field.label} ({field.unit})</label>)}</fieldset>)}</div></details></div>
    <div className="mt-3 overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-800"><tr><th className="px-2 py-2">Chất</th><th className="px-2 py-2 text-right">Thực tế</th><th className="px-2 py-2 text-right">Khuyến nghị</th><th className="px-2 py-2 text-right">Đáp ứng</th><th className="px-2 py-2">Ghi chú</th></tr></thead><tbody>{summaries.map((item) => <tr key={item.field.key} className="border-b border-neutral-100"><td className="px-2 py-2 font-medium">{item.field.label}</td><td className="px-2 py-2 text-right">{item.hasValue ? `${item.incomplete ? "≥ " : ""}${round(item.total)} ${item.field.unit}` : "—"}</td><td className="px-2 py-2 text-right">{typeof item.target === "number" ? `${round(item.target)} ${item.field.unit}` : "—"}</td><td className="px-2 py-2 text-right">{item.percent === null ? "—" : `${round(item.percent)}%`}</td><td className="px-2 py-2 text-xs text-neutral-800">{item.incomplete ? "Thiếu dữ liệu ở một số thực phẩm" : typeof item.target !== "number" ? "Chưa có ngưỡng khuyến nghị" : "Đủ dữ liệu"}</td></tr>)}</tbody></table></div>
    {!profile && <p className="mt-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-neutral-900">Nhập hồ sơ cá nhân để đối chiếu vi chất với khuyến nghị phù hợp.</p>}
    <p className="mt-2 text-xs text-neutral-700">Dấu ≥ nghĩa là tổng tối thiểu: có thực phẩm chưa có số liệu cho chất đó, nên không được mặc định tính bằng 0.</p>
  </section>;
}
