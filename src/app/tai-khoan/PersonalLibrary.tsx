"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ALL_NUTRIENT_FIELDS, NUTRIENT_GROUPS } from "@/lib/nutrient-fields";
import type { CustomFoodInput, MenuInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { parseCustomFoodInput } from "@/lib/nutrition-chat/validation";
import { readNutritionResponse } from "@/app/ket-noi-ai/client-api";
import NutritionMenuAnalysis from "@/app/ket-noi-ai/NutritionMenuAnalysis";
import LibraryIngredientPicker from "./LibraryIngredientPicker";

type Summary = { id: string; name: string; revision: number; updatedAt: string };
const control = "mt-1 block w-full rounded border border-[#8fa99e] bg-white px-3 py-2 text-sm";
const button = "rounded bg-[#123c36] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const freshFood = (): CustomFoodInput => ({ id: "draft", name: "", source: { kind: "user", label: "", confirmed: false }, basis: "100g", portionUnit: "g", nutrients: {} });
const freshDish = (): MenuInput => ({ title: "", mode: "menu", comparison: { mode: "none" }, days: [{ id: "recipe", date: "", label: "Công thức", rows: [] }] });

export default function PersonalLibrary({ kind, items, nextPage, q, page, initialDraft }: { kind: "food" | "dish"; items: Summary[]; nextPage: number | null; q: string; page: number; initialDraft?: { content: CustomFoodInput | MenuInput; names: Record<string, string>; sourceLabel: string } }) {
  const router = useRouter(), key = useRef<string | null>(null);
  const [editing, setEditing] = useState<Summary | "new" | null>(initialDraft ? "new" : null), [food, setFood] = useState(() => kind === "food" && initialDraft ? initialDraft.content as CustomFoodInput : freshFood()), [dish, setDish] = useState(() => kind === "dish" && initialDraft ? initialDraft.content as MenuInput : freshDish());
  const [names, setNames] = useState<Record<string, string>>(initialDraft?.names ?? {}), [reason, setReason] = useState(initialDraft ? `Lưu từ thực đơn ${initialDraft.sourceLabel}`.slice(0, 500) : "Lưu trong thư viện cá nhân để dùng lại");
  const [preview, setPreview] = useState(false), [analysis, setAnalysis] = useState<ResolvedMenu | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const path = `/tai-khoan/${kind === "food" ? "thuc-pham" : "mon-an"}`, api = `/api/personal-library/${kind}`;
  function changed() { setPreview(false); setAnalysis(null); key.current = null; setError(""); setMessage(""); }
  function content() { return kind === "food" ? food : { ...dish, days: [{ ...dish.days[0], rows: dish.days[0].rows.map(row => ({ ...row, dish: dish.title })) }] }; }
  function create() { changed(); setEditing("new"); setFood(freshFood()); setDish(freshDish()); setNames({}); }
  async function edit(item: Summary) {
    setBusy(true); changed();
    try {
      const data = await readNutritionResponse<Summary & { content: CustomFoodInput | MenuInput; preview?: ResolvedMenu }>(await fetch(`${api}?id=${encodeURIComponent(item.id)}`, { cache: "no-store" }));
      setEditing(data);
      if (kind === "food") setFood(data.content as CustomFoodInput);
      else { setDish(data.content as MenuInput); setNames(Object.fromEntries((data.preview?.days[0].rows ?? []).map(row => [row.id, row.food.name]))); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa mở được mục này."); }
    finally { setBusy(false); }
  }
  async function showPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setPreview(false);
    try {
      if (kind === "food") parseCustomFoodInput(food);
      else {
        const data = await readNutritionResponse<{ preview: ResolvedMenu }>(await fetch("/api/nutrition/v1/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: content() }) }));
        setAnalysis(data.preview);
      }
      key.current = crypto.randomUUID(); setPreview(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xem trước được dữ liệu."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!preview || !editing || !key.current || busy) return;
    setBusy(true); setError("");
    try {
      const data = await readNutritionResponse<{ name: string }>(await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: content(), requestKey: key.current, reason, confirmed: true, ...(editing !== "new" ? { id: editing.id, expectedRevision: editing.revision } : {}) }) }));
      setMessage(`Đã lưu “${data.name}” trong thư viện cá nhân.`); setEditing(null); setPreview(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được dữ liệu."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!editing || editing === "new" || busy || !window.confirm(`Xóa “${editing.name}” khỏi thư viện? Các thực đơn đã lưu vẫn giữ bản số liệu/công thức đã dùng.`)) return;
    setBusy(true); setError("");
    try {
      await readNutritionResponse(await fetch(api, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, expectedRevision: editing.revision, reason }) }));
      setEditing(null); setMessage("Đã xóa khỏi thư viện cá nhân."); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xóa được mục này."); }
    finally { setBusy(false); }
  }
  const pageUrl = (value: number) => `${path}?page=${value}&q=${encodeURIComponent(q)}`;
  return <div>
    <p className="text-neutral-700">{kind === "food" ? "Lưu thực phẩm tự nhập cùng nguồn, cơ sở tính và các chất đã biết. Chất chưa có số liệu được để trống." : "Lưu công thức riêng từ nguyên liệu trong kho hoặc thực phẩm của bạn. Định lượng là toàn công thức; kiểm tra số phần khi đưa vào thực đơn."}</p>
    <p className="mt-2 text-sm text-neutral-700">Thư viện thuộc tài khoản của bạn. Sửa hoặc xóa ở đây không đổi các thực đơn đã lưu trước đó.</p>
    <div className="mt-5 flex flex-wrap items-end gap-3"><form className="flex min-w-0 flex-1 gap-2"><label className="min-w-0 flex-1 text-sm">Tìm theo tên<input name="q" defaultValue={q} maxLength={100} className={control} /></label><button className="self-end rounded border border-[#123c36] px-3 py-2 text-sm">Tìm</button></form><button type="button" disabled={busy} onClick={create} className={button}>{kind === "food" ? "Thêm thực phẩm riêng" : "Thêm món riêng"}</button></div>
    {message ? <p role="status" className="mt-4">{message}</p> : null}{error ? <p role="alert" className="mt-4 text-red-800">{error}</p> : null}
    <ul className="mt-5 divide-y border-y border-[#b1c8bd]">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-sm text-neutral-600">Phiên bản {item.revision} · {new Date(item.updatedAt).toLocaleString("vi-VN")}</p></div><div className="flex gap-3 text-sm"><button type="button" disabled={busy} onClick={() => void edit(item)} className="underline">Xem / sửa</button><Link href={`/tai-khoan/thuc-don/moi?${kind}=${encodeURIComponent(item.id)}`} className="font-semibold underline">Dùng trong thực đơn</Link></div></li>)}</ul>
    {!items.length ? <p className="mt-4 text-sm">{q ? "Không có mục khớp tên này." : "Chưa có mục được lưu độc lập. Chọn nút thêm phía trên để bắt đầu."}</p> : null}
    <nav aria-label="Trang thư viện" className="mt-4 flex gap-5 text-sm">{page > 0 ? <Link href={pageUrl(page - 1)} className="underline">Trang trước</Link> : null}{nextPage !== null ? <Link href={pageUrl(nextPage)} className="underline">Trang sau</Link> : null}</nav>
    {editing ? <form onSubmit={event => void showPreview(event)} className="mt-6 space-y-4 rounded-lg border border-[#8fa99e] bg-white p-4 sm:p-6"><div className="flex justify-between gap-3"><h2 className="text-xl font-semibold">{editing === "new" ? "Tạo mục riêng" : `Sửa ${editing.name}`}</h2><button type="button" disabled={busy} onClick={() => setEditing(null)} className="text-sm underline">Đóng biểu mẫu</button></div>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm">{kind === "food" ? "Tên thực phẩm" : "Tên món"}<input required maxLength={kind === "food" ? 300 : 160} value={kind === "food" ? food.name : dish.title} onChange={e => { changed(); if (kind === "food") setFood({ ...food, name: e.target.value }); else setDish({ ...dish, title: e.target.value }); }} className={control} /></label>
        {kind === "food" ? <>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Loại nguồn<select value={food.source.kind} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, kind: e.target.value as CustomFoodInput["source"]["kind"] } }); }} className={control}><option value="user">Số liệu người dùng cung cấp</option><option value="label">Nhãn sản phẩm</option><option value="document">Tài liệu thành phần</option><option value="unknown">Chưa có nguồn (để trống số liệu)</option></select></label><label className="text-sm">Cơ sở số liệu<select value={food.basis} onChange={e => { changed(); setFood({ ...food, basis: e.target.value as CustomFoodInput["basis"] }); }} className={control}><option value="100g">Trên 100 g</option><option value="100ml">Trên 100 ml</option><option value="portion">Theo một phần</option></select></label></div>
          {food.basis === "portion" ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Lượng của một phần<input required type="number" min={0.000001} max={1000000} step="any" value={food.portionAmount ?? ""} onChange={e => { changed(); setFood({ ...food, portionAmount: e.target.value === "" ? undefined : Number(e.target.value) }); }} className={control} /></label><label className="text-sm">Đơn vị phần<select value={food.portionUnit ?? "g"} onChange={e => { changed(); setFood({ ...food, portionUnit: e.target.value as "g" | "ml" }); }} className={control}><option value="g">g</option><option value="ml">ml</option></select></label></div> : null}
          <label className="block text-sm">Tên nguồn / thông tin nhãn<input required={food.source.kind !== "unknown"} maxLength={500} value={food.source.label} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, label: e.target.value } }); }} className={control} /></label>
          <label className="block text-sm">Link nguồn HTTPS (nếu có)<input type="url" maxLength={2083} value={food.source.url ?? ""} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, url: e.target.value || undefined } }); }} className={control} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={food.source.confirmed} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, confirmed: e.target.checked } }); }} />Tôi đã kiểm tra nguồn và cơ sở tính này.</label>
          <label className="block text-sm">Tỷ lệ thải bỏ % (nếu có nguồn)<input type="number" min={0} max={99.9999} step="any" value={food.wastePercent ?? ""} onChange={e => { changed(); setFood({ ...food, wastePercent: e.target.value === "" ? null : Number(e.target.value) }); }} className={control} /></label>
          <p className="text-sm text-neutral-700">Mở từng nhóm để nhập số liệu theo cơ sở đã chọn. Ô trống khác số 0; không tự điền các chất chưa có nguồn.</p>
          {NUTRIENT_GROUPS.map((group, index) => <details key={group.title} open={index === 0} className="rounded border border-[#b1c8bd] p-3"><summary className="cursor-pointer text-sm font-semibold">{group.title}</summary><div className="mt-3 grid gap-3 sm:grid-cols-3">{group.fields.map(field => <label key={field.key} className="text-sm">{field.label} ({field.unit})<input type="number" min={0} max={1000000} step="any" value={food.nutrients[field.key] ?? ""} onChange={e => { changed(); setFood({ ...food, nutrients: { ...food.nutrients, [field.key]: e.target.value === "" ? null : Number(e.target.value) } }); }} className={control} /></label>)}</div></details>)}
        </> : <>
          <LibraryIngredientPicker recipes onPick={(rows, addedNames) => { changed(); setNames({ ...names, ...addedNames }); setDish({ ...dish, days: [{ ...dish.days[0], rows: [...dish.days[0].rows, ...rows] }] }); }} />
          <ul className="space-y-3">{dish.days[0].rows.map((row, index) => <li key={row.id} className="rounded border border-[#b1c8bd] p-3"><p className="text-sm font-semibold">{names[row.id] || row.customFood?.name || row.foodId}</p><label className="mt-2 block text-sm">Định lượng ({row.unit})<input type="number" min={0} max={1000000} step="any" value={row.quantity ?? ""} onChange={e => { changed(); const rows = [...dish.days[0].rows]; rows[index] = { ...row, quantity: e.target.value === "" ? null : Number(e.target.value) }; setDish({ ...dish, days: [{ ...dish.days[0], rows }] }); }} className={control} /></label><p className="mt-1 text-xs text-neutral-600">{row.basis === "raw" ? "Nguyên liệu thô" : row.basis === "cooked" ? "Sau chế biến" : "Phần ăn được"} · {row.recipeSource.label}</p><button type="button" onClick={() => { changed(); setDish({ ...dish, days: [{ ...dish.days[0], rows: dish.days[0].rows.filter(r => r.id !== row.id) }] }); }} className="mt-2 text-sm text-red-800 underline">Bỏ nguyên liệu</button></li>)}</ul>
        </>}
        <label className="block text-sm">Lý do lưu / sửa / xóa<input required minLength={5} maxLength={500} value={reason} onChange={e => { changed(); setReason(e.target.value); }} className={control} /></label>
      </fieldset>
      <div className="flex flex-wrap gap-4"><button disabled={busy} className={button}>{busy ? "Đang xử lý…" : "Xem trước dữ liệu"}</button>{editing !== "new" ? <button type="button" disabled={busy} onClick={() => void remove()} className="text-sm text-red-800 underline">Xóa khỏi thư viện</button> : null}</div>
      {preview ? <section className="space-y-3 border-t border-[#b1c8bd] pt-4" aria-label="Xem trước dữ liệu thư viện"><h3 className="font-semibold">Kiểm tra trước khi lưu</h3>{kind === "food" ? <><p>{food.name} · {food.basis === "100g" ? "100 g" : food.basis === "100ml" ? "100 ml" : `${food.portionAmount} ${food.portionUnit ?? "g"} / phần`}</p><p className="text-sm">Nguồn: {food.source.label || "Chưa có nguồn"} · {food.source.confirmed ? "đã xác nhận" : "chưa xác nhận"}</p><dl className="grid gap-2 text-sm sm:grid-cols-2">{ALL_NUTRIENT_FIELDS.filter(field => food.nutrients[field.key] != null).map(field => <div key={field.key}><dt className="inline">{field.label}: </dt><dd className="inline font-semibold">{food.nutrients[field.key]} {field.unit}</dd></div>)}</dl><p className="text-sm text-neutral-600">Các chất không liệt kê vẫn thiếu số liệu.</p></> : analysis ? <NutritionMenuAnalysis menu={analysis} /> : null}<button type="button" disabled={busy} onClick={() => void save()} className={button}>Xác nhận và lưu vào thư viện</button></section> : null}
    </form> : null}
  </div>;
}
