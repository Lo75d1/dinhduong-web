"use client";

import { useEffect, useMemo, useState } from "react";
import type { Profile } from "./PersonalProfile";
import type { Row } from "./types";
import { findRecommendation, type RecommendationRow } from "./matchRecommendation";

const round = (value: number) => Math.round(value * 10) / 10;
const numberValue = (value: string) => { const result = Number.parseFloat(value.replace(",", ".")); return Number.isFinite(result) ? result : 0; };
const activityFactor: Record<Profile["activityLevel"], number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725, very_heavy: 1.9 };
const physiologyBonus: Record<Profile["physiology"], number> = { normal: 0, pregnant_1: 50, pregnant_2: 250, pregnant_3: 450, lactating_1: 500, lactating_2: 500 };

function statusForBmi(value: number) { return value < 18.5 ? "Thiếu cân" : value < 23 ? "Bình thường" : value < 25 ? "Thừa cân" : "Béo phì"; }
function macroStatus(value: number, min: number, max: number) { return value < min ? "Thấp" : value > max ? "Cao" : "Cân đối"; }

export default function ClinicalSummary({ rows, totals, profile }: { rows: Row[]; totals: Record<string, number>; profile: Profile | null }) {
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  useEffect(() => {
    fetch("/api/nutrition-recommendations")
      .then((response) => response.json())
      .then((data) => setRecommendations(data.items ?? []))
      .catch(() => setRecommendations([]));
  }, []);
  const foodRows = rows.filter((row) => row.foodId);
  const actualEnergy = totals.energyKcal ?? 0, protein = totals.proteinG ?? 0, lipid = totals.lipidG ?? 0, glucid = totals.glucidG ?? 0;
  const atwater = protein * 4 + lipid * 9 + glucid * 4;
  const macroRows = [{ label: "Đạm", pct: atwater ? protein * 4 / atwater * 100 : 0, min: 13, max: 20 }, { label: "Béo", pct: atwater ? lipid * 9 / atwater * 100 : 0, min: 20, max: 30 }, { label: "Bột đường", pct: atwater ? glucid * 4 / atwater * 100 : 0, min: 55, max: 65 }];
  const ageYear = profile?.ageUnit === "thang" ? numberValue(profile.age) / 12 : profile ? numberValue(profile.age) : 0;
  const isAdult = ageYear > 18;
  const weight = profile ? numberValue(profile.weight) : 0, height = profile ? numberValue(profile.height) : 0;
  const recommendation = useMemo(() => {
    if (!profile || !ageYear || !recommendations.length) return null;
    const ageMonth = profile.ageUnit === "thang" ? numberValue(profile.age) : ageYear * 12;
    return findRecommendation(recommendations, { gender: profile.gender, physiology: profile.physiology, ageYr: ageYear, ageMonth, activityLevel: profile.activityLevel });
  }, [profile, ageYear, recommendations]);
  const baseRecommendation = useMemo(() => {
    if (!profile || profile.gender !== "Nữ" || profile.physiology === "normal" || !ageYear || !recommendations.length) return null;
    const ageMonth = profile.ageUnit === "thang" ? numberValue(profile.age) : ageYear * 12;
    return findRecommendation(recommendations, { gender: "Nữ", physiology: "normal", ageYr: ageYear, ageMonth, activityLevel: profile.activityLevel });
  }, [profile, ageYear, recommendations]);
  const rniEnergy = recommendation?.energyKcal ?? null;
  const targetEnergyFromRni = baseRecommendation?.energyKcal !== null && baseRecommendation?.energyKcal !== undefined && rniEnergy !== null
    ? baseRecommendation.energyKcal + rniEnergy
    : rniEnergy;
  const mifflinFallback = profile && isAdult && weight && height ? Math.round((profile.gender === "Nữ" ? 10 * weight + 6.25 * height - 5 * ageYear - 161 : 10 * weight + 6.25 * height - 5 * ageYear + 5) * activityFactor[profile.activityLevel] + physiologyBonus[profile.physiology]) : null;
  const targetEnergy = targetEnergyFromRni ?? mifflinFallback;
  const targetEnergySource = targetEnergyFromRni !== null ? "RNI theo tuổi/giới và mức hoạt động" : mifflinFallback !== null ? "ước tính Mifflin–St Jeor (chưa có dòng RNI phù hợp)" : null;
  if (!foodRows.length) return null;
  const energyStatus = targetEnergy === null ? null : actualEnergy < targetEnergy * 0.9 ? "Thiếu" : actualEnergy > targetEnergy * 1.1 ? "Vượt" : "Gần mục tiêu";
  const bmi = profile && isAdult && weight && height ? weight / Math.pow(height / 100, 2) : null;
  const missingCore = foodRows.filter((row) => ["energyKcal", "proteinG", "lipidG", "glucidG"].some((key) => row.nutrients[key] === null)).length;

  return <section className="rounded-lg border-2 border-[#123c36] bg-[#f7faf8] p-5" aria-label="Kết luận lâm sàng tóm tắt"><div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">KẾT LUẬN LÂM SÀNG TÓM TẮT</p><h2 className="mt-1 text-xl font-semibold text-neutral-950">Đọc nhanh khẩu phần</h2><p className="mt-1 text-sm text-neutral-800">Các trạng thái là kết quả đối chiếu dữ liệu đang nhập; xem bảng chi tiết trước khi đưa ra quyết định chuyên môn.</p></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Metric label="Năng lượng" value={`${round(actualEnergy)} kcal`} note={targetEnergy ? `${energyStatus} so với mục tiêu ${targetEnergy} kcal${targetEnergySource ? ` · ${targetEnergySource}` : ""}` : "Cần hồ sơ đầy đủ để đối chiếu"} tone={energyStatus === "Vượt" ? "high" : energyStatus === "Thiếu" ? "low" : "ok"} /><Metric label="BMI" value={bmi === null ? "—" : `${round(bmi)}`} note={bmi === null ? "Chỉ đánh giá ở người lớn có đủ cao, cân" : statusForBmi(bmi)} tone={bmi !== null && statusForBmi(bmi) !== "Bình thường" ? "low" : "ok"} /><Metric label="Chất xơ" value={`${round(totals.fiberG ?? 0)} g`} note="Xem đối chiếu vi chất để biết mức đáp ứng" tone="neutral" /><Metric label="Natri" value={`${round(totals.sodiumMg ?? 0)} mg`} note="Chọn mã chế độ ăn để đối chiếu ngưỡng phù hợp" tone="neutral" /></div><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-md border border-[#aeb8b4] bg-white p-3"><h3 className="font-semibold text-neutral-950">Cân đối P / L / G</h3><div className="mt-2 grid grid-cols-3 gap-2">{macroRows.map((macro) => { const status = macroStatus(macro.pct, macro.min, macro.max); return <div key={macro.label} className={`rounded border p-2 text-center ${status === "Cân đối" ? "border-emerald-700 bg-emerald-50" : "border-amber-600 bg-amber-50"}`}><p className="text-sm font-semibold">{macro.label}</p><p className="mt-1 text-lg font-semibold">{round(macro.pct)}%</p><p className="text-xs text-neutral-800">{status} · {macro.min}–{macro.max}%</p></div>; })}</div></div><div className={`rounded-md border p-3 ${missingCore ? "border-amber-600 bg-amber-50" : "border-emerald-700 bg-emerald-50"}`}><h3 className="font-semibold text-neutral-950">Độ đầy đủ dữ liệu</h3><p className="mt-2 text-sm text-neutral-900">{missingCore ? `${missingCore}/${foodRows.length} thực phẩm thiếu ít nhất một trong 4 chất cốt lõi (năng lượng, đạm, béo, bột đường).` : `Đủ 4 chất cốt lõi cho ${foodRows.length} thực phẩm đang tính.`}</p><p className="mt-1 text-xs text-neutral-800">Các chất vi lượng có thể vẫn thiếu số liệu; xem cột ghi chú ở bảng Vi chất.</p></div></div></section>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: "ok" | "low" | "high" | "neutral" }) {
  const color = tone === "ok" ? "border-emerald-700" : tone === "high" ? "border-rose-700" : tone === "low" ? "border-amber-600" : "border-[#123c36]";
  return <div className={`border-l-4 ${color} bg-white p-3`}><p className="text-sm font-semibold text-neutral-950">{label}</p><p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-800">{note}</p></div>;
}
