"use client";

import { useMemo, useState } from "react";
import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import type { ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { aiFilled, displayNumber } from "@/lib/nutrition-chat/presentation";
import { resolvedAmountText, resolvedDetailLines } from "./resolved-ration-detail";
import NutrientFieldPicker, { DETAIL_NUTRIENT_KEYS } from "./NutrientFieldPicker";

/** RationDetail's normalized source adapter. This table uses the same native
 * food/dish/meal/day layout without fetching or recomputing source conversions. */
export default function ResolvedRationDetail({ menu, dayId }: { menu: ResolvedMenu; dayId: string }) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DETAIL_NUTRIENT_KEYS);
  const fields = ALL_NUTRIENT_FIELDS.filter(field => field.key !== "energyKcal" && selectedKeys.includes(field.key));
  const keys = useMemo(() => ["energyKcal", ...selectedKeys], [selectedKeys]);
  const lines = useMemo(() => resolvedDetailLines(menu, dayId, keys), [menu, dayId, keys]);
  if (!lines.length) return null;
  const allFields = [{ key: "energyKcal", label: "Năng lượng", unit: "kcal" }, ...fields];
  const foodRows = menu.days.find(day => day.id === dayId)?.rows ?? [];
  return <section className="flex flex-col gap-4" aria-label="Báo cáo chi tiết khẩu phần">
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-neutral-800">Dinh dưỡng khẩu phần chi tiết</h2><p className="mt-1 text-xs text-neutral-700">Bữa → Món → Thực phẩm. Lượng dùng tính giữ đúng cơ sở 100 g hoặc 100 ml của nguồn. Dòng vàng = tổng món · xanh nhạt = tổng bữa · xanh đậm = tổng ngày.</p><p className="mt-1 text-xs text-neutral-700">— chưa có dữ liệu · ≥ tổng phần đã biết · * số AI tự điền. Đổi đơn vị và quy đổi sống/chín đã được hệ thống tính theo nguồn đã cung cấp.</p></div>
        <NutrientFieldPicker selectedKeys={selectedKeys} onChange={setSelectedKeys} />
      </div>
      <p className="mt-3 text-xs text-neutral-600">Đang hiện {allFields.length}/{ALL_NUTRIENT_FIELDS.length} chỉ tiêu. Vuốt hoặc cuộn ngang để xem các cột bên phải.</p><div className="mt-2 max-w-full overflow-x-auto"><table data-nutrient-detail-table className="w-max min-w-full text-sm [&_th]:min-w-28 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-2 py-2">Bữa</th><th className="px-2 py-2">Món</th><th className="px-2 py-2">Thực phẩm</th><th className="px-2 py-2 text-right">Lượng nhập × suất</th><th className="px-2 py-2 text-right">Lượng dùng tính</th>{allFields.map(field => <th key={field.key} data-nutrient-key={field.key} className="px-2 py-2 text-right">{field.label} ({field.unit})</th>)}<th className="px-2 py-2">Nguồn</th></tr></thead><tbody>{lines.map((line, index) => {
        const food = line.kind === "food" ? line.rows[0] : null, previous = lines[index - 1];
        const sameMeal = food && previous?.meal === line.meal && previous.kind !== "meal";
        const sameDish = sameMeal && previous?.dish === line.dish && previous.kind === "food";
        return <tr key={line.key} className={line.kind === "dish" ? "bg-amber-50" : line.kind === "meal" ? "bg-sky-50" : line.kind === "day" ? "bg-sky-800 text-white font-semibold" : "border-b border-neutral-100"}>
          {food ? <><td className="align-top px-2 py-2 font-semibold">{sameMeal ? "" : line.meal}</td><td className="align-top px-2 py-2 font-semibold">{sameDish ? "" : line.dish || "Chưa đặt món"}</td><td className="px-2 py-2 font-medium">{line.label}</td><td className="px-2 py-2 text-right tabular-nums">{displayNumber(food.quantity, aiFilled(food, "quantity"))} {food.unit} × {displayNumber(food.servings, aiFilled(food, "servings"))}</td></> : <td colSpan={4} className="px-2 py-2 font-semibold">{line.label}</td>}
          <td className="px-2 py-2 text-right tabular-nums">{resolvedAmountText(line.rows)}</td>{allFields.map(field => { const metric = line.values[field.key]; return <td key={field.key} className="px-2 py-2 text-right tabular-nums">{metric?.value == null ? "—" : `${metric.incomplete ? "≥ " : ""}${displayNumber(metric.value)}`}</td>; })}<td className="px-2 py-2 text-xs">{food?.food.source.label || ""}{food && !food.food.source.confirmed ? " · chưa xác nhận" : ""}</td>
        </tr>;
      })}</tbody></table></div>
    </div>
    <details className="rounded-lg border border-neutral-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-neutral-800">🔍 Dữ liệu gốc thực phẩm (100 g / 100 ml)</summary><div className="mt-3 overflow-x-auto"><table className="w-max min-w-full text-sm [&_th]:min-w-28 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-2 py-2">Thực phẩm nguồn</th><th className="px-2 py-2">Cơ sở</th><th className="px-2 py-2">Nguồn</th>{allFields.map(field => <th key={field.key} className="px-2 py-2 text-right">{field.label} ({field.unit})</th>)}</tr></thead><tbody>{foodRows.map(row => {
      let url: string | null = null;
      try { const candidate = new URL(row.food.source.url ?? ""); if (candidate.protocol === "https:" && !candidate.username && !candidate.password) url = candidate.href; } catch { /* Không có URL nguồn hợp lệ. */ }
      return <tr key={row.id} className="border-b border-neutral-100"><td className="px-2 py-2">{row.food.name}{row.actualFoodName ? <p className="text-xs text-neutral-600">Ước tính cho: {row.actualFoodName}</p> : null}</td><td className="px-2 py-2">100 {row.food.unit}</td><td className="px-2 py-2">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{row.food.source.label || "Xem nguồn"}</a> : row.food.source.label || "—"}</td>{allFields.map(field => <td key={field.key} className="px-2 py-2 text-right">{displayNumber(row.food.nutrients[field.key])}</td>)}</tr>;
    })}</tbody></table></div><p className="mt-3 break-all text-xs text-neutral-600">Phiên bản dữ liệu: {menu.dataVersion} · Thời điểm tính: {new Date(menu.generatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></details>
  </section>;
}
