"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import CalculatorInputToolbar from "@/app/tinh-khau-phan/CalculatorInputToolbar";
import PersonalProfile from "@/app/tinh-khau-phan/PersonalProfile";
import type { MenuInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import NutritionMenuAnalysis,{NutritionMenuInput} from "../../NutritionMenuAnalysis";
import { readNutritionResponse,sameSiteNutritionDownload,type NutritionDownload } from "../../client-api";
import LibraryIngredientPicker from "@/app/tai-khoan/LibraryIngredientPicker";
import ClinicalContextControls from "../../ClinicalContextControls";
import MenuDraftEditor from "@/app/tinh-khau-phan/MenuDraftEditor";
import { savedCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";
import { downloadNutritionInputExcel, selectNutritionDay } from "@/app/tinh-khau-phan/nutrition-excel-download";

export type Prepared = { input: MenuInput; preview: ResolvedMenu; confirmationToken: string };
export type SavedTarget = { id: string; title: string; revision: number };
const control = "mt-1 w-full min-w-0 rounded border border-[#8fa99e] px-3 py-2 text-neutral-900";
const button = "rounded bg-[#123c36] px-4 py-2 font-semibold text-white disabled:opacity-50";

function SurveyControls({ row, name, disabled, onChange }: { row: MenuInput["days"][number]["rows"][number]; name: string; disabled: boolean; onChange: (key: "mealTime" | "householdMeasure" | "sourceState", value: string) => void }) {
  return <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
    <label className="text-sm">Giờ ăn · {name}<input type="time" value={row.mealTime || ""} disabled={disabled} onChange={event => onChange("mealTime", event.target.value)} className={control} /></label>
    <label className="text-sm">Số bát, cốc… · {name}<input maxLength={100} value={row.householdMeasure || ""} disabled={disabled} onChange={event => onChange("householdMeasure", event.target.value)} className={control} /></label>
    <label className="text-sm">Cơ sở nguồn đã đối chiếu · {name}<select value={row.sourceState || ""} disabled={disabled} onChange={event => onChange("sourceState", event.target.value)} className={control}><option value="">Chưa xác nhận</option><option value="raw_clean">Sống sạch</option><option value="cooked">Chín</option><option value="as_sold">Theo sản phẩm</option></select></label>
  </div>;
}

export default function ReuseSavedMenu({ menu, initialInput, initialNames = {}, initialPrepared,savedTarget,temporary,layout="form",view="entry",onPrepared,onDraftChange,onSaved,actionsContainer }: { menu?: ResolvedMenu; initialInput?: MenuInput; initialNames?: Record<string, string>; initialPrepared?:Prepared;savedTarget?:SavedTarget;temporary?:{id:string;expiresAt:string};layout?:"form"|"calculator";view?:"entry"|"analysis";onPrepared?:(menu:ResolvedMenu)=>void;onDraftChange?:()=>void;onSaved?:(ration:SavedTarget,prepared:Prepared)=>void;actionsContainer?:HTMLElement|null }) {
  const [draft, setDraft] = useState<MenuInput>(() => structuredClone(menu?.input ?? initialInput!));
  const [names, setNames] = useState<Record<string, string>>(() => ({ ...Object.fromEntries(menu?.days.flatMap(day => day.rows.map(row => [row.id, row.food.name])) ?? []), ...initialNames }));
  const [prepared, setPrepared] = useState<Prepared | null>(()=>initialPrepared??null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportDayId, setExportDayId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);
  const [latestTarget, setLatestTarget] = useState<SavedTarget | null>(null);
  const target = latestTarget ?? savedTarget;
  const [accountMode,setAccountMode]=useState(false),[download,setDownload]=useState<NutritionDownload|null>(null);
  const key = useRef<string | null>(null);
  function change(next: MenuInput) { setDraft(next); setPrepared(null); setConfirmed(false); setSaved(null); setAccountMode(false);setDownload(null);key.current = null;onDraftChange?.(); }
  const temporaryEndpoint=temporary?`/api/nutrition/v1/web-menu/${temporary.id}`:null;
  function amount(dayIndex: number, rowIndex: number, field: "quantity" | "servings", value: string) {
    const next = structuredClone(draft);
    if (field === "quantity") next.days[dayIndex].rows[rowIndex].quantity = value === "" ? null : Number(value);
    else next.days[dayIndex].rows[rowIndex].servings = value === "" ? 0 : Number(value);
    next.days[dayIndex].rows[rowIndex].aiFilledFields = next.days[dayIndex].rows[rowIndex].aiFilledFields?.filter(key => key !== field && key !== "householdMeasure");
    delete next.days[dayIndex].rows[rowIndex].householdMeasure;
    change(next);
  }
  async function preview(forAccount=false) {
    setBusy(true); setError(""); setPrepared(null); setConfirmed(false); setSaved(null);
    try {
      const value = await readNutritionResponse<Prepared>(await fetch(temporaryEndpoint&&!forAccount?temporaryEndpoint:"/api/nutrition/v1/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: draft,...(temporaryEndpoint&&!forAccount?{action:"prepare"}:{}) }) }));
      setAccountMode(forAccount);setDownload(null);
      setPrepared(value); key.current = crypto.randomUUID();onPrepared?.(value.preview);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa tính được bản điều chỉnh."); }
    finally { setBusy(false); }
  }
  async function save(copy=false) {
    if (!prepared || !confirmed || busy || saved || temporary&&!accountMode) return;
    // An already prepared saved snapshot has no preview-click key yet.
    // Generate it on the user's save action and retain it for retries.
    key.current ??= crypto.randomUUID();
    setBusy(true); setError("");
    try {
      const value = await readNutritionResponse<{ ration: SavedTarget }>(await fetch("/api/nutrition/v1/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: prepared.input, confirmationToken: prepared.confirmationToken, idempotencyKey: `${copy?"copy":"save"}-${key.current}`, ...(!copy && target ? { rationId: target.id, expectedRevision: target.revision } : {}) }) }));
      setSaved(value.ration);
      setLatestTarget(value.ration);
      onSaved?.(value.ration,prepared);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được bản dùng lại."); }
    finally { setBusy(false); }
  }
  async function accountExport() {
    if (!prepared || !confirmed || busy || prepared.preview.missingInputs.length) return;
    setBusy(true); setError("");
    try { setDownload(sameSiteNutritionDownload(await readNutritionResponse<NutritionDownload>(await fetch("/api/nutrition/v1/export", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({input:prepared.input,confirmationToken:prepared.confirmationToken}) })))); }
    catch(cause) { setError(cause instanceof Error?cause.message:"Chưa tải được Excel."); }
    finally { setBusy(false); }
  }
  async function temporaryResult(action:"calculate"|"export"){
    if(!temporaryEndpoint||!prepared||!confirmed||busy||accountMode)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(temporaryEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,input:prepared.input,confirmationToken:prepared.confirmationToken})});
      if(action==="export")setDownload(sameSiteNutritionDownload(await readNutritionResponse<NutritionDownload>(response)));
      else{const value=await readNutritionResponse<{webUrl:string}>(response),url=new URL(value.webUrl,window.location.origin);if(url.origin!==window.location.origin||url.pathname!=="/tinh-khau-phan"||url.search!=="?banTam=1"||!/^[A-Za-z0-9_-]{43}$/.test(url.hash.slice(1)))throw new Error("Link bản cập nhật chưa hợp lệ.");window.location.assign(url.href);}
    }catch(cause){setError(cause instanceof Error?cause.message:"Chưa xử lý được bản điều chỉnh.");}finally{setBusy(false);}
  }
  const exportDay = prepared?.input.days.find(day => day.id === exportDayId) ?? prepared?.input.days[0];
  async function exportSelectedDay() {
    if (!prepared || !exportDay || !confirmed || busy || prepared.preview.missingInputs.length) return;
    setBusy(true); setError("");
    try { await downloadNutritionInputExcel(selectNutritionDay(prepared.input, exportDay.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa tải được thực đơn ngày đã chọn."); }
    finally { setBusy(false); }
  }
  const actions = <div className="w-full min-w-0 space-y-3">
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
    {prepared&&prepared.input.days.length>1&&exportDay?<div className="flex flex-wrap items-center gap-2 rounded border border-[#b1c8bd] bg-white p-3" data-no-print>
      <label className="flex min-w-0 items-center gap-2 text-sm">Ngày muốn gửi<select aria-label="Ngày xuất Excel" disabled={busy} value={exportDay.id} onChange={event=>setExportDayId(event.target.value)} className="min-w-0 max-w-full rounded border border-[#8fa99e] px-2 py-2">{prepared.input.days.map(day=><option key={day.id} value={day.id}>{day.label}{day.date?` · ${day.date}`:""}</option>)}</select></label>
      <button type="button" disabled={busy||!confirmed||!!prepared.preview.missingInputs.length} onClick={()=>void exportSelectedDay()} className="rounded border border-[#123c36] px-3 py-2 text-sm font-semibold text-[#123c36] disabled:opacity-50">Excel riêng ngày này</button>
      <p className="w-full text-xs text-neutral-600">Excel cả kỳ có sheet riêng cho từng ngày. Xác nhận bản xem trước để tải ngày đã chọn.</p>
    </div>:null}
    {prepared ? <div className="border-t border-[#b1c8bd] pt-3">{layout==="form"?<><NutritionMenuInput menu={prepared.preview}/><NutritionMenuAnalysis menu={prepared.preview}/></>:null}{prepared.preview.missingInputs.length ? <ul className="mt-3 list-disc pl-5 text-sm text-amber-900">{prepared.preview.missingInputs.map((item, i) => <li key={i}>{item.message}</li>)}</ul> : null}<label className="mt-2 flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy || !!saved} onChange={event => setConfirmed(event.target.checked)} className="accent-[#123c36]" /><span>Tôi xác nhận đầu vào và nguồn của khẩu phần.</span></label>{temporary&&!accountMode?<div className="mt-3 flex flex-wrap gap-4"><button type="button" disabled={busy||!confirmed||!!prepared.preview.missingInputs.length} onClick={()=>void temporaryResult("calculate")} className={button}>Tính lại và mở bản cập nhật</button><button type="button" disabled={busy||!confirmed||!!prepared.preview.missingInputs.length} onClick={()=>void temporaryResult("export")} className="text-sm underline">Tải thêm Excel</button></div>:<div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" disabled={busy || !confirmed || !!prepared.preview.missingInputs.length || !!saved} onClick={() => void save()} className={button}>{saved ? "Đã lưu vào tài khoản" : target ? "Lưu thay đổi" : "Lưu thực đơn vào tài khoản"}</button>{target&&!saved?<button type="button" disabled={busy||!confirmed||!!prepared.preview.missingInputs.length} onClick={()=>void save(true)} className="rounded border border-[#123c36] px-4 py-2 text-sm font-semibold text-[#123c36] disabled:opacity-50">Lưu thành bản mới</button>:null}<button type="button" disabled={busy||!confirmed||!!prepared.preview.missingInputs.length} onClick={()=>void accountExport()} className="rounded border border-[#9bb6ab] px-4 py-2 text-sm font-semibold disabled:opacity-50">Tải thêm Excel</button></div>}</div> : null}
    {download?<p role="status"><a href={download.downloadUrl} download={download.filename} className="font-semibold underline">Tải {download.filename}</a> · Link tải có thời hạn10phút.</p>:null}
    {temporary?<details className="rounded border border-[#b1c8bd] p-3"><summary className="cursor-pointer font-semibold">Muốn lưu vào tài khoản để dùng lâu dài?</summary><p className="mt-3 text-sm">Đăng nhập trong tab mới rồi quay lại đây. Giữ nguyên các chỉnh sửa, chuẩn bị bản dành cho tài khoản và xác nhận lại trước khi lưu.</p><Link href="/dang-nhap" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block underline">Đăng nhập / Đăng ký trong tab mới</Link><button type="button" disabled={busy} onClick={()=>void preview(true)} className="mt-3 block font-semibold underline">Chuẩn bị bản để lưu vào tài khoản</button></details>:null}
    {saved ? <p role="status"><Link href={savedCalculatorUrl(saved.id)} className="font-semibold underline">Mở bản dùng lại: {saved.title}</Link></p> : null}
  </div>;
  return <section className={layout==="calculator"?"flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1":"mt-5 space-y-4"} aria-label={layout==="calculator"?"Khẩu phần đang mở":"Điều chỉnh và dùng lại thực đơn"}>
    {layout==="form"?<p className="text-sm text-neutral-700">{temporary?"Sửa món, thực phẩm, ngày và định lượng. Xem trước, xác nhận rồi bấm Tính lại để mở bản cập nhật; không cần tài khoản. Excel là lựa chọn tải thêm.":"Chọn món, thực phẩm, ngày và định lượng; xem kết quả rồi lưu thành bản riêng. Các bản đã lưu trước đó được giữ để đối chiếu."}</p>:null}
    <div className={layout==="calculator"?view==="analysis"?"hidden":"flex min-h-0 flex-1 flex-col gap-3":"space-y-4"}>
    <label className="block text-sm font-semibold">{layout==="calculator"?"Tên khẩu phần":"Tên bản dùng lại"}<input value={draft.title} disabled={busy} maxLength={200} onChange={event => change({ ...draft, title: event.target.value })} className={control} /></label>
    {layout==="calculator"?<CalculatorInputToolbar mode={draft.mode} disabled={busy} onModeChange={mode=>change({...draft,mode})}><PersonalProfile value={draft.profile??null} disabled={busy} onChange={profile=>change({...draft,profile})} clinicalSlot={<ClinicalContextControls value={draft.clinicalContext} disabled={busy} onChange={clinicalContext=>change({...draft,clinicalContext})}/>}/><label className="text-sm">Đối chiếu nhu cầu<select aria-label="Đối chiếu nhu cầu" disabled={busy} value={draft.comparison.mode} onChange={event=>change({...draft,comparison:{...draft.comparison,mode:event.target.value as MenuInput["comparison"]["mode"]}})} className="ml-2 rounded border border-[#8fa99e] bg-white px-2 py-1.5"><option value="none">Chỉ tính thành phần</option><option value="profile">Theo hồ sơ</option><option value="manual" disabled={draft.comparison.mode!=="manual"&&!draft.comparison.targets?.length}>Theo mục tiêu đã cung cấp</option></select></label></CalculatorInputToolbar>:null}
    {layout==="form"?<ClinicalContextControls value={draft.clinicalContext} disabled={busy} onChange={clinicalContext=>change({...draft,clinicalContext})}/>:null}

    {layout==="calculator"?<MenuDraftEditor sourceMode={temporary&&!accountMode?"catalog":"all"} input={draft} menu={prepared?.preview??menu} names={names} disabled={busy} onChange={change} onNames={added=>setNames(current=>({...current,...added}))} onAmount={amount}/>:draft.days.map((day, di) => <details key={day.id} className="rounded-lg border border-[#b1c8bd] p-3" open={draft.days.length === 1}>
      <summary className="cursor-pointer font-semibold">{day.label} · {day.rows.length} dòng</summary>
      <label className="mt-3 block text-sm">Ngày dùng lại<input type="date" value={day.date} disabled={busy} onChange={event => { const next = structuredClone(draft); next.days[di].date = event.target.value; change(next); }} className={control} /></label>
      <div className="mt-3 space-y-3">{day.rows.map((row, ri) => { const name = row.actualFoodName || row.customFood?.name || names[row.id] || row.dish; return <div key={row.id} className="grid gap-3 border-t border-[#dcebe5] pt-3 sm:grid-cols-2"><p className="text-sm sm:col-span-2"><strong>{row.meal} · {row.dish}</strong> · {name}</p>{(["meal", "dish"] as const).map(field => <label key={field} className="text-sm">{field === "meal" ? "Bữa" : "Món"} · {name}<input maxLength={160} value={row[field]} disabled={busy} onChange={event => { const next = structuredClone(draft); next.days[di].rows[ri][field] = event.target.value; change(next); }} className={control} /></label>)}{draft.mode === "recall24h" ? <SurveyControls row={row} name={name} disabled={busy} onChange={(field, value) => { const next = structuredClone(draft); const target = next.days[di].rows[ri]; if (field === "sourceState") { if (value) target.sourceState = value as NonNullable<typeof target.sourceState>; else delete target.sourceState; } else { if (value) target[field] = value; else delete target[field]; target.aiFilledFields = target.aiFilledFields?.filter(key => key !== field); } change(next); }} /> : null}<label className="text-sm">Lượng ({row.unit}) · {name}<input type="number" min={0} max={1000000} step="any" value={row.quantity ?? ""} disabled={busy} onChange={event => amount(di, ri, "quantity", event.target.value)} className={control} /></label><label className="text-sm">Số suất · {name}<input type="number" min={0.000001} max={10000} step="any" value={row.servings} disabled={busy} onChange={event => amount(di, ri, "servings", event.target.value)} className={control} /></label><button type="button" disabled={busy} onClick={() => { const next = structuredClone(draft); next.days[di].rows.splice(ri, 1); change(next); }} className="text-left text-sm text-red-800 underline">Bỏ dòng thực phẩm</button></div>; })}</div>
      <div className="mt-4"><LibraryIngredientPicker sourceMode={temporary?"catalog":"all"} disabled={busy} onPick={(rows, addedNames) => { const next = structuredClone(draft); next.days[di].rows.push(...rows); setNames(current => ({ ...current, ...addedNames })); change(next); }} /></div>
    </details>)}
    <button type="button" disabled={busy || draft.days.length >= 90} onClick={() => change({ ...draft, days: [...draft.days, { id: crypto.randomUUID(), label: `Ngày ${draft.days.length + 1}`, date: "", rows: [] }] })} className="text-sm font-semibold underline">Thêm ngày</button>
    </div>
    {layout!=="calculator"||view==="entry"?<button type="button" disabled={busy} onClick={() => void preview()} className={button}>{busy ? "Đang xử lý…" : layout==="calculator"?"Xem trước và tính lại":"Xem trước bản dùng lại"}</button>:null}
    {layout==="calculator"&&view==="analysis"&&actionsContainer?createPortal(actions,actionsContainer):actions}
  </section>;
}
