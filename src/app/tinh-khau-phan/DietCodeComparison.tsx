"use client";

import { useEffect, useState } from "react";

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

const LS_KEY = "khauphan_dietcode_v1";
const TARGET_LABEL: Record<string, string> = { TreEm: "Trẻ em", NguoiLon: "Người lớn" };

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

export default function DietCodeComparison({ totals }: { totals: Record<string, number> }) {
  const [codes, setCodes] = useState<DietCode[]>([]);
  const [targetFilter, setTargetFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return window.localStorage.getItem(LS_KEY) ?? ""; } catch { return ""; }
  });

  useEffect(() => {
    fetch("/api/diet-codes")
      .then((r) => r.json())
      .then((d) => setCodes(d.items ?? []))
      .catch(() => setCodes([]));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, selectedId);
    } catch {
      // đầy/khóa localStorage — không chặn UI
    }
  }, [selectedId]);

  const diseaseGroups = Array.from(
    new Set(codes.filter((c) => !targetFilter || c.targetGroup === targetFilter).map((c) => c.diseaseGroup))
  ).sort();

  const filtered = codes.filter(
    (c) =>
      (!targetFilter || c.targetGroup === targetFilter) &&
      (!diseaseFilter || c.diseaseGroup === diseaseFilter)
  );

  const selected = codes.find((c) => c.id === selectedId) ?? null;

  const rows = selected
    ? [
        { label: "Năng lượng", actual: totals.energyKcal ?? 0, min: selected.energyMinKcal, max: selected.energyMaxKcal, unit: "kcal" },
        { label: "Đạm", actual: totals.proteinG ?? 0, min: selected.proteinMinG, max: selected.proteinMaxG, unit: "g" },
        { label: "Béo", actual: totals.lipidG ?? 0, min: selected.lipidMinG, max: selected.lipidMaxG, unit: "g" },
        { label: "Bột đường", actual: totals.glucidG ?? 0, min: selected.glucidMinG, max: selected.glucidMaxG, unit: "g" },
        { label: "Natri", actual: totals.sodiumMg ?? 0, min: selected.sodiumMinMg, max: selected.sodiumMaxMg, unit: "mg" },
        { label: "Kali", actual: totals.potassiumMg ?? 0, min: selected.potassiumMinMg, max: selected.potassiumMaxMg, unit: "mg" },
      ]
    : [];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-700">Đối chiếu mã chế độ ăn bệnh lý</h2>
      <p className="mt-0.5 text-xs text-neutral-400">
        Chọn thủ công theo chỉ định bệnh lý (246 mã, Bộ Y tế) — độc lập với đối chiếu tuổi/giới ở
        trên.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={targetFilter}
          onChange={(e) => {
            setTargetFilter(e.target.value);
            setDiseaseFilter("");
          }}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Tất cả đối tượng</option>
          <option value="TreEm">Trẻ em</option>
          <option value="NguoiLon">Người lớn</option>
        </select>
        <select
          value={diseaseFilter}
          onChange={(e) => setDiseaseFilter(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Tất cả nhóm bệnh</option>
          {diseaseGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">— Chọn mã chế độ ăn —</option>
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          <div className="mt-4 rounded-md bg-neutral-50 p-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium">{selected.code}</span>
              <span className="text-neutral-500">{selected.name}</span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Đối tượng: {TARGET_LABEL[selected.targetGroup] ?? selected.targetGroup} · Nhóm bệnh:{" "}
              {selected.diseaseGroup} · Số bữa: {showRange(selected.mealsMin, selected.mealsMax, "bữa")}
            </div>
            {selected.note && <div className="mt-1 text-xs text-neutral-500">Ghi chú: {selected.note}</div>}
            {selected.code.toUpperCase().includes("-X") && (
              <div className="mt-2 rounded border-l-2 border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                Hậu tố &quot;-X&quot;: dạng chế biến lỏng/mềm hoặc chia bữa (cháo, súp, sữa, cơm
                xay...) giúp dễ tiêu hóa.
              </div>
            )}
          </div>

          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-neutral-400">
              <tr>
                <th className="py-1 font-medium">Chỉ số</th>
                <th className="py-1 text-right font-medium">Thực tế</th>
                <th className="py-1 text-right font-medium">Khuyến nghị</th>
                <th className="py-1 text-right font-medium">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ok = inRange(r.actual, r.min, r.max);
                return (
                  <tr key={r.label} className="border-t border-neutral-100">
                    <td className="py-1.5">{r.label}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {round(r.actual)} {r.unit}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-400">
                      {showRange(r.min, r.max, r.unit)}
                    </td>
                    <td className="py-1.5 text-right">
                      {ok === null ? (
                        "–"
                      ) : ok ? (
                        <span className="text-xs font-medium text-emerald-700">● Trong khoảng</span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">
                          ▲ {r.min !== null && r.actual < r.min ? "Thấp" : "Cao"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
