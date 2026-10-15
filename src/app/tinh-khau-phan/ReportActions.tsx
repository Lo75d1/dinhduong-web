"use client";

import { useState } from "react";
import { loadMedicationRows, medicationTimingLabel } from "./medication-row";
import { downloadNutritionExcel } from "./nutrition-excel-download";
import type { Profile } from "./PersonalProfile";
import { mealOrder, type RationMode, type Row } from "./types";
export type ReportMeta = { subjectName: string; subjectGroup: string; clinicalCourse: string; authorName: string; authorRole: string; authorOrganization: string; reportDate: string; menuNote: string };
const ROLES = ["Bác sĩ", "Dinh dưỡng viên", "Huấn luyện viên / PT", "Phụ huynh / người chăm sóc", "Khác"];

export default function ReportActions({ rows, profile, meta, mode, onMetaChange }: { rows: Row[]; profile: Profile | null; meta: ReportMeta; mode: RationMode; onMetaChange: (next: ReportMeta) => void }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const update = (key: keyof ReportMeta, value: string) => onMetaChange({ ...meta, [key]: value });
  const downloadExcel = async () => {
    setExporting(true);
    setExportError("");
    try {
      const medications = loadMedicationRows().map(med => ({ meal: med.meal, name: med.name, dose: [med.dose, med.doseUnit].filter(Boolean).join(" "), timing: medicationTimingLabel(med.timing), note: med.note })).sort((a,b) => mealOrder(a.meal)-mealOrder(b.meal));
      await downloadNutritionExcel([{ id: "web-day-1", label: "Ngày 1", date: "", rows }], profile, { mode, meta, medications });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Chưa xuất được Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };
  return <div data-no-print className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setOpen(true)} className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36] hover:bg-emerald-50">Thiết lập / In PDF</button><button type="button" disabled={exporting} onClick={downloadExcel} className="rounded-md bg-[#123c36] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:bg-[#56736c]">{exporting ? "Đang tạo Excel đầy đủ…" : "Xuất Excel đầy đủ"}</button>{exportError && <p className="basis-full text-xs font-medium text-red-700">{exportError}</p>}{open && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><div className="mx-auto my-6 w-full max-w-2xl rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-neutral-950">Thiết lập phiếu đánh giá</h2><button type="button" onClick={() => setOpen(false)} className="text-xl text-neutral-900" aria-label="Đóng">×</button></div><p className="mt-1 text-sm text-neutral-800">Dùng được cho khám dinh dưỡng, tư vấn ăn uống, theo dõi tập luyện hoặc chăm sóc trẻ.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-neutral-900">Người được đánh giá<input value={meta.subjectName} onChange={(event) => update("subjectName", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900">Nhóm / mục tiêu<input value={meta.subjectGroup} onChange={(event) => update("subjectGroup", event.target.value)} placeholder="VD: trẻ em, tập tăng cơ..." className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900 sm:col-span-2">Diễn biến bệnh lý / ghi chú theo dõi<textarea value={meta.clinicalCourse} onChange={(event) => update("clinicalCourse", event.target.value)} placeholder="VD: đái tháo đường type 2, kiểm soát đường huyết; hoặc mục tiêu giảm mỡ..." rows={3} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><div className="sm:col-span-2 border-t-2 border-[#7f948d] pt-3"><p className="text-sm font-semibold text-neutral-950">Thông tin người lập</p></div><label className="text-sm font-semibold text-neutral-900">Họ tên người lập<input value={meta.authorName} onChange={(event) => update("authorName", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900">Vai trò<select value={meta.authorRole} onChange={(event) => update("authorRole", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal">{ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></label><label className="text-sm font-semibold text-neutral-900 sm:col-span-2">Đơn vị / cơ sở / phòng tập<input value={meta.authorOrganization} onChange={(event) => update("authorOrganization", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900 sm:col-span-2">Ngày lập<input type="date" value={meta.reportDate} onChange={(event) => update("reportDate", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-400 px-4 py-2 font-semibold text-neutral-900">Đóng</button><button type="button" onClick={() => { setOpen(false); window.print(); }} className="rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Mở bản in A4</button></div></div></div>}</div>;
}
