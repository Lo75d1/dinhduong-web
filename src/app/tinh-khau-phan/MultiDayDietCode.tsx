"use client";

import { useEffect, useMemo, useState } from "react";
import { dayMealsOrdered, type MenuDay } from "./multi-day";

// Đối chiếu MÃ CHẾ ĐỘ ĂN bệnh lý cho chế độ nhiều ngày: chọn 1 mã (lọc 2 tầng như
// chế độ một ngày) rồi so TRUNG BÌNH/NGÀY toàn kỳ với khoảng của mã, kèm đếm số
// ngày lệch khoảng năng lượng và số ngày đúng số bữa. Chỉ tính trên ngày có thực
// phẩm; thiếu dữ liệu để "—", không suy đoán.

type DietCode = {
  id: string;
  code: string;
  targetGroup: string;
  diseaseGroup: string;
  name: string;
  energyMinKcal: number | null;
  energyMaxKcal: number | null;
  proteinMinG: number | null;
  proteinMaxG: number | null;
  lipidMinG: number | null;
  lipidMaxG: number | null;
  glucidMinG: number | null;
  glucidMaxG: number | null;
  sodiumMinMg: number | null;
  sodiumMaxMg: number | null;
  potassiumMinMg: number | null;
  potassiumMaxMg: number | null;
  mealsMin: number | null;
  mealsMax: number | null;
  note: string | null;
};

const LS_KEY = "khauphan_menu_dietcode_v1";
const TARGET_LABEL: Record<string, string> = { TreEm: "Trẻ em", NguoiLon: "Người lớn" };
const INK = "#0C447C";

function round(n: number, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
function showRange(min: number | null, max: number | null, unit: string): string {
  if (min === null && max === null) return "–";
  if (min === max) return `${round(min!)} ${unit}`;
  if (min === null) return `≤ ${round(max!)} ${unit}`;
  if (max === null) return `≥ ${round(min!)} ${unit}`;
  return `${round(min)}–${round(max)} ${unit}`;
}
function inRange(actual: number, min: number | null, max: number | null): boolean | null {
  if (min === null && max === null) return null;
  if (min !== null && actual < min) return false;
  if (max !== null && actual > max) return false;
  return true;
}

const NUTRIENT_KEYS = ["energyKcal", "proteinG", "lipidG", "glucidG", "sodiumMg", "potassiumMg"] as const;
type NutrientKey = (typeof NUTRIENT_KEYS)[number];

type DayTotals = { totals: Record<NutrientKey, number>; mealCount: number; hasFood: boolean };

function dayTotals(day: MenuDay): DayTotals {
  const totals = { energyKcal: 0, proteinG: 0, lipidG: 0, glucidG: 0, sodiumMg: 0, potassiumMg: 0 } as Record<NutrientKey, number>;
  let hasFood = false;
  for (const row of day.rows) {
    if (!row.foodId) continue;
    hasFood = true;
    const factor = (row.grams || 0) / 100;
    for (const key of NUTRIENT_KEYS) {
      const value = row.nutrients?.[key];
      if (typeof value === "number" && Number.isFinite(value)) totals[key] += value * factor;
    }
  }
  const mealCount = dayMealsOrdered(day).filter((meal) => meal.dishes.some((dish) => dish.rows.length > 0)).length;
  return { totals, mealCount, hasFood };
}

export default function MultiDayDietCode({ days }: { days: MenuDay[] }) {
  const [codes, setCodes] = useState<DietCode[]>([]);
  const [targetFilter, setTargetFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return window.localStorage.getItem(LS_KEY) ?? ""; } catch { return ""; }
  });

  useEffect(() => {
    fetch("/api/diet-codes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCodes(d.items ?? []))
      .catch(() => setCodes([]));
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(LS_KEY, selectedId); } catch { /* localStorage bị chặn */ }
  }, [selectedId]);

  const perDay = useMemo(() => days.map(dayTotals), [days]);
  const dataDays = perDay.filter((d) => d.hasFood);
  const dataCount = dataDays.length;

  // Trung bình/ngày trên các ngày có thực phẩm.
  const averages = useMemo(() => {
    const avg = { energyKcal: 0, proteinG: 0, lipidG: 0, glucidG: 0, sodiumMg: 0, potassiumMg: 0 } as Record<NutrientKey, number>;
    if (!dataCount) return avg;
    for (const key of NUTRIENT_KEYS) avg[key] = dataDays.reduce((s, d) => s + d.totals[key], 0) / dataCount;
    return avg;
  }, [dataDays, dataCount]);
  const avgMealCount = dataCount ? dataDays.reduce((s, d) => s + d.mealCount, 0) / dataCount : 0;

  const diseaseGroups = Array.from(
    new Set(codes.filter((c) => !targetFilter || c.targetGroup === targetFilter).map((c) => c.diseaseGroup))
  ).sort();
  const filtered = codes.filter(
    (c) => (!targetFilter || c.targetGroup === targetFilter) && (!diseaseFilter || c.diseaseGroup === diseaseFilter)
  );
  const selected = codes.find((c) => c.id === selectedId) ?? null;

  const rows = selected
    ? [
        { label: "Năng lượng", key: "energyKcal" as NutrientKey, min: selected.energyMinKcal, max: selected.energyMaxKcal, unit: "kcal" },
        { label: "Đạm", key: "proteinG" as NutrientKey, min: selected.proteinMinG, max: selected.proteinMaxG, unit: "g" },
        { label: "Béo", key: "lipidG" as NutrientKey, min: selected.lipidMinG, max: selected.lipidMaxG, unit: "g" },
        { label: "Bột đường", key: "glucidG" as NutrientKey, min: selected.glucidMinG, max: selected.glucidMaxG, unit: "g" },
        { label: "Natri", key: "sodiumMg" as NutrientKey, min: selected.sodiumMinMg, max: selected.sodiumMaxMg, unit: "mg" },
        { label: "Kali", key: "potassiumMg" as NutrientKey, min: selected.potassiumMinMg, max: selected.potassiumMaxMg, unit: "mg" },
      ]
    : [];

  // Số ngày (có dữ liệu) nằm trong khoảng năng lượng của mã, và đúng số bữa.
  const energyDaysInRange = selected
    ? dataDays.filter((d) => inRange(d.totals.energyKcal, selected.energyMinKcal, selected.energyMaxKcal) === true).length
    : 0;
  const energyHasRange = !!selected && (selected.energyMinKcal !== null || selected.energyMaxKcal !== null);
  const mealDaysInRange = selected
    ? dataDays.filter((d) => inRange(d.mealCount, selected.mealsMin, selected.mealsMax) === true).length
    : 0;
  const mealHasRange = !!selected && (selected.mealsMin !== null || selected.mealsMax !== null);

  return (
    <div className="mt-3 rounded-xl border-2 border-[#B5D4F4] bg-white p-3 sm:p-4" aria-label="Đối chiếu mã chế độ ăn nhiều ngày">
      <h3 className="text-sm font-semibold" style={{ color: INK }}>Đối chiếu mã chế độ ăn bệnh lý — trung bình mỗi ngày</h3>
      <p className="mt-0.5 text-xs text-neutral-500">
        Chọn 1 mã (246 mã, Bộ Y tế) rồi so <b>trung bình/ngày toàn kỳ</b> với khoảng của mã. Chỉ tính trên ngày có thực phẩm ({dataCount}/{days.length} ngày).
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={targetFilter} onChange={(e) => { setTargetFilter(e.target.value); setDiseaseFilter(""); }} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Tất cả đối tượng</option>
          <option value="TreEm">Trẻ em</option>
          <option value="NguoiLon">Người lớn</option>
        </select>
        <select value={diseaseFilter} onChange={(e) => setDiseaseFilter(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Tất cả nhóm bệnh</option>
          {diseaseGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">— Chọn mã chế độ ăn —</option>
          {filtered.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select>
      </div>

      {!selected ? (
        <p className="mt-3 text-xs text-neutral-500">Chọn một mã để đối chiếu.</p>
      ) : dataCount === 0 ? (
        <p className="mt-3 text-xs text-amber-700">Chưa có ngày nào có thực phẩm để đối chiếu.</p>
      ) : (
        <>
          <div className="mt-4 rounded-md bg-[#F4F9FE] p-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium" style={{ color: INK }}>{selected.code}</span>
              <span className="text-neutral-500">{selected.name}</span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Đối tượng: {TARGET_LABEL[selected.targetGroup] ?? selected.targetGroup} · Nhóm bệnh: {selected.diseaseGroup} · Số bữa: {showRange(selected.mealsMin, selected.mealsMax, "bữa")}
            </div>
            {selected.note && <div className="mt-1 text-xs text-neutral-500">Ghi chú: {selected.note}</div>}
          </div>

          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-neutral-400">
              <tr>
                <th className="py-1 font-medium">Chỉ số</th>
                <th className="py-1 text-right font-medium">TB/ngày</th>
                <th className="py-1 text-right font-medium">Khoảng của mã</th>
                <th className="py-1 text-right font-medium">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const actual = averages[r.key];
                const ok = inRange(actual, r.min, r.max);
                return (
                  <tr key={r.label} className="border-t border-neutral-100">
                    <td className="py-1.5">{r.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{round(actual)} {r.unit}</td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-400">{showRange(r.min, r.max, r.unit)}</td>
                    <td className="py-1.5 text-right">
                      {ok === null ? "–" : ok ? (
                        <span className="text-xs font-medium text-emerald-700">● Trong khoảng</span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">▲ {r.min !== null && actual < r.min ? "Thấp" : "Cao"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-md border border-neutral-200 px-3 py-2">
              <span className="text-neutral-500">Ngày trong khoảng năng lượng của mã: </span>
              <b style={{ color: INK }}>{energyHasRange ? `${energyDaysInRange}/${dataCount} ngày` : "mã không giới hạn"}</b>
            </div>
            <div className="rounded-md border border-neutral-200 px-3 py-2">
              <span className="text-neutral-500">Số bữa TB/ngày: </span>
              <b style={{ color: INK }}>{round(avgMealCount)}</b>
              {mealHasRange && <span className="text-neutral-500"> · đúng số bữa {mealDaysInRange}/{dataCount} ngày (mã: {showRange(selected.mealsMin, selected.mealsMax, "bữa")})</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
