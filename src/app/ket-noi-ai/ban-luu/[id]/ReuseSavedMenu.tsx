"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { MenuInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import NutritionMenuAnalysis,{NutritionMenuInput} from "../../NutritionMenuAnalysis";
import { readNutritionResponse,sameSiteNutritionDownload,type NutritionDownload } from "../../client-api";
import LibraryIngredientPicker from "@/app/tai-khoan/LibraryIngredientPicker";
import ClinicalContextControls from "../../ClinicalContextControls";
import MenuDraftEditor from "@/app/tinh-khau-phan/MenuDraftEditor";

type Prepared = { input: MenuInput; preview: ResolvedMenu; confirmationToken: string };
const control = "mt-1 w-full min-w-0 rounded border border-[#8fa99e] px-3 py-2 text-neutral-900";
const button = "rounded bg-[#123c36] px-4 py-2 font-semibold text-white disabled:opacity-50";

function SurveyControls({ row, name, disabled, onChange }: { row: MenuInput["days"][number]["rows"][number]; name: string; disabled: boolean; onChange: (key: "mealTime" | "householdMeasure" | "sourceState", value: string) => void }) {
  return <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
    <label className="text-sm">Giờ ăn · {name}<input type="time" value={row.mealTime || ""} disabled={disabled} onChange={event => onChange("mealTime", event.target.value)} className={control} /></label>
    <label className="text-sm">Số bát, cốc… · {name}<input maxLength={100} value={row.householdMeasure || ""} disabled={disabled} onChange={event => onChange("householdMeasure", event.target.value)} className={control} /></label>
    <label className="text-sm">Cơ sở nguồn đã đối chiếu · {name}<select value={row.sourceState || ""} disabled={disabled} onChange={event => onChange("sourceState", event.target.value)} className={control}><option value="">Chưa xác nhận</option><option value="raw_clean">Sống sạch</option><option value="cooked">Chín</option><option value="as_sold">Theo sản phẩm</option></select></label>
  </div>;
}

export default function ReuseSavedMenu({ menu, initialInput, initialNames = {}, temporary,layout="form",view="entry",onPrepared,onDraftChange }: { menu?: ResolvedMenu; initialInput?: MenuInput; initialNames?: Record<string, string>; temporary?:{id:string;expiresAt:string};layout?:"form"|"calculator";view?:"entry"|"analysis";onPrepared?:(menu:ResolvedMenu)=>void;onDraftChange?:()=>void }) {
  const [draft, setDraft] = useState<MenuInput>(() => structuredClone(menu?.input ?? initialInput!));
  const [names, setNames] = useState<Record<string, string>>(() => ({ ...Object.fromEntries(menu?.days.flatMap(day => day.rows.map(row => [row.id, row.food.name])) ?? []), ...initialNames }));
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);
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
  async function save() {
    if (!prepared || !confirmed || !key.current || busy || saved || temporary&&!accountMode) return;
    setBusy(true); setError("");
    try {
      const value = await readNutritionResponse<{ ration: { id: string; title: string } }>(await fetch("/api/nutrition/v1/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: prepared.input, confirmationToken: prepared.confirmationToken, idempotencyKey: key.current }) }));
      setSaved(value.ration);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được bản dùng lại."); }
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
  return <section className="mt-5 space-y-4" aria-label="Điều chỉnh và dùng lại thực đơn">
    <p className="text-sm text-neutral-700">{temporary?"Sửa món, thực phẩm, ngày và định lượng. Xem trước, xác nhận rồi bấm Tính lại để mở bản cập nhật; không cần tài khoản. Excel là lựa chọn tải thêm.":"Chọn món, thực phẩm, ngày và định lượng; xem kết quả rồi lưu thành bản riêng. Các bản đã lưu trước đó được giữ để đối chiếu."}</p>
    <div className={layout==="calculator"&&view==="analysis"?"hidden":"space-y-4"}>
    <label className="block text-sm font-semibold">{layout==="calculator"?"Tên khẩu phần":"Tên bản dùng lại"}<input value={draft.title} disabled={busy} maxLength={200} onChange={event => change({ ...draft, title: event.target.value })} className={control} /></label>
    {layout==="calculator"?<details className="rounded-lg border border-[#9bb6ab] bg-white p-3"><summary className="cursor-pointer font-semibold">Bệnh lý và chế độ ăn</summary><ClinicalContextControls value={draft.clinicalContext} disabled={busy} onChange={clinicalContext=>change({...draft,clinicalContext})}/></details>:<ClinicalContextControls value={draft.clinicalContext} disabled={busy} onChange={clinicalContext => change({ ...draft, clinicalContext })} />}
    {layout==="calculator"?<MenuDraftEditor input={draft} menu={menu} names={names} disabled={busy} onChange={change} onNames={added=>setNames(current=>({...current,...added}))} onAmount={amount}/>:draft.days.map((day, di) => <details key={day.id} className="rounded-lg border border-[#b1c8bd] p-3" open={draft.days.length === 1}>
      <summary className="cursor-pointer font-semibold">{day.label} · {day.rows.length} dòng</summary>
      <label className="mt-3 block text-sm">Ngày dùng lại<input type="date" value={day.date} disabled={busy} onChange={event => { const next = structuredClone(draft); next.days[di].date = event.target.value; change(next); }} className={control} /></label>
      <div className="mt-3 space-y-3">{day.rows.map((row, ri) => { const name = row.actualFoodName || row.customFood?.name || names[row.id] || row.dish; return <div key={row.id} className="grid gap-3 border-t border-[#dcebe5] pt-3 sm:grid-cols-2"><p className="text-sm sm:col-span-2"><strong>{row.meal} · {row.dish}</strong> · {name}</p>{(["meal", "dish"] as const).map(field => <label key={field} className="text-sm">{field === "meal" ? "Bữa" : "Món"} · {name}<input maxLength={160} value={row[field]} disabled={busy} onChange={event => { const next = structuredClone(draft); next.days[di].rows[ri][field] = event.target.value; change(next); }} className={control} /></label>)}{draft.mode === "recall24h" ? <SurveyControls row={row} name={name} disabled={busy} onChange={(field, value) => { const next = structuredClone(draft); const target = next.days[di].rows[ri]; if (field === "sourceState") { if (value) target.sourceState = value as NonNullable<typeof target.sourceState>; else delete target.sourceState; } else { if (value) target[field] = value; else delete target[field]; target.aiFilledFields = target.aiFilledFields?.filter(key => key !== field); } change(next); }} /> : null}<label className="text-sm">Lượng ({row.unit}) · {name}<input type="number" min={0} max={1000000} step="any" value={row.quantity ?? ""} disabled={busy} onChange={event => amount(di, ri, "quantity", event.target.value)} className={control} /></label><label className="text-sm">Số suất · {name}<input type="number" min={0.000001} max={10000} step="any" value={row.servings} disabled={busy} onChange={event => amount(di, ri, "servings", event.target.value)} className={control} /></label><button type="button" disabled={busy} onClick={() => { const next = structuredClone(draft); next.days[di].rows.splice(ri, 1); change(next); }} className="text-left text-sm text-red-800 underline">Bỏ dòng thực phẩm</button></div>; })}</div>
      <div className="mt-4"><LibraryIngredientPicker sourceMode={temporary?"catalog":"all"} disabled={busy} onPick={(rows, addedNames) => { const next = structuredClone(draft); next.days[di].rows.push(...rows); setNames(current => ({ ...current, ...addedNames })); change(next); }} /></div>
    </details>)}
    <button type="button" disabled={busy || draft.days.length >= 90} onClick={() => change({ ...draft, days: [...draft.days, { id: crypto.randomUUID(), label: `Ngày ${draft.days.length + 1}`, date: "", rows: [] }] })} className="text-sm font-semibold underline">Thêm ngày</button>
    </div>
    <button type="button" disabled={busy} onClick={() => void preview()} className={button}>{busy ? "Đang xử lý…" : layout==="calculator"?"Xem trước và tính lại":"Xem trước bản dùng lại"}</button>
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
    {prepared ? <div className="border-t border-[#b1c8bd] pt-4"><NutritionMenuInput menu={prepared.preview}/>{layout==="form"?<NutritionMenuAnalysis menu={prepared.preview} />:null}{prepared.preview.missingInputs.length ? <ul className="mt-3 list-disc pl-5 text-sm text-amber-900">{prepared.preview.missingInputs.map((item, i) => <li key={i}>{item.message}</li>)}</ul> : null}<label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy || !!saved} onChange={event => setConfirmed(event.target.checked)} className="accent-[#123c36]" /><span>Tôi xác nhận đầu vào và nguồn của bản dùng lại.</span></label>{temporary&&!accountMode?<div className="mt-3 flex flex-wrap gap-4"><button type="button" disabled={busy||!confirmed||!!prepared.preview.missingInputs.length} onClick={()=>void temporaryResult("calculate")} className={button}>Tính lại và mở bản cập nhật</button><button type="button" disabled={busy||!confirmed||!!prepared.preview.missingInputs.length} onClick={()=>void temporaryResult("export")} className="text-sm underline">Tải thêm Excel</button></div>:<button type="button" disabled={busy || !confirmed || !!prepared.preview.missingInputs.length || !!saved} onClick={() => void save()} className={`mt-3 ${button}`}>{saved ? "Đã lưu bản dùng lại" : "Lưu bản dùng lại vào tài khoản"}</button>}</div> : null}
    {download?<p role="status"><a href={download.downloadUrl} download={download.filename} className="font-semibold underline">Tải {download.filename}</a> · Link tải có thời hạn10phút.</p>:null}
    {temporary?<details className="rounded border border-[#b1c8bd] p-3"><summary className="cursor-pointer font-semibold">Muốn lưu vào tài khoản để dùng lâu dài?</summary><p className="mt-3 text-sm">Đăng nhập trong tab mới rồi quay lại đây. Giữ nguyên các chỉnh sửa, chuẩn bị bản dành cho tài khoản và xác nhận lại trước khi lưu.</p><Link href="/dang-nhap" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block underline">Đăng nhập / Đăng ký trong tab mới</Link><button type="button" disabled={busy} onClick={()=>void preview(true)} className="mt-3 block font-semibold underline">Chuẩn bị bản để lưu vào tài khoản</button></details>:null}
    {saved ? <p role="status"><Link href={`/ket-noi-ai/ban-luu/${encodeURIComponent(saved.id)}`} className="font-semibold underline">Mở bản dùng lại: {saved.title}</Link></p> : null}
  </section>;
}
