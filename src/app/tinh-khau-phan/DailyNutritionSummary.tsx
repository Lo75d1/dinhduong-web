"use client";

import type { NutrientField } from "@/lib/nutrient-fields";
import type { StrictMetric } from "./multi-day-analysis";
import type { Profile } from "./PersonalProfile";

type Totals = Record<string, StrictMetric | undefined>;
const macros = [{ key: "proteinG", label: "Đạm", factor: 4, color: "#2563eb" }, { key: "lipidG", label: "Béo", factor: 9, color: "#d97706" }, { key: "glucidG", label: "Bột đường", factor: 4, color: "#16a34a" }];
export function metricText(metric?: StrictMetric, divisor = 1) {
  return metric?.value == null || !Number.isFinite(metric.value) ? "—" : `${metric.incomplete ? "≥ " : ""}${(metric.value / divisor).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}`;
}

export function DailyTotalCard({ totals, fields, foodCount, amount, mode, targetKcal }: { totals: Totals; fields: NutrientField[]; foodCount: number; amount: string; mode: "recall24h" | "menu"; targetKcal?: number | null }) {
  const complete = macros.every(macro => totals[macro.key]?.value != null && !totals[macro.key]?.incomplete);
  const energies = macros.map(macro => (totals[macro.key]?.value ?? 0) * macro.factor), sum = energies.reduce((a, b) => a + b, 0);
  return <div className="rounded-lg border-2 border-[#0c5f4d] bg-[#f4fbf7] p-4" data-calculator-day-total>
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-base font-bold text-[var(--brand)]">🍽️ {mode === "recall24h" ? "Đã ăn cả ngày" : "Thực đơn cả ngày"}</h3><span className="text-xs text-neutral-700">{foodCount} thực phẩm · {amount}</span></div>
    <div className="mt-1 flex items-end gap-2"><span className="text-3xl font-extrabold leading-none text-[#0c5f4d]">{metricText(totals.energyKcal)}</span><span className="pb-0.5 text-sm text-neutral-600">kcal / ngày</span></div>
    {complete && sum > 0 ? <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-neutral-200" title="Tỷ lệ năng lượng Đạm : Béo : Bột đường">{macros.map((macro, i) => <div key={macro.key} style={{ width: `${energies[i] / sum * 100}%`, background: macro.color }}/>)}</div> : null}
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-800">{macros.map(macro => <span key={macro.key} className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: macro.color }}/>{macro.label} <b className="text-neutral-950">{metricText(totals[macro.key])} g</b></span>)}</div>
    {targetKcal != null && targetKcal > 0 ? <p className="mt-3 border-t border-[#cdd9d3] pt-2 text-sm text-neutral-700">Nhu cầu: <b>{targetKcal.toLocaleString("vi-VN")} kcal/ngày</b>{totals.energyKcal?.value != null && !totals.energyKcal.incomplete ? <> · Đáp ứng <b>{(totals.energyKcal.value / targetKcal * 100).toLocaleString("vi-VN", {maximumFractionDigits:1})}%</b> · Chênh lệch <b>{(totals.energyKcal.value - targetKcal).toLocaleString("vi-VN", {signDisplay:"exceptZero",maximumFractionDigits:1})} kcal</b></> : null}</p> : null}
    <details className="mt-3 border-t border-[#cdd9d3] pt-2"><summary className="cursor-pointer text-sm font-semibold text-[var(--brand)]">Xem tất cả {fields.length} chất</summary><div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">{fields.map(field => <div key={field.key} className="flex items-baseline justify-between gap-2"><span className="text-neutral-700">{field.label}</span><span className="font-semibold text-neutral-950">{metricText(totals[field.key])} {field.unit}</span></div>)}</div></details>
  </div>;
}

export function DailyMacroPerKgCard({ totals, profile }: { totals: Totals; profile: Profile | null }) {
  const weight = Number(profile?.weight);
  if (!(weight > 0)) return <div className="rounded-lg border-2 border-[#0c5f4d] bg-[#f4fbf7] p-4 text-sm text-neutral-700">⚖️ <b className="text-[var(--brand)]">Trên cân nặng (g/kg)</b> — nhập cân nặng ở hồ sơ để hiện chỉ số này.</div>;
  return <div className="rounded-lg border-2 border-[#0c5f4d] bg-[#f4fbf7] p-4"><div className="flex items-baseline justify-between gap-2"><h3 className="text-base font-bold text-[var(--brand)]">⚖️ Trên cân nặng (g/kg)</h3><span className="text-xs text-neutral-600">{weight} kg · {metricText(totals.energyKcal, weight)} kcal/kg</span></div><div className="mt-2 grid grid-cols-3 gap-2">{macros.map(macro => <div key={macro.key} className="rounded-md border border-[#cdd9d3] bg-white p-2 text-center"><div className="text-xl font-extrabold" style={{ color: macro.color }}>{metricText(totals[macro.key], weight)}</div><div className="text-xs text-neutral-600">{macro.label} g/kg</div></div>)}</div><p className="mt-2 text-[11px] text-neutral-500">Tính trên cân nặng hồ sơ; đối chiếu nhu cầu và chỉ định của người được đánh giá.</p></div>;
}

export function DailyMealCards({ meals, dailyEnergy }: { meals: { name: string; totals: Totals }[]; dailyEnergy?: StrictMetric }) {
  if (!meals.length) return <p className="text-sm text-neutral-600">Chưa có bữa nào có thực phẩm.</p>;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{meals.map(({name, totals}) => {
    const energy = totals.energyKcal;
    const percentage = energy?.value != null && !energy.incomplete && dailyEnergy?.value && !dailyEnergy.incomplete ? Math.round(energy.value / dailyEnergy.value * 100) : null;
    const complete = macros.every(macro => totals[macro.key]?.value != null && !totals[macro.key]?.incomplete);
    const energies = macros.map(macro => (totals[macro.key]?.value ?? 0) * macro.factor), sum = energies.reduce((a, b) => a + b, 0);
    return <div key={name} className="rounded-xl border border-[#cdd9d3] bg-[#f9fdfb] p-3 shadow-sm"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="min-w-0 truncate text-base font-bold text-[var(--brand)]">🍱 {name}</h3><div className="shrink-0 text-right"><span className="text-2xl font-extrabold text-[#0c5f4d]">{metricText(energy)}</span> <span className="text-xs text-neutral-600">kcal{percentage !== null ? ` · ${percentage}%` : ""}</span></div></div>
      {complete && sum > 0 ? <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-neutral-200" title="Tỷ lệ năng lượng Đạm : Béo : Bột đường">{macros.map((macro, i) => <div key={macro.key} style={{width:`${energies[i] / sum * 100}%`,background:macro.color}}/>)}</div> : null}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-800">{macros.map(macro => <span key={macro.key} className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{background:macro.color}}/>{macro.label} <b className="text-neutral-950">{metricText(totals[macro.key])} g</b></span>)}{(totals.fiberG?.value ?? 0) > 0 ? <span>· Xơ {metricText(totals.fiberG)} g</span> : null}{(totals.sodiumMg?.value ?? 0) > 0 ? <span>· Natri {metricText(totals.sodiumMg)} mg</span> : null}</div>
    </div>;
  })}</div>;
}
