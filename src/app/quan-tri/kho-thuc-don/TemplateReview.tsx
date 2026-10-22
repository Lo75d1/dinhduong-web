"use client";
import { useState } from "react";
import type { LibraryAnalysis } from "@/lib/menu-library/analysis";
import type { NutrientTotal } from "@/lib/nutrition-chat/contracts";
import { clinicalNumber as format, foodDisplayName } from "@/lib/menu-library/presentation";
import styles from "./clinical.module.css";

export type ReviewRecord = { id: string; revision: number; decision: string; reviewerName: string; note: string; createdAt: string; analysisDigest: string; analysis?: LibraryAnalysis };
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
function amount(total?: NutrientTotal) { return !total || total.value === null ? "—" : `${format(total.value)}${total.incomplete ? " *" : ""}`; }

export function AnalysisReport({ analysis }: { analysis: LibraryAnalysis }) {
  return <div>
    {analysis.sections.map(section => <section key={`${section.dayId}-${section.groupId}`}>
      {analysis.sections.length > 1 && <h4>Ngày {section.dayIndex} · {section.groupLabel}</h4>}
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`Bảng dinh dưỡng ngày ${section.dayIndex}, ${section.groupLabel}`}><table className={styles.detailTable}><caption className="sr-only">Thành phần dinh dưỡng theo bữa và tổng các bữa</caption><thead><tr><th scope="col">Thành phần</th>{section.meals.map(meal => <th key={meal.id} scope="col">{meal.label}</th>)}<th scope="col">Tổng</th></tr></thead><tbody>{analysis.fields.map(field => <tr key={field.key}><th scope="row">{field.label} ({field.unit})</th>{section.meals.map(meal => <td key={meal.id}>{amount(meal.totals[field.key])}</td>)}<td><strong>{amount(section.totals[field.key])}</strong></td></tr>)}</tbody></table></div>
      <p className={styles.scopeNote}>* Chỉ cộng phần đã có số liệu, chưa phải tổng đầy đủ. — Chưa xác định. Tính một suất, chưa tính hao hụt sau nấu.</p>
      {section.structureMissing && <p className={styles.calculationError}>Còn thiếu bữa, món hoặc nguyên liệu; cần bổ sung trước khi duyệt.</p>}
      {!!section.missingInputs.length && <ul className={styles.calculationError}>{section.missingInputs.map((item, index) => <li key={index}>{item.message}</li>)}</ul>}
      <details className={styles.disclosure}><summary>Thực phẩm thiếu số liệu</summary><div><ul>{analysis.fields.filter(field => section.totals[field.key].incomplete).map(field => <li key={field.key}><strong>{field.label}:</strong> {section.totals[field.key].missingRows.map(id => { const row = section.ingredients.find(item => item.id === id); return row ? `${foodDisplayName(row.name)} (${row.meal} · ${row.dish})` : "Chưa đọc được tên thực phẩm"; }).join("; ")}.</li>)}</ul>{!!section.warnings.length && <ul>{section.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}</div></details>
      <details className={styles.disclosure}><summary>Nguồn thành phần thực phẩm</summary><div><ul className={styles.historyList}>{section.ingredients.map(row => <li key={row.id}><strong>{foodDisplayName(row.name)}</strong> · {format(row.quantity)} {row.unit}<p>{row.meal} · {row.dish} · {row.source}</p></li>)}</ul></div></details>
    </section>)}
  </div>;
}

type LiveAnalysis = { analysis: LibraryAnalysis | null; pending: boolean; recalculate: () => void; dayId: string; groupId: string };
export default function TemplateReview({ id, revision, csrf, currentReview, reviews, onReviewed, live }: {
  id: string; revision: number; csrf: string; currentReview?: ReviewRecord | null; reviews: ReviewRecord[]; onReviewed: () => void; live?: LiveAnalysis;
}) {
  const [internal, setInternal] = useState<LibraryAnalysis | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [note, setNote] = useState(""), [acknowledgedDigest, setAcknowledgedDigest] = useState<string | null>(null), [showForm, setShowForm] = useState(false);
  const [historical, setHistorical] = useState<ReviewRecord | null>(null);
  const analysis = live ? live.analysis : internal;
  const acknowledged = !!analysis && acknowledgedDigest === analysis.digest;
  const pending = busy || !!live?.pending;
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
    setBusy(true); setError(""); setInternal(null); setAcknowledgedDigest(null);
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}/analysis`, { method: "POST", headers: { "Content-Type": "application/json", "x-menu-library-csrf": csrf }, body: JSON.stringify({ expectedRevision: revision }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Chưa tính được dinh dưỡng.");
      setInternal(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa tính được dinh dưỡng."); }
    finally { setBusy(false); }
  }
  async function review(decision: "approved" | "changes_requested") {
    if (!analysis) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}/review`, { method: "POST", headers: { "Content-Type": "application/json", "x-menu-library-csrf": csrf }, body: JSON.stringify({ expectedRevision: revision, decision, note, analysisDigest: analysis.digest, acknowledged }) });
      const result = await response.json(); if (!response.ok) { if (response.status === 409) { setInternal(null); setAcknowledgedDigest(null); live?.recalculate(); } throw new Error(result.message ?? "Chưa ghi được kết quả duyệt."); }
      onReviewed();
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa ghi được kết quả duyệt."); }
    finally { setBusy(false); }
  }
  const displayed = analysis && live ? { ...analysis, sections: analysis.sections.filter(section => section.dayId === live.dayId && section.groupId === live.groupId) } : analysis;
  return <div className={styles.bottom}>
    {displayed && <details className={styles.disclosure}><summary>Phân tích dinh dưỡng chi tiết</summary><div><AnalysisReport analysis={displayed} /></div></details>}
    {!live && <button type="button" disabled={busy} className={styles.secondary} onClick={() => void analyze()}>Tính dinh dưỡng</button>}
    <section aria-label="Duyệt thực đơn" className={styles.review}>
      <div className={styles.reviewHeader}><div><h3>Duyệt thực đơn</h3><p role="status">{currentReview ? `${currentReview.decision === "approved" ? "Đã duyệt" : "Cần chỉnh sửa"} · ${currentReview.reviewerName} · ${date(currentReview.createdAt)}` : "Chưa duyệt. Kiểm tra món, định lượng và tỷ lệ dinh dưỡng trước khi xác nhận."}</p></div><button type="button" disabled={pending || !analysis} className={styles.action} aria-expanded={showForm} onClick={() => setShowForm(value => !value)}>{showForm ? "Đóng phần duyệt" : currentReview ? "Xem lại quyết định" : "Duyệt mẫu này"}</button></div>
      {currentReview?.note && <p>{currentReview.note}</p>}
      {error && <p role="alert" className={styles.calculationError}>{error}</p>}
      {showForm && analysis && <div className={styles.reviewForm}>
        <label>Nhận xét / nội dung cần sửa<textarea maxLength={2000} value={note} onChange={event => setNote(event.target.value.replace(/[\r\n]+/g, " "))} /></label>
        <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledgedDigest(event.target.checked ? analysis.digest : null)} /><span>Tôi đã kiểm tra món, định lượng và các chất còn thiếu số liệu của thực đơn này.</span></label>
        <p className={styles.scopeNote}>Duyệt mẫu không thay thế đánh giá và chỉ định cho từng người bệnh. {live && analysis.sections.length > 1 ? `Quyết định áp dụng cho toàn bộ ${analysis.sections.length} nhóm/ngày của mẫu.` : ""}</p>
        <div className={styles.reviewActions}><button type="button" disabled={pending || !acknowledged || !analysis.canApprove} className={styles.action} onClick={() => void review("approved")}>Xác nhận duyệt</button><button type="button" disabled={pending || !acknowledged || !note.trim()} className={styles.secondary} onClick={() => void review("changes_requested")}>Yêu cầu chỉnh sửa</button></div>
      </div>}
    </section>
    {!!reviews.length && <details className={styles.disclosure}><summary>Lịch sử duyệt</summary><div><ol className={styles.historyList}>{reviews.map(item => <li key={item.id}><strong>{item.decision === "approved" ? "Đã duyệt" : "Cần chỉnh sửa"}</strong> · {item.reviewerName}<p>{date(item.createdAt)} · Bản {item.revision}{item.note ? ` · ${item.note}` : ""}</p><button type="button" disabled={busy} className={styles.textButton} onClick={() => void showHistory(item.id)}>Xem kết quả lúc duyệt</button></li>)}</ol>
      {historical?.analysis && <section><h4>Kết quả đã lưu · Bản {historical.revision}</h4><p className={styles.scopeNote}>Giữ số liệu tại thời điểm duyệt.</p><AnalysisReport analysis={historical.analysis} /></section>}
    </div></details>}
  </div>;
}
