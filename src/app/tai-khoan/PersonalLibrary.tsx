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
const control = "mt-1 block min-h-11 w-full min-w-0 rounded border border-[#8fa99e] bg-white px-3 py-2 text-base text-[#123c36] focus:border-[#123c36] focus:outline-none focus:ring-2 focus:ring-[#b1c8bd]";
const button = "inline-flex min-h-11 items-center justify-center rounded border border-[#123c36] bg-[#123c36] px-4 py-2 text-base font-semibold text-white hover:bg-[#1c5148] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c36] disabled:cursor-wait disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center rounded border border-[#8fa99e] bg-white px-4 py-2 text-base font-semibold text-[#123c36] hover:border-[#123c36] hover:bg-[#edf4f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c36] disabled:cursor-wait disabled:opacity-50";
const fieldLabel = "block min-w-0 text-sm font-semibold text-[#123c36]";
const freshFood = (): CustomFoodInput => ({ id: "draft", name: "", source: { kind: "user", label: "", confirmed: false }, basis: "100g", portionUnit: "g", nutrients: {} });
const freshDish = (): MenuInput => ({ title: "", mode: "menu", comparison: { mode: "none" }, days: [{ id: "recipe", date: "", label: "Công thức", rows: [] }] });

export default function PersonalLibrary({ kind, items, nextPage, q, page, initialDraft }: { kind: "food" | "dish"; items: Summary[]; nextPage: number | null; q: string; page: number; initialDraft?: { content: CustomFoodInput | MenuInput; names: Record<string, string>; sourceLabel: string } }) {
  const router = useRouter(), key = useRef<string | null>(null);
  const editor = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<Summary | "new" | null>(initialDraft ? "new" : null), [food, setFood] = useState(() => kind === "food" && initialDraft ? initialDraft.content as CustomFoodInput : freshFood()), [dish, setDish] = useState(() => kind === "dish" && initialDraft ? initialDraft.content as MenuInput : freshDish());
  const [names, setNames] = useState<Record<string, string>>(initialDraft?.names ?? {}), [reason, setReason] = useState(initialDraft ? `Lưu từ thực đơn ${initialDraft.sourceLabel}`.slice(0, 500) : "Lưu trong thư viện cá nhân để dùng lại");
  const [preview, setPreview] = useState(false), [analysis, setAnalysis] = useState<ResolvedMenu | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const path = `/tai-khoan/${kind === "food" ? "thuc-pham" : "mon-an"}`, api = `/api/personal-library/${kind}`;
  function changed() { setPreview(false); setAnalysis(null); key.current = null; setError(""); setMessage(""); }
  function content() { return kind === "food" ? food : { ...dish, days: [{ ...dish.days[0], rows: dish.days[0].rows.map(row => ({ ...row, dish: dish.title })) }] }; }
  function revealEditor() { requestAnimationFrame(() => { editor.current?.scrollIntoView({ block: "start" }); editor.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }); }); }
  function create() { changed(); setEditing("new"); setFood(freshFood()); setDish(freshDish()); setNames({}); revealEditor(); }
  async function edit(item: Summary) {
    setBusy(true); changed();
    try {
      const data = await readNutritionResponse<Summary & { content: CustomFoodInput | MenuInput; preview?: ResolvedMenu }>(await fetch(`${api}?id=${encodeURIComponent(item.id)}`, { cache: "no-store" }));
      setEditing(data);
      if (kind === "food") setFood(data.content as CustomFoodInput);
      else { setDish(data.content as MenuInput); setNames(Object.fromEntries((data.preview?.days[0].rows ?? []).map(row => [row.id, row.food.name]))); }
      revealEditor();
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
  const noun = kind === "food" ? "thực phẩm" : "món ăn";
  return <div className="min-w-0 space-y-5">
    <div className="max-w-3xl text-neutral-700">
      <p>{kind === "food" ? "Lưu số liệu thực phẩm riêng để dùng lại khi lập thực đơn. Giữ rõ nguồn và cơ sở 100 g, 100 ml hoặc theo phần." : "Lưu món ăn cùng từng nguyên liệu và định lượng để dùng lại khi lập thực đơn."}</p>
      <p className="mt-2 text-sm">Sửa thư viện không thay đổi những thực đơn đã lưu trước đó.</p>
    </div>
    <div className="flex flex-col gap-3 rounded border border-[#b1c8bd] bg-white p-4 sm:flex-row sm:items-end">
      <form action={path} className="flex min-w-0 flex-1 items-end gap-2" role="search" aria-label={`Tìm ${noun} đã lưu`}>
        <label className={`${fieldLabel} flex-1`}>Tìm {noun} đã lưu<input name="q" defaultValue={q} maxLength={100} placeholder={`Nhập tên ${noun}`} className={control} /></label>
        <button className={secondary}>Tìm</button>
      </form>
      <button type="button" disabled={busy} onClick={create} className={button}>{kind === "food" ? "Thêm thực phẩm" : "Thêm món ăn"}</button>
    </div>
    {message ? <p role="status" className="rounded border border-[#8fa99e] bg-[#edf4f0] px-4 py-3 font-semibold text-[#123c36]">{message}</p> : null}
    {error ? <p role="alert" className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-900">{error}</p> : null}
    {busy && !editing ? <p role="status" className="text-neutral-700">Đang mở dữ liệu đã lưu…</p> : null}
    {editing ? <form ref={editor} onSubmit={event => void showPreview(event)} aria-busy={busy} className="scroll-mt-24 overflow-hidden rounded border border-[#8fa99e] bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#b1c8bd] bg-[#edf4f0] px-4 py-4 sm:px-6">
        <div className="min-w-0"><h2 className="break-words text-xl font-semibold text-[#123c36]">{editing === "new" ? `Thêm ${noun} vào thư viện` : `Chỉnh sửa ${noun}`}</h2><p className="mt-1 text-sm text-neutral-700">{editing === "new" ? "Nhập thông tin → xem trước → xác nhận lưu." : `${editing.name} · Phiên bản ${editing.revision}`}</p></div>
        <button type="button" disabled={busy} onClick={() => setEditing(null)} className={secondary}>Đóng biểu mẫu</button>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <label className={fieldLabel}>{kind === "food" ? "Tên thực phẩm" : "Tên món ăn"}<input required maxLength={kind === "food" ? 300 : 160} value={kind === "food" ? food.name : dish.title} onChange={e => { changed(); if (kind === "food") setFood({ ...food, name: e.target.value }); else setDish({ ...dish, title: e.target.value }); }} className={control} /></label>
          {kind === "food" ? <>
            <section className="space-y-4 border-t border-[#d7e2dc] pt-4" aria-label="Nguồn và cơ sở số liệu">
              <h3 className="text-lg font-semibold">Nguồn và cơ sở số liệu</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={fieldLabel}>Loại nguồn<select value={food.source.kind} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, kind: e.target.value as CustomFoodInput["source"]["kind"] } }); }} className={control}><option value="user">Số liệu người dùng cung cấp</option><option value="label">Nhãn sản phẩm</option><option value="document">Tài liệu thành phần</option><option value="unknown">Chưa có nguồn (để trống số liệu)</option></select></label>
                <label className={fieldLabel}>Cơ sở số liệu<select value={food.basis} onChange={e => { changed(); setFood({ ...food, basis: e.target.value as CustomFoodInput["basis"] }); }} className={control}><option value="100g">Trên 100 g</option><option value="100ml">Trên 100 ml</option><option value="portion">Theo một phần</option></select></label>
                {food.basis === "portion" ? <><label className={fieldLabel}>Lượng của một phần<input required type="number" min={0.000001} max={1000000} step="any" value={food.portionAmount ?? ""} onChange={e => { changed(); setFood({ ...food, portionAmount: e.target.value === "" ? undefined : Number(e.target.value) }); }} className={control} /></label><label className={fieldLabel}>Đơn vị phần<select value={food.portionUnit ?? "g"} onChange={e => { changed(); setFood({ ...food, portionUnit: e.target.value as "g" | "ml" }); }} className={control}><option value="g">g</option><option value="ml">ml</option></select></label></> : null}
                <label className={`${fieldLabel} sm:col-span-2`}>Tên nguồn / thông tin nhãn<input required={food.source.kind !== "unknown"} maxLength={500} value={food.source.label} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, label: e.target.value } }); }} className={control} /></label>
                <label className={fieldLabel}>Link nguồn HTTPS (nếu có)<input type="url" maxLength={2083} value={food.source.url ?? ""} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, url: e.target.value || undefined } }); }} className={control} /></label>
                <label className={fieldLabel}>Tỷ lệ thải bỏ % (nếu có nguồn)<input type="number" min={0} max={99.9999} step="any" value={food.wastePercent ?? ""} onChange={e => { changed(); setFood({ ...food, wastePercent: e.target.value === "" ? null : Number(e.target.value) }); }} className={control} /></label>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded border border-[#b1c8bd] bg-[#f5f8f5] p-3 text-base"><input type="checkbox" checked={food.source.confirmed} onChange={e => { changed(); setFood({ ...food, source: { ...food.source, confirmed: e.target.checked } }); }} className="mt-1 size-4 shrink-0 accent-[#123c36]" /><span>Tôi đã kiểm tra nguồn và cơ sở tính này.</span></label>
            </section>
            <section className="space-y-3 border-t border-[#d7e2dc] pt-4" aria-label="Nhập thành phần dinh dưỡng">
              <div><h3 className="text-lg font-semibold">Thành phần dinh dưỡng</h3><p className="mt-1 text-sm text-neutral-700">Nhập theo cơ sở đã chọn. Chất chưa có số liệu để trống; số 0 là giá trị đã biết.</p></div>
              {NUTRIENT_GROUPS.map((group, index) => <details key={group.title} open={index === 0} className="rounded border border-[#b1c8bd]">
                <summary className="cursor-pointer px-4 py-3 font-semibold marker:text-[#123c36] focus-visible:outline-2 focus-visible:outline-[#123c36]">{group.title}<span className="ml-2 text-sm font-normal text-neutral-600">{group.fields.filter(field => food.nutrients[field.key] != null).length}/{group.fields.length} chỉ tiêu đã nhập</span></summary>
                <div className="grid gap-4 border-t border-[#d7e2dc] p-4 sm:grid-cols-2">{group.fields.map(field => <label key={field.key} className={fieldLabel}>{field.label} <span className="font-normal text-neutral-600">({field.unit})</span><input type="number" min={0} max={1000000} step="any" value={food.nutrients[field.key] ?? ""} onChange={e => { changed(); setFood({ ...food, nutrients: { ...food.nutrients, [field.key]: e.target.value === "" ? null : Number(e.target.value) } }); }} className={control} /></label>)}</div>
              </details>)}
            </section>
          </> : <>
            <LibraryIngredientPicker recipes onPick={(rows, addedNames) => { changed(); setNames({ ...names, ...addedNames }); setDish({ ...dish, days: [{ ...dish.days[0], rows: [...dish.days[0].rows, ...rows] }] }); }} />
            <section className="min-w-0" aria-label="Nguyên liệu của món ăn">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-semibold">Thành phần món ăn</h3><span className="text-sm text-neutral-600">{dish.days[0].rows.length} dòng nguyên liệu</span></div>
              <p className="mb-3 text-sm text-neutral-700">Định lượng dưới đây là toàn công thức. Kiểm tra số phần khi đưa vào thực đơn.</p>
              {dish.days[0].rows.length ? <div className="relative overflow-x-auto rounded border border-[#b1c8bd]">
                <table className="w-full min-w-[36rem] border-collapse text-left text-base">
                  <caption className="sr-only">Nguyên liệu, định lượng, đơn vị và nguồn của công thức</caption>
                  <thead className="bg-[#edf4f0]"><tr><th scope="col" className="px-3 py-3 font-semibold">Thực phẩm / nguồn</th><th scope="col" className="w-32 px-3 py-3 text-right font-semibold">Định lượng</th><th scope="col" className="w-16 px-2 py-3 font-semibold">Đơn vị</th><th scope="col" className="w-20 px-3 py-3"><span className="sr-only">Thao tác</span></th></tr></thead>
                  <tbody className="divide-y divide-[#d7e2dc]">{dish.days[0].rows.map((row, index) => <tr key={row.id} className="align-top">
                    <td className="px-3 py-3"><p className="font-semibold">{names[row.id] || row.customFood?.name || "Thực phẩm chưa xác định tên"}</p><p className="mt-1 text-sm text-neutral-600">{row.basis === "raw" ? "Nguyên liệu thô" : row.basis === "cooked" ? "Sau chế biến" : "Phần ăn được"} · {row.recipeSource.label}</p>{row.servings !== 1 ? <p className="mt-1 text-sm text-neutral-600">Số suất: {row.servings}</p> : null}</td>
                    <td className="px-3 py-3"><input aria-label={`Định lượng ${names[row.id] || row.customFood?.name || `nguyên liệu ${index + 1}`} (${row.unit})`} type="number" min={0} max={1000000} step="any" value={row.quantity ?? ""} onChange={e => { changed(); const rows = [...dish.days[0].rows]; rows[index] = { ...row, quantity: e.target.value === "" ? null : Number(e.target.value) }; setDish({ ...dish, days: [{ ...dish.days[0], rows }] }); }} className={`${control} !mt-0 text-right tabular-nums`} /></td>
                    <td className="px-2 py-5">{row.unit}</td>
                    <td className="px-3 py-3"><button type="button" aria-label={`Bỏ ${names[row.id] || row.customFood?.name || `nguyên liệu ${index + 1}`}`} onClick={() => { changed(); setDish({ ...dish, days: [{ ...dish.days[0], rows: dish.days[0].rows.filter(r => r.id !== row.id) }] }); }} className="min-h-11 rounded px-2 text-sm text-red-800 underline underline-offset-4 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-800">Bỏ</button></td>
                  </tr>)}</tbody>
                </table>
              </div> : <p className="rounded border border-dashed border-[#b1c8bd] bg-[#f8faf9] p-5 text-neutral-700">Chưa có nguyên liệu. Tìm và thêm từ thư viện hoặc kho dữ liệu ở phía trên.</p>}
            </section>
          </>}
          <label className={`${fieldLabel} border-t border-[#d7e2dc] pt-4`}>Lý do lưu / sửa / xóa<input required minLength={5} maxLength={500} value={reason} onChange={e => { changed(); setReason(e.target.value); }} className={control} /></label>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e2dc] pt-4"><button disabled={busy} className={button}>{busy ? "Đang xử lý…" : "Xem trước dữ liệu"}</button>{editing !== "new" ? <button type="button" disabled={busy} onClick={() => void remove()} className="min-h-11 rounded px-2 text-base text-red-800 underline underline-offset-4 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-800 disabled:opacity-50">Xóa khỏi thư viện</button> : null}</div>
        {preview ? <section className="space-y-4 rounded border border-[#8fa99e] bg-[#f5f8f5] p-4" aria-label="Xem trước dữ liệu thư viện">
          <div><h3 className="text-xl font-semibold">Kiểm tra trước khi lưu</h3><p className="mt-1 text-sm text-neutral-700">Kiểm tra tên, nguồn và số liệu. Sau khi lưu, chọn “Dùng trong thực đơn” ở danh sách bên dưới.</p></div>
          {kind === "food" ? <>
            <div className="border-y border-[#b1c8bd] py-3"><p className="break-words text-lg font-semibold">{food.name}</p><p className="mt-1">Cơ sở: {food.basis === "100g" ? "100 g" : food.basis === "100ml" ? "100 ml" : `${food.portionAmount} ${food.portionUnit ?? "g"} / phần`}</p><p className="mt-1 break-words text-sm text-neutral-700">Nguồn: {food.source.label || "Chưa có nguồn"} · {food.source.confirmed ? "đã xác nhận" : "chưa xác nhận"}</p>{food.source.url ? <a href={food.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold underline underline-offset-4">Mở tài liệu nguồn</a> : null}</div>
            <dl className="grid gap-x-6 sm:grid-cols-2">{ALL_NUTRIENT_FIELDS.filter(field => food.nutrients[field.key] != null).map(field => <div key={field.key} className="flex items-baseline justify-between gap-3 border-b border-[#d7e2dc] py-2"><dt>{field.label}</dt><dd className="shrink-0 font-semibold tabular-nums">{food.nutrients[field.key]} {field.unit}</dd></div>)}</dl>
            <p className="text-sm text-neutral-600">Các chất không liệt kê vẫn thiếu số liệu.</p>
          </> : analysis ? <NutritionMenuAnalysis menu={analysis} /> : null}
          <button type="button" disabled={busy} onClick={() => void save()} className={button}>{busy ? "Đang lưu…" : "Xác nhận và lưu vào thư viện"}</button>
        </section> : null}
      </div>
    </form> : null}
    <section aria-label={`Danh sách ${noun} đã lưu`} className="overflow-hidden rounded border border-[#b1c8bd] bg-white">
      <div className="border-b border-[#b1c8bd] bg-[#edf4f0] px-4 py-3"><h2 className="text-lg font-semibold">{kind === "food" ? "Thực phẩm đã lưu" : "Món ăn đã lưu"}</h2>{q ? <p className="mt-1 text-sm text-neutral-700">Kết quả tìm “{q}” · <Link href={path} className="font-semibold underline underline-offset-4">Xem tất cả</Link></p> : null}</div>
      {items.length ? <ul className="divide-y divide-[#d7e2dc]">{items.map(item => <li key={item.id} className={`flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${editing !== null && editing !== "new" && editing.id === item.id ? "bg-[#f0f6f3]" : ""}`}>
        <div className="min-w-0"><h3 className="break-words text-lg font-semibold">{item.name}</h3><p className="mt-1 text-sm text-neutral-600">Cập nhật {new Date(item.updatedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Phiên bản {item.revision}</p></div>
        <div className="flex shrink-0 flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void edit(item)} className={secondary} aria-label={`Xem hoặc sửa ${item.name}`}>Xem / sửa</button><Link href={`/tai-khoan/thuc-don/moi?${kind}=${encodeURIComponent(item.id)}`} className={button} aria-label={`Dùng ${item.name} trong thực đơn`}>Dùng trong thực đơn</Link></div>
      </li>)}</ul> : <div className="space-y-2 p-6 text-center"><h3 className="text-lg font-semibold">{q ? `Chưa tìm thấy ${noun}` : `Chưa có ${noun} trong thư viện`}</h3><p className="mx-auto max-w-lg text-neutral-700">{q ? "Thử tên ngắn hơn hoặc bỏ bộ lọc để xem tất cả mục đã lưu." : kind === "food" ? "Thêm thực phẩm cùng nguồn và số liệu đã biết. Bạn có thể chọn lại khi lập nhiều thực đơn." : "Tạo món từ từng nguyên liệu, lưu công thức một lần để dùng lại trong nhiều thực đơn."}</p><button type="button" disabled={busy} onClick={create} className={`${secondary} mt-2`}>{kind === "food" ? "Thêm thực phẩm đầu tiên" : "Thêm món ăn đầu tiên"}</button></div>}
      {page > 0 || nextPage !== null ? <nav aria-label="Trang thư viện" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#b1c8bd] px-4 py-3"><span className="text-sm text-neutral-600">Trang {page + 1}</span><div className="flex gap-2">{page > 0 ? <Link href={pageUrl(page - 1)} className={secondary}>Trang trước</Link> : null}{nextPage !== null ? <Link href={pageUrl(nextPage)} className={secondary}>Trang sau</Link> : null}</div></nav> : null}
    </section>
  </div>;
}
