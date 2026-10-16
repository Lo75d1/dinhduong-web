"use client";
import { useEffect, useState } from "react";
import type { ClinicalContext } from "@/lib/nutrition-chat/clinical";
type Code = { id: string; code: string; name: string; targetGroup: string; diseaseGroup: string };
const control = "mt-1 w-full min-w-0 rounded border border-[#8fa99e] bg-white px-3 py-2 text-neutral-900";
export default function ClinicalContextControls({ value, disabled, onChange }: { value?: ClinicalContext; disabled: boolean; onChange: (value: ClinicalContext | undefined) => void }) {
  const [codes, setCodes] = useState<Code[]>([]), [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); void fetch("/api/diet-codes", { cache: "no-store", signal: controller.signal }).then(async response => { if (!response.ok) throw new Error("Chưa đọc được danh mục mã chế độ ăn."); return response.json(); }).then(data => { if (!Array.isArray(data.items)) throw new Error("Danh mục mã không hợp lệ."); setCodes(data.items); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chưa đọc được danh mục mã."); }); return () => controller.abort(); }, []);
  const update = (next: ClinicalContext) => onChange(next.conditions?.some(Boolean) || next.notes || next.targetGroup || next.dietCodeId ? next : undefined);
  const clearCode = (targetGroup: ClinicalContext["targetGroup"]) => { const next = { ...value, targetGroup }; delete next.dietCodeId; delete next.selection; update(next); };
  return <details className="space-y-3 border border-[#b1c8bd] p-3" open={Boolean(value?.dietCodeId || value?.conditions?.length || value?.notes)}>
    <summary className="cursor-pointer font-semibold">Bệnh lý và mã chế độ ăn (nếu có)</summary>
    <p className="text-sm text-neutral-700">Nhập tình trạng/chỉ định đã được cung cấp. Chọn mã không đồng nghĩa với đã được duyệt chuyên môn.</p>
    <label className="block text-sm">Tình trạng đã cung cấp · mỗi dòng một ý<textarea rows={2} maxLength={2000} disabled={disabled} value={value?.conditions?.join("\n") || ""} onChange={event => update({ ...value, conditions: event.target.value.split("\n") })} onBlur={() => update({ ...value, conditions: value?.conditions?.map(item => item.trim()).filter(Boolean) })} className={control} /></label>
    <label className="block text-sm">Giai đoạn, điều trị hoặc chỉ định liên quan<textarea rows={2} maxLength={1500} disabled={disabled} value={value?.notes || ""} onChange={event => update({ ...value, notes: event.target.value })} className={control} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Đối tượng<select disabled={disabled} value={value?.targetGroup || ""} onChange={event => clearCode(event.target.value ? event.target.value as ClinicalContext["targetGroup"] : undefined)} className={control}><option value="">Chưa xác nhận</option><option value="NguoiLon">Người lớn</option><option value="TreEm">Trẻ em</option></select></label>
      <label className="text-sm">Mã chế độ ăn<select disabled={disabled} value={value?.dietCodeId || ""} onChange={event => { const selected = codes.find(code => code.id === event.target.value); if (!selected) clearCode(value?.targetGroup); else update({ ...value, targetGroup: selected.targetGroup as ClinicalContext["targetGroup"], dietCodeId: selected.id, selection: "proposed" }); }} className={control}><option value="">Không chọn mã</option>{codes.filter(code => !value?.targetGroup || code.targetGroup === value.targetGroup).map(code => <option key={code.id} value={code.id}>{code.code} · {code.name}</option>)}</select></label></div>
    {value?.dietCodeId ? <label className="block text-sm">Trạng thái chọn mã<select disabled={disabled} value={value.selection || "proposed"} onChange={event => update({ ...value, selection: event.target.value as ClinicalContext["selection"] })} className={control}><option value="proposed">Đang đề xuất, chưa chốt</option><option value="user_confirmed">Tôi chọn/xác nhận mã này</option><option value="prescribed">Tôi đã được chỉ định mã này</option></select></label> : null}
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
  </details>;
}
