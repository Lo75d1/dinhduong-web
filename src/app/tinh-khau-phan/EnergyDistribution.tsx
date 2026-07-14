"use client";

import { useEffect, useMemo, useState } from "react";
import type { RecommendationRow } from "./matchRecommendation";
import { findRecommendation } from "./matchRecommendation";
import type { Profile } from "./PersonalProfile";
import type { Row } from "./types";

const round = (value: number) => Math.round(value * 10) / 10;

const ACTIVITY_FACTOR: Record<Profile["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  very_heavy: 1.9,
};
const PHYS_BONUS: Record<Profile["physiology"], number> = {
  normal: 0,
  pregnant_1: 50,
  pregnant_2: 250,
  pregnant_3: 450,
  lactating_1: 500,
  lactating_2: 500,
};

function asNumber(value: string) {
  const result = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(result) ? result : 0;
}

function targetForAdult(profile: Profile, age: number, weight: number, height: number) {
  const bmr = profile.gender === "Nữ" ? 10 * weight + 6.25 * height - 5 * age - 161 : 10 * weight + 6.25 * height - 5 * age + 5;
  return Math.round(bmr * ACTIVITY_FACTOR[profile.activityLevel] + PHYS_BONUS[profile.physiology]);
}

export default function EnergyDistribution({ rows, totals, profile }: { rows: Row[]; totals: Record<string, number>; profile: Profile | null }) {
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);

  useEffect(() => {
    fetch("/api/nutrition-recommendations")
      .then((response) => response.json())
      .then((data) => setRecommendations(data.items ?? []))
      .catch(() => setRecommendations([]));
  }, []);

  const mealRows = useMemo(() => {
    const meals = new Map<string, number>();
    for (const row of rows) {
      if (!row.foodId) continue;
      const kcalPer100g = row.nutrients.energyKcal;
      const kcal = typeof kcalPer100g === "number" ? (kcalPer100g * row.grams) / 100 : 0;
      const meal = row.meal || "Chưa phân bữa";
      meals.set(meal, (meals.get(meal) ?? 0) + kcal);
    }
    return [...meals.entries()].map(([meal, kcal]) => ({ meal, kcal }));
  }, [rows]);

  const actualEnergy = totals.energyKcal ?? 0;
  const targetEnergy = useMemo(() => {
    if (!profile) return null;
    const ageYear = profile.ageUnit === "thang" ? asNumber(profile.age) / 12 : asNumber(profile.age);
    const ageMonth = profile.ageUnit === "thang" ? asNumber(profile.age) : asNumber(profile.age) * 12;
    const weight = asNumber(profile.weight);
    const height = asNumber(profile.height);
    if (!ageYear) return null;
    const rec = findRecommendation(recommendations, { gender: profile.gender, physiology: profile.physiology, ageYr: ageYear, ageMonth, activityLevel: profile.activityLevel });
    const isPhysiologicalGroup = profile.gender === "Nữ" && profile.physiology !== "normal";
    const base = isPhysiologicalGroup ? findRecommendation(recommendations, { gender: "Nữ", physiology: "normal", ageYr: ageYear, ageMonth, activityLevel: profile.activityLevel }) : null;
    // RNI lưu thai kỳ/cho bú là phần cộng thêm; cộng với dòng nữ cùng tuổi/mức hoạt động.
    if (isPhysiologicalGroup && rec?.energyKcal !== null && rec?.energyKcal !== undefined && base?.energyKcal !== null && base?.energyKcal !== undefined) return base.energyKcal + rec.energyKcal;
    if (rec?.energyKcal !== null && rec?.energyKcal !== undefined) return rec.energyKcal;
    // Dự phòng duy nhất khi bảng RNI không có dòng khớp; nhãn UI nêu rõ đây là ước tính.
    return ageMonth > 0 && ageMonth <= 216 || !weight || !height ? null : targetForAdult(profile, ageYear, weight, height);
  }, [profile, recommendations]);

  const macros = [
    { label: "Đạm", grams: totals.proteinG ?? 0, factor: 4, min: 13, max: 20 },
    { label: "Béo", grams: totals.lipidG ?? 0, factor: 9, min: 20, max: 30 },
    { label: "Bột đường", grams: totals.glucidG ?? 0, factor: 4, min: 55, max: 65 },
  ];
  const atwaterTotal = macros.reduce((sum, macro) => sum + macro.grams * macro.factor, 0);
  const energyGap = targetEnergy === null ? null : actualEnergy - targetEnergy;

  if (!mealRows.length) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4" aria-label="Phân bổ năng lượng và đối chiếu">
      <div className="border-b border-neutral-200 pb-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">ĐỐI CHIẾU KHẨU PHẦN</p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">Phân bổ năng lượng &amp; đối chiếu</h2>
        <p className="mt-1 text-sm text-neutral-700">Năng lượng theo bữa, chênh lệch với nhu cầu và tỷ lệ năng lượng từ các chất sinh năng lượng. Ưu tiên bảng Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Khẩu phần thực tế" value={`${round(actualEnergy)} kcal`} />
        <Metric label="Nhu cầu ước tính" value={targetEnergy === null ? "Cần hồ sơ cá nhân" : `${round(targetEnergy)} kcal`} />
        <Metric label="Chênh lệch" value={energyGap === null ? "—" : `${energyGap > 0 ? "+" : ""}${round(energyGap)} kcal`} status={energyGap === null ? undefined : Math.abs(energyGap) <= (targetEnergy ?? 0) * 0.1 ? "balanced" : energyGap < 0 ? "low" : "high"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Tỷ lệ P : L : G</h3>
          <div className="mt-2 overflow-x-auto"><table className="w-full text-sm"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-800"><tr><th className="px-2 py-2">Chất</th><th className="px-2 py-2 text-right">Khối lượng</th><th className="px-2 py-2 text-right">Kcal</th><th className="px-2 py-2 text-right">% năng lượng</th><th className="px-2 py-2 text-right">Khuyến nghị</th></tr></thead><tbody>{macros.map((macro) => { const kcal = macro.grams * macro.factor; const pct = atwaterTotal ? (kcal / atwaterTotal) * 100 : 0; const status = pct < macro.min ? "Thấp" : pct > macro.max ? "Cao" : "Đạt"; return <tr key={macro.label} className="border-b border-neutral-100"><td className="px-2 py-2 font-medium">{macro.label}</td><td className="px-2 py-2 text-right">{round(macro.grams)} g</td><td className="px-2 py-2 text-right">{round(kcal)}</td><td className="px-2 py-2 text-right">{round(pct)}% <span className={status === "Đạt" ? "text-emerald-700" : "text-amber-700"}>({status})</span></td><td className="px-2 py-2 text-right">{macro.min}–{macro.max}%</td></tr>; })}</tbody></table></div>
          <p className="mt-2 text-xs text-neutral-700">Quy đổi Atwater: đạm 4, béo 9, bột đường 4 kcal/g.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Phân bổ năng lượng theo bữa</h3>
          <div className="mt-2 overflow-x-auto"><table className="w-full text-sm"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-800"><tr><th className="px-2 py-2">Bữa</th><th className="px-2 py-2 text-right">Năng lượng</th><th className="px-2 py-2 text-right">Tỷ trọng</th></tr></thead><tbody>{mealRows.map((item) => { const pct = actualEnergy ? (item.kcal / actualEnergy) * 100 : 0; return <tr key={item.meal} className="border-b border-neutral-100"><td className="px-2 py-2"><div className="font-medium">{item.meal}</div><div className="mt-1 h-1.5 w-full bg-neutral-100"><div className="h-full bg-[#123c36]" style={{ width: `${Math.min(100, pct)}%` }} /></div></td><td className="px-2 py-2 text-right">{round(item.kcal)} kcal</td><td className="px-2 py-2 text-right">{round(pct)}%</td></tr>; })}</tbody></table></div>
        </div>
      </div>
      {!profile && <p className="mt-4 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-neutral-900">Nhập hồ sơ cá nhân để đối chiếu năng lượng khẩu phần với nhu cầu ước tính.</p>}
    </section>
  );
}

function Metric({ label, value, status }: { label: string; value: string; status?: "balanced" | "low" | "high" }) {
  const color = status === "balanced" ? "border-emerald-700" : status === "low" ? "border-amber-600" : status === "high" ? "border-rose-700" : "border-[#123c36]";
  return <div className={`border-l-4 ${color} bg-neutral-50 p-3`}><div className="text-xs font-semibold text-neutral-800">{label}</div><div className="mt-1 text-lg font-semibold text-neutral-900">{value}</div></div>;
}
