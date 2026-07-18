"use client";

import { useEffect, useMemo, useState } from "react";
import { ALL_NUTRIENT_FIELDS, NUTRIENT_GROUPS, type NutrientField } from "@/lib/nutrient-fields";
import { aggregateIngredients, buildDetailRows, buildReportLines, type FoodReportValues } from "./ration-detail";
import type { RationMode, Row } from "./types";

const DEFAULT_FIELDS = ["proteinG", "lipidG", "glucidG", "fiberG"];
const round = (value: number) => Math.round(value * 10) / 10;
const grams = (value: number | null) => (value === null ? "—" : `${round(value)} g`);

function formatValue(value: { total: number; incomplete: boolean } | undefined, unit: string) {
  if (!value) return "—";
  return `${value.incomplete ? "≥ " : ""}${round(value.total)} ${unit}`;
}

export default function RationDetail({ rows, mode }: { rows: Row[]; mode: RationMode }) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_FIELDS);
  const [reportValues, setReportValues] = useState<FoodReportValues>({});
  const foodRows = rows.filter((row) => row.foodId);
  const idsKey = foodRows.map((row) => row.foodId).sort().join(",");
  const fields = useMemo<NutrientField[]>(
    () => ALL_NUTRIENT_FIELDS.filter((field) => field.key !== "energyKcal" && selectedKeys.includes(field.key)),
    [selectedKeys]
  );
  const reportFields = useMemo<NutrientField[]>(() => [{ key: "energyKcal", label: "Năng lượng", unit: "kcal" }, ...fields], [fields]);
  const fieldsKey = fields.map((field) => field.key).join(",");

  useEffect(() => {
    if (!idsKey || !fieldsKey) return;
    let cancelled = false;
    fetch("/api/foods/report-nutrients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsKey.split(","), fields: fieldsKey.split(",") }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const next: FoodReportValues = {};
        for (const item of data.items ?? []) {
          const values: Record<string, number | null> = {};
          for (const field of fields) values[field.key] = typeof item[field.key] === "number" ? item[field.key] : null;
          next[item.id] = { source: item.source ?? "CSDL", values };
        }
        setReportValues(next);
      })
      .catch(() => !cancelled && setReportValues({}));
    return () => {
      cancelled = true;
    };
  }, [idsKey, fieldsKey, fields]);

  const reportLines = useMemo(() => buildReportLines(rows, reportFields, reportValues), [rows, reportFields, reportValues]);
  const mergedCells = useMemo(() => {
    const mealStarts = new Map<string, number>();
    const dishStarts = new Map<string, number>();
    for (let index = 0; index < reportLines.length; index++) {
      const line = reportLines[index];
      if (line.kind !== "food") continue;
      const previous = reportLines[index - 1];
      if (!previous || previous.meal !== line.meal) mealStarts.set(line.key, index);
      if (!previous || previous.meal !== line.meal || previous.dish !== line.dish) dishStarts.set(line.key, index);
    }
    const mealSpans = new Map<string, number>();
    const dishSpans = new Map<string, number>();
    for (const [key, start] of mealStarts) {
      let end = start;
      while (end < reportLines.length && reportLines[end].kind !== "meal" && reportLines[end].kind !== "day") end++;
      mealSpans.set(key, end - start);
    }
    for (const [key, start] of dishStarts) {
      let end = start;
      while (end < reportLines.length && reportLines[end].kind !== "dish") end++;
      dishSpans.set(key, end - start + 1);
    }
    return { mealSpans, dishSpans };
  }, [reportLines]);
  const ingredients = useMemo(() => aggregateIngredients(buildDetailRows(rows)), [rows]);
  const massLabel = "g sống sạch dùng tính";
  const displayMass = (line: { edibleGrams: number }) => grams(line.edibleGrams);
  if (!foodRows.length) return null;

  function toggleField(key: string) {
    setSelectedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Báo cáo chi tiết khẩu phần">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800">Dinh dưỡng khẩu phần chi tiết</h2>
            <p className="mt-1 text-xs text-neutral-700">{mode === "menu" ? "Chế độ Lập thực đơn: hiển thị gram sống sạch dùng để lập món và tính dinh dưỡng." : "Chế độ Khẩu phần 24 giờ: lượng đã ăn được đổi bằng hệ số về gram sống sạch trước khi tính dinh dưỡng."} Dữ liệu VDD/RNI được áp dụng trên 100 g phần ăn được ở trạng thái sống sạch.</p>
            <p className="mt-1 text-xs text-neutral-700">Dòng vàng = tổng món · xanh nhạt = tổng bữa · xanh đậm = tổng cả ngày. Dấu ≥ cho biết còn thực phẩm thiếu số liệu chất đó.</p>
          </div>
          <details className="rounded-md border border-neutral-300 bg-white text-sm">
            <summary className="cursor-pointer px-3 py-1.5 font-medium text-neutral-700">⚙ Chọn chất ({fields.length})</summary>
            <div className="max-h-80 w-80 overflow-auto border-t border-neutral-200 p-3">
              {NUTRIENT_GROUPS.map((group) => (
                <fieldset key={group.title} className="mb-3">
                  <legend className="mb-1 text-xs font-semibold text-neutral-600">{group.title}</legend>
                  <div className="grid gap-1">
                    {group.fields.filter((field) => field.key !== "energyKcal").map((field) => (
                      <label key={field.key} className="flex items-center gap-2 text-xs text-neutral-700">
                        <input type="checkbox" checked={selectedKeys.includes(field.key)} onChange={() => toggleField(field.key)} />
                        {field.label} ({field.unit})
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </details>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[1020px] w-full table-fixed text-sm">
            <thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="w-[9%] px-2 py-2 font-medium">Bữa</th><th className="w-[16%] px-2 py-2 font-medium">Món</th><th className="w-[30%] px-2 py-2 font-medium">Thực phẩm</th>
                <th className="px-2 py-2 text-right font-medium">{massLabel}</th><th className="px-2 py-2 text-right font-medium">Kcal</th>
                {fields.map((field) => <th key={field.key} className="px-2 py-2 text-right font-medium">{field.label} ({field.unit})</th>)}
              </tr>
            </thead>
            <tbody>
              {reportLines.map((line) => {
                const style = line.kind === "dish" ? "bg-amber-50" : line.kind === "meal" ? "bg-sky-50" : line.kind === "day" ? "bg-sky-800 text-white font-semibold" : "border-b border-neutral-100";
                if (line.kind === "meal" || line.kind === "day") return <tr key={line.key} className={style}><td colSpan={3} className="px-3 py-2 font-semibold">{line.foodName}</td><td className="px-2 py-2 text-right tabular-nums">{displayMass(line)}</td><td className="px-2 py-2 text-right tabular-nums">{formatValue(line.values.energyKcal, "kcal")}</td>{fields.map((field) => <td key={field.key} className="px-2 py-2 text-right tabular-nums">{formatValue(line.values[field.key], field.unit)}</td>)}</tr>;
                if (line.kind === "dish") return <tr key={line.key} className={style}><td className="px-3 py-2 font-semibold" colSpan={3}>{line.foodName}</td><td className="px-2 py-2 text-right tabular-nums">{displayMass(line)}</td><td className="px-2 py-2 text-right tabular-nums">{formatValue(line.values.energyKcal, "kcal")}</td>{fields.map((field) => <td key={field.key} className="px-2 py-2 text-right tabular-nums">{formatValue(line.values[field.key], field.unit)}</td>)}</tr>;
                const mealSpan = mergedCells.mealSpans.get(line.key);
                const dishSpan = mergedCells.dishSpans.get(line.key);
                return <tr key={line.key} className={style}>
                  {mealSpan && <td rowSpan={mealSpan} className="align-top bg-[#edf4f0] px-2 py-3 font-semibold text-[#123c36]">{line.meal}</td>}
                  {dishSpan && <td rowSpan={dishSpan} className="align-top bg-[#f8f4e8] px-2 py-3 font-semibold text-neutral-950">{line.dish || "(Chưa đặt món)"}</td>}
                  <td className="px-2 py-2 font-medium">{line.foodName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{displayMass(line)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatValue(line.values.energyKcal, "kcal")}</td>
                  {fields.map((field) => <td key={field.key} className="px-2 py-2 text-right tabular-nums">{formatValue(line.values[field.key], field.unit)}</td>)}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-800">Quy đổi sống sạch → mua / xuất kho</h2>
        <p className="mt-1 text-xs text-neutral-700">Gộp mọi lần dùng cùng thực phẩm. Nếu chưa có tỷ lệ thải bỏ, hệ thống tạm quy đổi 1:1 và ghi rõ để người dùng kiểm tra lại.</p>
        <div className="mt-3 overflow-x-auto"><table className="min-w-[620px] w-full text-sm"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-700"><tr><th className="px-2 py-2 font-medium">Thực phẩm</th><th className="px-2 py-2 text-right font-medium">Sống sạch</th><th className="px-2 py-2 text-right font-medium">Thải bỏ</th><th className="px-2 py-2 text-right font-medium">Mua / xuất kho</th></tr></thead><tbody>{ingredients.map((item) => <tr key={item.key} className="border-b border-neutral-100"><td className="px-2 py-2 font-medium">{item.foodName}</td><td className="px-2 py-2 text-right">{grams(item.edibleGrams)}</td><td className="px-2 py-2 text-right text-neutral-700">{item.wastePercent === null ? "Chưa có · tạm 1:1" : `${item.wastePercent}%`}</td><td className="px-2 py-2 text-right">{grams(item.rawGrams)}</td></tr>)}</tbody></table></div>
      </div>

      <details className="rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-800">🔍 Dữ liệu gốc thực phẩm (trên 100g)</summary>
        <p className="mt-2 text-xs text-neutral-700">Bảng này là số liệu thô từ CSDL VDD/RNI. Kết quả khẩu phần = giá trị /100 g sống sạch × g sống sạch quy đổi /100.</p>
        <div className="mt-3 overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-2 py-2 font-medium">Thực phẩm</th><th className="px-2 py-2 font-medium">Nguồn</th><th className="px-2 py-2 text-right font-medium">Thải bỏ</th><th className="px-2 py-2 text-right font-medium">Năng lượng (kcal)</th>{fields.map((field) => <th key={field.key} className="px-2 py-2 text-right font-medium">{field.label} ({field.unit})</th>)}</tr></thead><tbody>{foodRows.map((row) => <tr key={row.uid} className="border-b border-neutral-100"><td className="px-2 py-2 font-medium">{row.foodName}</td><td className="px-2 py-2">{reportValues[row.foodId]?.source ?? "CSDL"}</td><td className="px-2 py-2 text-right">{row.wastePercent === null ? "—" : `${row.wastePercent}%`}</td><td className="px-2 py-2 text-right tabular-nums">{row.nutrients.energyKcal ?? "—"}</td>{fields.map((field) => <td key={field.key} className="px-2 py-2 text-right tabular-nums">{reportValues[row.foodId]?.values[field.key] ?? row.nutrients[field.key] ?? "—"}</td>)}</tr>)}</tbody></table></div>
      </details>
    </section>
  );
}
