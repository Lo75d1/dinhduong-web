"use client";
import { useEffect, useRef, useState } from "react";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";
import { eatingContextLabel } from "@/lib/menu-library/contracts";
import type { LibraryAnalysis } from "@/lib/menu-library/analysis";
import { menuTitleParts } from "@/lib/menu-library/presentation";
import MealSheet, { NutritionSummary } from "./MealSheet";
import TemplateEditor from "./TemplateEditor";
import TemplateReview, { AnalysisReport as DraftAnalysis, type ReviewRecord } from "./TemplateReview";
import styles from "./clinical.module.css";

export type OpenedTemplate = {
  template: { id: string; title: string; direction: string; revision: number; updatedAt: string; url: string };
  content: MenuLibraryDraft; warnings: string[]; foods: { id: string; name: string; unit: string }[];
  history: { revision: number; reason: string; createdAt: string }[]; csrf?: string;
  reviews?: ReviewRecord[]; currentReview?: ReviewRecord | null;
};
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
function Heading({ data, action }: { data: OpenedTemplate; action?: React.ReactNode }) {
  const title = menuTitleParts(data.content.title);
  return <header className={styles.titleRow}><div><h2 tabIndex={-1} title={data.content.title}>{title.title}</h2><div className={styles.meta}><span className={`${styles.status} ${data.currentReview?.decision === "approved" ? styles.approved : ""}`}>{data.currentReview?.decision === "approved" ? "Đã duyệt" : data.currentReview?.decision === "changes_requested" ? "Cần chỉnh sửa" : "Chưa duyệt"}</span><span>{eatingContextLabel(data.content.eatingContext)}</span>{title.labels.map(label => <span key={label}>{label}</span>)}<span>Bản {data.template.revision}</span></div></div>{action}</header>;
}

export function TemplatePreview({ data }: { data: OpenedTemplate }) {
  const [dayId, setDayId] = useState(data.content.days[0]?.id ?? ""), [groupId, setGroupId] = useState(data.content.groups[0]?.id ?? "");
  return <section className={styles.workspace} aria-label="Chi tiết mẫu"><Heading data={data} /><Scope content={data.content} dayId={dayId} groupId={groupId} setDayId={setDayId} setGroupId={setGroupId} /><MealSheet content={data.content} day={data.content.days.find(day => day.id === dayId)} groupId={groupId} foods={data.foods} /></section>;
}

function Scope({ content, dayId, groupId, setDayId, setGroupId }: { content: MenuLibraryDraft; dayId: string; groupId: string; setDayId: (id: string) => void; setGroupId: (id: string) => void }) {
  return <div className={styles.contextBar}><div className={styles.selectors}>
    {content.days.length > 1 ? <label>Ngày<select value={dayId} onChange={event => setDayId(event.target.value)}>{content.days.map(day => <option key={day.id} value={day.id}>Ngày {day.dayIndex}{day.date ? ` · ${day.date}` : ""}</option>)}</select></label> : <span>1 ngày</span>}
    {content.groups.length > 1 ? <label>Nhóm<select value={groupId} onChange={event => setGroupId(event.target.value)}>{content.groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label> : <span title={content.groups[0]?.label}>{content.groups[0]?.label.split(";")[0]}</span>}
  </div><span className={styles.scopeNote}>Định lượng cho 1 suất</span></div>;
}

export default function TemplateWorkspace({ data, onReload, onDirty }: { data: OpenedTemplate; onReload: () => void; onDirty: (dirty: boolean) => void }) {
  const [dayId, setDayId] = useState(data.content.days[0]?.id ?? ""), [groupId, setGroupId] = useState(data.content.groups[0]?.id ?? "");
  const [editing, setEditing] = useState(false), [mealId, setMealId] = useState("");
  const [workingDraft, setWorkingDraft] = useState(data.content), [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; value: LibraryAnalysis | null; error: string }>({ key: "", value: null, error: "" });
  const heading = useRef<HTMLDivElement>(null);
  const draft = editing ? workingDraft : data.content;
  const requestKey = JSON.stringify([draft, refresh]);
  const current = result.key === requestKey;
  const analysis = current ? result.value : null;
  const pending = !!data.csrf && !current;
  const section = analysis?.sections.find(item => item.dayId === dayId && item.groupId === groupId);
  useEffect(() => { heading.current?.querySelector<HTMLElement>("h2")?.focus(); }, []);
  useEffect(() => {
    if (!data.csrf) return;
    const abort = new AbortController();
    const timeout = window.setTimeout(async () => {
      const valid = draft.title.trim() && draft.groups.every(group => group.designEnergyKcal == null || Number.isFinite(group.designEnergyKcal) && group.designEnergyKcal > 0) && draft.days.every(day => day.meals.every(meal => meal.groupPortions.every(portion => portion.dishes.every(dish => dish.label.trim() && dish.ingredients.every(ingredient => Number.isFinite(ingredient.quantityPerPortion) && ingredient.quantityPerPortion >= 0)))));
      if (!valid) { setResult({ key: requestKey, value: null, error: "Nhập tên món và định lượng hợp lệ để tiếp tục tính." }); return; }
      try {
        const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(data.template.id)}/analysis`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-menu-library-csrf": data.csrf! }, signal: abort.signal,
          body: JSON.stringify({ expectedRevision: data.template.revision, ...(editing ? { content: draft } : {}) }),
        });
        const value = await response.json();
        if (!response.ok) throw new Error(value.message ?? "Chưa tính được dinh dưỡng. Thử lại sau.");
        if (!abort.signal.aborted) setResult({ key: requestKey, value, error: "" });
      } catch (error) { if (!abort.signal.aborted) setResult({ key: requestKey, value: null, error: error instanceof Error ? error.message : "Chưa tính được dinh dưỡng." }); }
    }, editing ? 450 : 0);
    return () => { window.clearTimeout(timeout); abort.abort(); };
  }, [data.csrf, data.template.id, data.template.revision, draft, editing, requestKey]);
  function edit(id = "") { setWorkingDraft(data.content); setMealId(id); setEditing(true); }
  function cancel() { setEditing(false); setWorkingDraft(data.content); onDirty(false); }
  return <section className={styles.workspace} aria-label="Biên soạn và duyệt thực đơn">
    <div ref={heading}><Heading data={data} action={!editing && data.csrf ? <button type="button" className={styles.action} onClick={() => edit()}>Chỉnh khẩu phần</button> : undefined} /></div>
    <Scope content={draft} dayId={dayId} groupId={groupId} setDayId={id => { setDayId(id); setMealId(""); }} setGroupId={setGroupId} />
    <NutritionSummary section={section} pending={pending} error={current ? result.error : undefined} editing={editing} />
    {current && result.error && <button type="button" className={styles.textButton} onClick={() => setRefresh(value => value + 1)}>Thử tính lại</button>}
    {editing && data.csrf ? <>
      <div className={styles.contextBar}><label>Chỉnh bữa <select aria-label="Bữa cần chỉnh" value={mealId} onChange={event => setMealId(event.target.value)} className={styles.control}><option value="">Tất cả bữa</option>{draft.days.find(day => day.id === dayId)?.meals.map(meal => <option key={meal.id} value={meal.id}>{meal.label}</option>)}</select></label></div>
      <TemplateEditor content={data.content} csrf={data.csrf} foods={data.foods} onDirty={onDirty} onDraftChange={setWorkingDraft} onSaved={onReload} onCancel={cancel} dayId={dayId} groupId={groupId} mealId={mealId} />
      {analysis && <details className={styles.disclosure}><summary>Phân tích chi tiết theo lượng đang chỉnh</summary><div><DraftAnalysis analysis={{ ...analysis, sections: section ? [section] : [] }} /></div></details>}
    </> : <>
      <MealSheet content={draft} day={draft.days.find(day => day.id === dayId)} groupId={groupId} foods={data.foods} section={section} pending={pending} onEdit={data.csrf ? edit : undefined} />
      {data.csrf && <TemplateReview id={data.template.id} revision={data.template.revision} csrf={data.csrf} currentReview={data.currentReview} reviews={data.reviews ?? []} onReviewed={onReload} live={{ analysis, pending, recalculate: () => setRefresh(value => value + 1), dayId, groupId }} />}
    </>}
    <details className={styles.disclosure}><summary>Thông tin mẫu & lịch sử thay đổi</summary><div>
      <p>{data.content.unit?.label ?? "Mẫu cá nhân"} · Cập nhật {date(data.template.updatedAt)}</p>
      <p className={styles.scopeNote}>{data.content.groups.find(group => group.id === groupId)?.label}</p>
      {!!data.warnings.length && <ul>{data.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      <ol className={styles.historyList}>{data.history.map(item => <li key={item.revision}><strong>Bản {item.revision}</strong> · {date(item.createdAt)}<p>{item.reason}</p></li>)}</ol>
    </div></details>
  </section>;
}
