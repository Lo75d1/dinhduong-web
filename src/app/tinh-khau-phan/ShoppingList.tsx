"use client";

import type { Row } from "./types";

// Bảng đi chợ / xuất kho: gộp thực phẩm trong khẩu phần, quy lượng sống sạch (ăn
// được) sang lượng MUA / XUẤT KHO theo tỷ lệ thải bỏ. Thiếu tỷ lệ thì để "—"
// (không đoán). Dùng chung cho 1 ngày và (khi cần) nhiều ngày.
export default function ShoppingList({ rows }: { rows: Row[] }) {
  const map = new Map<string, { foodName: string; edibleGrams: number; rawGrams: number | null; wastePercent: number | null }>();
  for (const row of rows) {
    if (!row.foodId) continue;
    const waste = typeof row.wastePercent === "number" && row.wastePercent >= 0 && row.wastePercent < 100 ? row.wastePercent : null;
    const key = `${row.foodId}|${waste ?? "unknown"}`;
    const cur = map.get(key) ?? { foodName: row.foodName, edibleGrams: 0, rawGrams: 0, wastePercent: waste };
    cur.edibleGrams += row.grams || 0;
    if (waste == null) cur.rawGrams = null;
    else if (cur.rawGrams != null) cur.rawGrams += (row.grams || 0) / (1 - waste / 100);
    map.set(key, cur);
  }
  const items = [...map.values()].sort((a, b) => b.edibleGrams - a.edibleGrams);
  const fmt = (n: number | null) => (n == null ? "—" : `${Math.round(n)} g`);
  if (!items.length) return <p className="text-sm text-neutral-600">Chưa có thực phẩm để lên danh sách đi chợ.</p>;
  const totalEdible = items.reduce((s, i) => s + i.edibleGrams, 0);
  return (
    <div className="overflow-x-auto rounded-lg border border-[#7f948d]">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-[#eef4f1] text-[#123c36]">
          <tr>
            <th className="px-3 py-2 text-left">Thực phẩm</th>
            <th className="px-3 py-2 text-right">Sống sạch (ăn được)</th>
            <th className="px-3 py-2 text-right">Mua / xuất kho</th>
            <th className="px-3 py-2 text-right">Thải bỏ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="border-t border-neutral-200">
              <td className="px-3 py-2 font-medium">{it.foodName || "(chưa đặt tên)"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(it.edibleGrams)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(it.rawGrams)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{it.wastePercent == null ? "—" : `${it.wastePercent}%`}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#123c36] bg-[#f7faf8] font-bold">
            <td className="px-3 py-2">TỔNG ({items.length} loại)</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmt(totalEdible)}</td>
            <td className="px-3 py-2 text-right">—</td>
            <td className="px-3 py-2" />
          </tr>
        </tfoot>
      </table>
      <p className="px-3 py-2 text-xs text-neutral-500">Mua/xuất kho = lượng sống sạch ÷ (1 − % thải bỏ). Thiếu tỷ lệ thải bỏ thì để “—”.</p>
    </div>
  );
}
