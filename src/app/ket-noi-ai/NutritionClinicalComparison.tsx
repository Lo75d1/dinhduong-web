import type { ClinicalAssessment } from "@/lib/nutrition-chat/clinical";
import { CLINICAL_TARGET_LABELS, DIET_STATUS_LABELS, dietRangeText } from "@/lib/nutrition-chat/clinical";

const number = (value: number | null) => value === null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
export default function NutritionClinicalComparison({ assessment }: { assessment: ClinicalAssessment }) {
  const { context, diet } = assessment;
  return <section className="space-y-3 border border-[var(--line)] bg-white p-4" aria-label="Chế độ ăn bệnh lý đã chọn">
    <h3 className="text-xl font-semibold">Chế độ ăn bệnh lý</h3>
    {context.conditions?.length ? <p className="text-sm"><strong>Tình trạng đã cung cấp:</strong> {context.conditions.join("; ")}</p> : null}
    {context.notes ? <p className="whitespace-pre-wrap text-sm"><strong>Thông tin/chỉ định đã cung cấp:</strong> {context.notes}</p> : null}
    {diet ? <>
      <p className="font-semibold">{diet.code} — {diet.name}</p>
      <p className="text-sm">{CLINICAL_TARGET_LABELS[diet.targetGroup] || diet.targetGroup} · {diet.diseaseGroup} · {context.selection === "proposed" ? "Mã đang đề xuất, chưa chốt" : context.selection === "prescribed" ? "Chỉ định do người dùng cung cấp" : "Người dùng chọn/xác nhận"}</p>
      <div className="hidden overflow-x-auto md:block print:block"><table className="w-full border-collapse text-sm"><thead><tr>{["Chỉ tiêu", "TB/ngày có đầu vào", "Khoảng tham khảo/ngày", "Đối chiếu", "Ngày trong khoảng / đủ cơ sở"].map(label => <th key={label} className="border border-neutral-300 p-2 text-left">{label}</th>)}</tr></thead><tbody>{assessment.metrics.map(row => <tr key={row.key}><td className="border border-neutral-300 p-2">{row.label}</td><td className="border border-neutral-300 p-2 tabular-nums">{number(row.average)} {row.unit}{row.estimated ? " (ước tính)" : ""}</td><td className="border border-neutral-300 p-2">{dietRangeText(row)}</td><td className="border border-neutral-300 p-2">{DIET_STATUS_LABELS[row.status]}</td><td className="border border-neutral-300 p-2 tabular-nums">{row.withinDays}/{row.assessedDays}</td></tr>)}</tbody></table></div>
      <div className="space-y-2 md:hidden print:hidden">{assessment.metrics.map(row => <div key={row.key} className="border-t border-neutral-200 pt-2 text-sm"><p className="font-semibold">{row.label}: {number(row.average)} {row.unit}/ngày{row.estimated ? " (ước tính)" : ""}</p><p>Tham khảo: {dietRangeText(row)}/ngày · {DIET_STATUS_LABELS[row.status]}</p><p>{row.withinDays}/{row.assessedDays} ngày trong khoảng/đủ cơ sở.</p></div>)}</div>
      <details className="border-t border-neutral-200 pt-3"><summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-[var(--brand)]">Ghi chú và nguồn của mã chế độ ăn</summary>{diet.note ? <p className="mt-2 whitespace-pre-wrap text-sm">{diet.note}</p> : <p className="mt-2 text-sm">Kho chưa có ghi chú cho mã này.</p>}{diet.qualityWarnings.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{diet.qualityWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : null}<a href={diet.source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline">{diet.source.label}</a></details>
    </> : <p className="text-sm">Chưa chọn mã; chưa đối chiếu bệnh lý.</p>}
    <p className="text-sm text-neutral-700">{assessment.notice}</p>
  </section>;
}
