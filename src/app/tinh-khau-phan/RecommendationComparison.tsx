"use client";

import { useEffect, useState } from "react";
import type { Profile } from "./PersonalProfile";
import { findRecommendation, resolveRecommendationTarget, type RecommendationRow } from "./matchRecommendation";

function toNumber(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function round(n: number, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

// chất vi lượng đối chiếu được: field trong `totals` (CORE_CALC_FIELDS) -> cột trong NutritionRecommendation
const MICRO_MAP: { key: string; label: string; unit: string; recCol: string }[] = [
  { key: "fiberG", label: "Chất xơ", unit: "g", recCol: "fiber" },
  { key: "calciumMg", label: "Canxi", unit: "mg", recCol: "calcium" },
  { key: "ironMg", label: "Sắt", unit: "mg", recCol: "iron" },
  { key: "zincMg", label: "Kẽm", unit: "mg", recCol: "zinc" },
  { key: "potassiumMg", label: "Kali", unit: "mg", recCol: "potassium" },
  { key: "magnesiumMg", label: "Magie", unit: "mg", recCol: "magnesium" },
  { key: "phosphorusMg", label: "Phospho", unit: "mg", recCol: "phosphorus" },
  { key: "vitARaeMcg", label: "Vitamin A", unit: "µg", recCol: "vitA" },
  { key: "vitCMg", label: "Vitamin C", unit: "mg", recCol: "vitC" },
  { key: "vitB1Mg", label: "Vitamin B1", unit: "mg", recCol: "vitB1" },
  { key: "vitB2Mg", label: "Vitamin B2", unit: "mg", recCol: "vitB2" },
  { key: "vitB3Mg", label: "Vitamin B3", unit: "mg", recCol: "vitB3" },
];

export default function RecommendationComparison({
  profile,
  totals,
}: {
  profile: Profile;
  totals: Record<string, number>;
}) {
  const [rows, setRows] = useState<RecommendationRow[]>([]);

  useEffect(() => {
    fetch("/api/nutrition-recommendations")
      .then((r) => r.json())
      .then((d) => setRows(d.items ?? []))
      .catch(() => setRows([]));
  }, []);

  const ageYr = profile.ageUnit === "thang" ? toNumber(profile.age) / 12 : toNumber(profile.age);
  const ageMonth = profile.ageUnit === "thang" ? toNumber(profile.age) : toNumber(profile.age) * 12;
  const hasAge = ageYr > 0;

  if (!hasAge || rows.length === 0) return null;

  const rec = findRecommendation(rows, {
    gender: profile.gender,
    physiology: profile.physiology,
    ageYr,
    ageMonth,
    activityLevel: profile.activityLevel,
  });

  if (!rec) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Đối chiếu khuyến nghị</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Không tìm thấy nhóm tuổi/giới phù hợp trong bảng khuyến nghị.
        </p>
      </div>
    );
  }

  const isPhysiologicalGroup = profile.gender === "Nữ" && profile.physiology !== "normal";
  const baseRec = isPhysiologicalGroup ? findRecommendation(rows, { gender: "Nữ", physiology: "normal", ageYr, ageMonth, activityLevel: profile.activityLevel }) : null;
  // Bảng RNI ghi riêng phần cộng thêm ở thai kỳ/cho bú. Mục tiêu chính thức = nền nữ cùng tuổi/mức hoạt động + phần cộng.
  const targetEnergy = isPhysiologicalGroup && baseRec?.energyKcal !== null && baseRec?.energyKcal !== undefined && rec.energyKcal !== null && rec.energyKcal !== undefined ? baseRec.energyKcal + rec.energyKcal : rec.energyKcal;

  const actualEnergy = totals.energyKcal ?? 0;
  const pctEnergy = targetEnergy ? (actualEnergy / targetEnergy) * 100 : null;

  const kcalP = (totals.proteinG ?? 0) * 4;
  const kcalL = (totals.lipidG ?? 0) * 9;
  const kcalG = (totals.glucidG ?? 0) * 4;
  const macroKcal = kcalP + kcalL + kcalG;
  const pctP = macroKcal > 0 ? (kcalP / macroKcal) * 100 : 0;
  const pctL = macroKcal > 0 ? (kcalL / macroKcal) * 100 : 0;
  const pctG = macroKcal > 0 ? (kcalG / macroKcal) * 100 : 0;

  // Ở 4 dòng "Phụ nữ có thai/cho con bú", cột proteinMinPct/MaxPct lưu SỐ GRAM ĐẠM CỘNG THÊM
  // (vd +25g), không phải % năng lượng như các dòng còn lại — không quy đổi %, hiển thị riêng.
  const proteinIsExtraGrams = rec.ageGroup.startsWith("Phụ nữ");
  const extraProteinG = proteinIsExtraGrams ? rec.proteinMinPct : null;

  const macroRows = [
    {
      label: "Đạm",
      pct: pctP,
      min: proteinIsExtraGrams ? null : rec.proteinMinPct,
      max: proteinIsExtraGrams ? null : rec.proteinMaxPct,
    },
    { label: "Béo", pct: pctL, min: rec.lipidMinPct, max: rec.lipidMaxPct },
    { label: "Bột đường", pct: pctG, min: rec.glucidMinPct, max: rec.glucidMaxPct },
  ];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-700">Đối chiếu khuyến nghị</h2>
      <p className="mt-0.5 text-xs text-neutral-400">
        Nhóm: {rec.ageGroup} · {rec.gender}
        {rec.physicalActivity ? ` · Mức lao động: ${rec.physicalActivity}` : ""}
        {isPhysiologicalGroup && baseRec?.energyKcal ? ` · Nền ${baseRec.energyKcal} kcal + ${rec.energyKcal ?? 0} kcal theo tình trạng sinh lý` : ""}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-neutral-50 p-3 text-center">
          <div className="text-xs text-neutral-500">Năng lượng</div>
          <div className="mt-1 text-sm font-medium">
            {round(actualEnergy)} / {targetEnergy ? round(targetEnergy) : "–"} kcal
          </div>
          {pctEnergy !== null && (
            <div className="mt-0.5 text-xs text-neutral-400">{round(pctEnergy)}% mục tiêu</div>
          )}
        </div>
      </div>

      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs text-neutral-400">
          <tr>
            <th className="py-1 font-medium">Chất sinh năng lượng</th>
            <th className="py-1 text-right font-medium">Thực tế (%NL)</th>
            <th className="py-1 text-right font-medium">Khuyến nghị</th>
            <th className="py-1 text-right font-medium">Đánh giá</th>
          </tr>
        </thead>
        <tbody>
          {macroRows.map((r) => {
            const min = r.min !== null ? r.min * 100 : null;
            const max = r.max !== null ? r.max * 100 : null;
            const inRange = min !== null && max !== null ? r.pct >= min && r.pct <= max : null;
            return (
              <tr key={r.label} className="border-t border-neutral-100">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 text-right tabular-nums">{round(r.pct)}%</td>
                <td className="py-1.5 text-right tabular-nums text-neutral-400">
                  {min !== null && max !== null ? `${round(min)}–${round(max)}%` : "–"}
                </td>
                <td className="py-1.5 text-right">
                  {inRange === null ? (
                    "–"
                  ) : inRange ? (
                    <span className="text-xs font-medium text-emerald-700">● Cân đối</span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600">
                      ▲ {r.pct < (min ?? 0) ? "Thấp" : "Cao"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {extraProteinG !== null && extraProteinG > 0 && (
        <p className="mt-1 text-xs text-neutral-400">
          Riêng đạm: khuyến nghị cộng thêm ~{extraProteinG}g/ngày so với người bình thường (theo{" "}
          {rec.ageGroup}), không phải mốc % năng lượng.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-400">
            <tr>
              <th className="py-1 font-medium">Vi chất</th>
              <th className="py-1 text-right font-medium">Thực tế</th>
              <th className="py-1 text-right font-medium">Khuyến nghị</th>
              <th className="py-1 text-right font-medium">Đáp ứng</th>
            </tr>
          </thead>
          <tbody>
            {MICRO_MAP.map((m) => {
              const targetInfo = resolveRecommendationTarget(rec, baseRec, m.recCol);
              const target = targetInfo.value;
              const actual = totals[m.key] ?? 0;
              const pct = target ? (actual / target) * 100 : null;
              return (
                <tr key={m.key} className="border-t border-neutral-100">
                  <td className="py-1.5">{m.label}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {round(actual)} {m.unit}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-neutral-400" title={targetInfo.isDelta ? `Nền ${targetInfo.baseValue ?? "–"} + tăng thêm ${targetInfo.deltaValue ?? "–"}` : targetInfo.type ?? undefined}>
                    {target !== null && target !== undefined ? `${round(target)} ${m.unit}` : "–"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {pct !== null ? `${round(pct)}%` : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">
        Căn cứ: Viện Dinh dưỡng, <i>Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam</i>, bảng nhu cầu năng lượng và các phụ lục vi chất trong PDF gốc của dự án. &quot;–&quot; là chất chưa có ngưỡng khuyến nghị trong dữ liệu cho nhóm này.
      </p>
      {isPhysiologicalGroup && <p className="mt-1 text-[11px] text-neutral-500">Với chất ghi “delta” trong tài liệu, mục tiêu hiển thị là mốc nữ cùng tuổi + phần tăng thêm theo thai kỳ/cho con bú.</p>}
    </div>
  );
}
