"use client";
import { useState } from "react";
import type { LibraryAnalysis } from "@/lib/menu-library/analysis";
import type { NutrientTotal } from "@/lib/nutrition-chat/contracts";

export type ReviewRecord = { id: string; revision: number; decision: string; reviewerName: string; note: string; createdAt: string; analysisDigest: string; analysis?: LibraryAnalysis };
const button = "min-h-11 rounded-md border border-[var(--control-line)] px-3 py-2 font-semibold disabled:opacity-50";
const format = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
function amount(total?: NutrientTotal) {
  if (!total || total.value === null) return "—";
  return `${format(total.value)}${total.incomplete ? " (phần đã biết)" : ""}`;
}

export function AnalysisReport({ analysis }: { analysis: LibraryAnalysis }) {
  return <div className="space-y-4">
    <p className="text-sm">Tính cho một suất của từng nhóm, theo định lượng nguồn. Tổng các chất chưa đủ dữ liệu chỉ là phần đã biết. Không suy hao sau nấu hay tính đi chợ.</p>
    {analysis.sections.map(section => <section key={`${section.dayId}-${section.groupId}`} className="min-w-0 rounded-md border border-[var(--line)] p-3">
      <h3 className="font-semibold">Ngày {section.dayIndex} · {section.groupLabel}</h3>
      <p className="mt-1">Mục tiêu thiết kế: <strong>{format(section.targetEnergyKcal)} kcal/ngày</strong> · {analysis.coverage === "full_day" ? "Cả ngày" : "Chỉ các bữa phục vụ"} · So với mục tiêu ngày: <strong>{format(section.energyPercent)}%</strong></p>
      {section.targetSource && <p className="text-sm text-neutral-600">{section.targetSource}</p>}
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={`Bảng phân tích ngày ${section.dayIndex}, ${section.groupLabel}`}><table className="w-full min-w-[540px] text-right text-sm"><caption className="sr-only">Thành phần dinh dưỡng theo bữa và tổng các bữa</caption><thead><tr className="border-b"><th className="p-2 text-left">Thành phần</th>{section.meals.map(meal => <th key={meal.id} className="p-2">{meal.label}</th>)}<th className="p-2">Tổng các bữa</th></tr></thead><tbody>{analysis.fields.map(field => <tr key={field.key} className="border-b border-[var(--line)]"><th scope="row" className="p-2 text-left font-normal">{field.label} ({field.unit})</th>{section.meals.map(meal => <td key={meal.id} className="p-2">{amount(meal.totals[field.key])}</td>)}<td className="p-2 font-semibold">{amount(section.totals[field.key])}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-sm">Tỷ lệ năng lượng đạm / béo / bột đường: <strong>{format(section.macroPercent.proteinG)}% / {format(section.macroPercent.lipidG)}% / {format(section.macroPercent.glucidG)}%</strong>. Chỉ hiện tỷ lệ khi đủ số liệu chất tương ứng và năng lượng.</p>
      {section.structureMissing && <p className="mt-2 text-red-800">Còn thiếu bữa, nhóm, món hoặc nguyên liệu; chưa thể duyệt.</p>}
      {!!section.missingInputs.length && <ul className="mt-2 list-disc pl-5 text-sm text-red-800">{section.missingInputs.map((item, index) => <li key={index}>{item.message}</li>)}</ul>}
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Dữ liệu thiếu và nguồn thành phần</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{analysis.fields.filter(field => section.totals[field.key].incomplete).map(field => <li key={field.key}>{field.label}: thiếu {section.totals[field.key].missingRows.map(id => { const row = section.ingredients.find(item => item.id === id); return row ? `${row.name} (${row.meal} · ${row.dish})` : id; }).join("; ")}.</li>)}</ul>
        {!!section.warnings.length && <ul className="mt-2 list-disc pl-5">{section.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
        <ul className="mt-2 space-y-1">{section.ingredients.map(row => <li key={row.id}>{row.meal} · {row.dish} · {row.name}: {format(row.quantity)} {row.unit} · {row.source}</li>)}</ul>
      </details>
    </section>)}
  </div>;
}

export default function TemplateReview({ id, revision, csrf, currentReview, reviews, onReviewed }: {
  id: string; revision: number; csrf: string; currentReview?: ReviewRecord | null; reviews: ReviewRecord[]; onReviewed: () => void;
}) {
  const [analysis, setAnalysis] = useState<LibraryAnalysis | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [note, setNote] = useState(""), [acknowledged, setAcknowledged] = useState(false);
  const [historical, setHistorical] = useState<ReviewRecord | null>(null);
  async function showHistory(reviewId: string) {
    setBusy(true); setError(""); setHistorical(null);
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}/review?reviewId=${encodeURIComponent(reviewId)}`, { cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Chưa đọc được lần duyệt.");
      setHistorical(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa đọc được lần duyệt."); }
    finally { setBusy(false); }
  }
  async function analyze() {
    setBusy(true); setError(""); setAnalysis(null); setAcknowledged(false);
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}/analysis`, { method: "POST", headers: { "Content-Type": "application/json", "x-menu-library-csrf": csrf }, body: JSON.stringify({ expectedRevision: revision }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Chưa phân tích được mẫu.");
      setAnalysis(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa phân tích được mẫu."); }
    finally { setBusy(false); }
  }
  async function review(decision: "approved" | "changes_requested") {
    if (!analysis) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}/review`, { method: "POST", headers: { "Content-Type": "application/json", "x-menu-library-csrf": csrf }, body: JSON.stringify({ expectedRevision: revision, decision, note, analysisDigest: analysis.digest, acknowledged }) });
      const result = await response.json(); if (!response.ok) { if (response.status === 409) { setAnalysis(null); setAcknowledged(false); } throw new Error(result.message ?? "Chưa ghi được kết quả duyệt."); }
      onReviewed();
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa ghi được kết quả duyệt."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Phân tích và duyệt mẫu" className="my-4 min-w-0 space-y-3 rounded-lg border border-[var(--line)] bg-white p-3 sm:p-4">
    <h2 className="text-xl font-semibold">Phân tích & duyệt · v{revision}</h2>
    <p role="status">{currentReview ? `${currentReview.decision === "approved" ? "Đã duyệt" : "Cần chỉnh sửa"} v${revision} · ${currentReview.reviewerName} · ${new Date(currentReview.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : "Chưa duyệt phiên bản này."}</p>
    {currentReview?.note && <p>Ghi chú: {currentReview.note}</p>}
    {currentReview?.analysis && <details><summary className="cursor-pointer font-semibold">Xem phân tích đã lưu khi duyệt</summary><AnalysisReport analysis={currentReview.analysis} /></details>}
    <button type="button" disabled={busy} className={button} onClick={() => void analyze()}>{busy ? "Đang xử lý…" : "Phân tích phiên bản đang xem"}</button>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {analysis && <><AnalysisReport analysis={analysis} />
      <label className="block font-semibold">Nhận xét / yêu cầu sửa<textarea maxLength={2000} value={note} onChange={event => setNote(event.target.value.replace(/[\r\n]+/g, " "))} className="mt-1 min-h-24 w-full rounded border border-[var(--control-line)] p-2 font-normal" /></label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>Tôi đã kiểm tra món, định lượng, kết quả phân tích và các chất thiếu dữ liệu. Kết quả duyệt không tự xác nhận phù hợp cho mọi người bệnh.</span></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !acknowledged || !analysis.canApprove} className={`${button} bg-[var(--ink)] text-white`} onClick={() => void review("approved")}>Duyệt phiên bản v{revision}</button><button type="button" disabled={busy || !acknowledged || !note.trim()} className={button} onClick={() => void review("changes_requested")}>Yêu cầu chỉnh sửa</button></div>
    </>}
    {!!reviews.length && <details className="border-t border-[var(--line)] pt-3"><summary className="cursor-pointer font-semibold">Lịch sử duyệt ({reviews.length})</summary><ol className="mt-2 space-y-2 text-sm">{reviews.map(item => <li key={item.id}>v{item.revision} · {item.decision === "approved" ? "Đã duyệt" : "Cần chỉnh sửa"} · {item.reviewerName} · {new Date(item.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}{item.note ? ` · ${item.note}` : ""} <button type="button" disabled={busy} className="min-h-11 underline" onClick={() => void showHistory(item.id)}>Xem phân tích lúc duyệt</button></li>)}</ol>
      {historical?.analysis && <section className="mt-3"><h3 className="font-semibold">Phân tích đã lưu · v{historical.revision}</h3><p className="text-sm">Số liệu tại thời điểm duyệt, giữ nguyên nguồn cũ.</p><AnalysisReport analysis={historical.analysis} /></section>}
    </details>}
  </section>;
}
