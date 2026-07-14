"use client";

import { useMemo } from "react";
import { aggregateExchangeGroups } from "./exchange-units";
import type { Row } from "./types";

const round = (value: number) => Math.round(value * 10) / 10;

export default function ExchangeUnits({ rows }: { rows: Row[] }) {
  const groups = useMemo(() => aggregateExchangeGroups(rows), [rows]);
  const totalGrams = groups.reduce((sum, group) => sum + group.grams, 0);
  if (!groups.length) return null;

  return <section className="rounded-lg border border-neutral-200 bg-white p-4" aria-label="Quy đổi đơn vị ăn và nhóm thực phẩm">
    <div className="border-b border-neutral-200 pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">THỰC ĐƠN TRAO ĐỔI</p><h2 className="mt-1 text-lg font-semibold text-neutral-900">Quy đổi đơn vị ăn / nhóm thực phẩm</h2><p className="mt-1 text-sm text-neutral-700">Lương thực theo glucid; thịt/cá/trứng/hạt theo đạm; dầu mỡ theo béo; rau quả và sữa theo khối lượng.</p></div>
    <div className="mt-3 overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead className="border-y border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-800"><tr><th className="px-2 py-2">Nhóm thực phẩm</th><th className="px-2 py-2 text-right">g</th><th className="px-2 py-2 text-right">% KL</th><th className="px-2 py-2 text-right">Kcal</th><th className="px-2 py-2 text-right">Đạm</th><th className="px-2 py-2 text-right">Béo</th><th className="px-2 py-2 text-right">Bột đường</th><th className="px-2 py-2 text-right">Đơn vị ăn</th><th className="px-2 py-2">Cách tính</th></tr></thead><tbody>{groups.map((group) => <tr key={group.group} className="border-b border-neutral-100"><td className="px-2 py-2 font-medium">{group.group}</td><td className="px-2 py-2 text-right">{round(group.grams)}</td><td className="px-2 py-2 text-right">{totalGrams ? `${round((group.grams / totalGrams) * 100)}%` : "—"}</td><td className="px-2 py-2 text-right">{round(group.kcal)}</td><td className="px-2 py-2 text-right">{round(group.protein)}</td><td className="px-2 py-2 text-right">{round(group.lipid)}</td><td className="px-2 py-2 text-right">{round(group.glucid)}</td><td className="px-2 py-2 text-right font-semibold text-emerald-700">{group.units === null ? "—" : `${round(group.units)} ĐV`}</td><td className="px-2 py-2 text-xs text-neutral-800">{group.rule.unitText}</td></tr>)}</tbody></table></div>
    <p className="mt-3 text-xs text-neutral-700">Gia vị không tính đơn vị ăn. Nhóm “Chưa phân nhóm” được giữ lại để rà soát, không tự quy đổi.</p>
  </section>;
}
