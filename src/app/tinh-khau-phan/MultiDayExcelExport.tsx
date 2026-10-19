"use client";

import { useState } from "react";
import type { MenuDay } from "./multi-day";
import type { Profile } from "./PersonalProfile";
import type { NutritionReportContext } from "@/lib/nutrition-chat/workbook-context";
import { downloadNutritionExcel } from "./nutrition-excel-download";
import NutritionExcelExport from "./NutritionExcelExport";

export default function MultiDayExcelExport({ days, profile, reportContext }: { days: MenuDay[]; profile: Profile | null; reportContext?: NutritionReportContext }) {
  const [selectedId, setSelectedId] = useState("");
  const day = days.find(item => item.id === selectedId) ?? days[0];
  if (!day) return null;
  return <div className="flex w-full flex-wrap items-center gap-2 text-sm" aria-label="Xuất Excel thực đơn theo ngày" data-no-print>
    <NutritionExcelExport label="Excel cả kỳ · mỗi ngày một sheet" onExport={saveToAccount => downloadNutritionExcel(days, profile, { saveToAccount, reportContext })} />
    <label className="flex min-w-0 items-center gap-2">Ngày muốn gửi<select aria-label="Ngày xuất Excel" value={day.id} onChange={event => setSelectedId(event.target.value)} className="min-w-0 max-w-full rounded border border-neutral-400 bg-white px-2 py-2 text-neutral-950">{days.map(item => <option key={item.id} value={item.id}>{item.label}{item.date ? ` · ${item.date}` : ""}</option>)}</select></label>
    <NutritionExcelExport label="Excel riêng ngày này" onExport={saveToAccount => downloadNutritionExcel([day], profile, { saveToAccount, reportContext })} />
  </div>;
}
