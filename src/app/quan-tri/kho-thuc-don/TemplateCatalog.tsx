"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";

type Item = { id: string; title: string; direction: string; revision: number; updatedAt: string; url: string };
type Opened = { template: Item; content: MenuLibraryDraft; warnings: string[]; foods: { id: string; name: string; unit: string }[]; history: { revision: number; reason: string; createdAt: string }[] };
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const input = "min-h-11 w-full rounded-md border border-[var(--control-line)] bg-white px-3 py-2 font-normal";

export function TemplatePreview({ data }: { data: Opened }) {
  const [dayId, setDayId] = useState(data.content.days[0]?.id ?? ""), [groupId, setGroupId] = useState(""), [mealId, setMealId] = useState("");
  const day = data.content.days.find(item => item.id === dayId);
  const meals = day?.meals.filter(meal => !mealId || meal.id === mealId) ?? [];
  return <section className="min-w-0 rounded-lg border border-[var(--line)] bg-white" aria-label="Chi tiết mẫu">
    <header className="border-b border-[var(--line)] px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold text-[var(--brand)]">{data.content.title}</h2><span className="rounded bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">BẢN NHÁP · v{data.template.revision}</span></div><p className="mt-1 text-sm">{data.content.unit?.label ?? "Cá nhân"} · {data.content.coverage === "served_meals" ? "Các bữa phục vụ" : "Cả ngày"} · {data.content.days.length} ngày · {data.content.groups.length} nhóm</p></header>
    <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--surface-soft)] p-3 sm:grid-cols-3">
      <label className="min-w-0 text-sm font-semibold">Ngày<select value={dayId} onChange={event => { setDayId(event.target.value); setMealId(""); }} className={input}>{data.content.days.map(item => <option key={item.id} value={item.id}>Ngày {item.dayIndex}{item.date ? ` · ${item.date}` : ""}</option>)}</select></label>
      <label className="min-w-0 text-sm font-semibold">Bữa<select value={mealId} onChange={event => setMealId(event.target.value)} className={input}><option value="">Tất cả bữa</option>{day?.meals.map(meal => <option key={meal.id} value={meal.id}>{meal.label}</option>)}</select></label>
      <label className="min-w-0 text-sm font-semibold">Nhóm khẩu phần<select value={groupId} onChange={event => setGroupId(event.target.value)} className={input}><option value="">Tất cả nhóm</option>{data.content.groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
    </div>
    <div className="p-3 sm:p-4">{!day && <p>Chưa có ngày.</p>}{day && !day.meals.length && <p>Chưa có bữa.</p>}
      <div className="grid items-start gap-4 xl:grid-cols-2">{meals.map(meal => <section key={meal.id} className="min-w-0 overflow-hidden rounded-md border border-[var(--line)]"><h3 className="bg-[var(--surface-soft)] px-3 py-2 font-semibold text-[var(--brand)]">Ngày {day!.dayIndex} · {meal.label}</h3>{!meal.groupPortions.length && <p className="p-3 text-sm">Chưa có nhóm suất.</p>}{!!meal.groupPortions.length && !meal.groupPortions.some(portion => !groupId || portion.groupId === groupId) && <p className="p-3 text-sm">Bữa này chưa có suất cho nhóm đã chọn.</p>}{meal.groupPortions.filter(portion => !groupId || portion.groupId === groupId).map(portion => <div key={portion.groupId} className="border-t border-[var(--line)]">
        <div className="flex flex-wrap justify-between gap-2 bg-[#fafcfb] px-3 py-2 text-sm"><h4 className="font-semibold">{data.content.groups.find(group => group.id === portion.groupId)?.label}</h4><span>{portion.headcount === null ? "Chưa nhập số suất" : `${portion.headcount} suất`}</span></div>
        {!portion.dishes.length && <p className="px-3 py-2 text-sm text-neutral-600">Chưa có món.</p>}
        {portion.dishes.map(dish => <div key={dish.id} className="border-t border-[#e0e8e2]"><p className="px-3 py-2 text-sm font-semibold">{dish.label} <span className="font-normal text-neutral-600">· {dish.sourceKind === "ai" ? "AI gợi ý" : dish.sourceKind === "catalog" ? "Công thức tham chiếu trong kho" : "Tự biên soạn"}</span></p>{!!dish.ingredients.length && <table className="w-full table-fixed text-left text-sm"><caption className="sr-only">Nguyên liệu {dish.label}, định lượng sống sạch cho một suất</caption><thead className="bg-[var(--surface-soft)]"><tr><th scope="col" className="px-3 py-1 font-normal">Nguyên liệu</th><th scope="col" className="w-32 px-3 py-1 text-right font-normal">Sống sạch / suất</th></tr></thead><tbody>{dish.ingredients.map((ingredient, index) => <tr key={index} className="border-t border-[#e0e8e2]"><td className="break-words px-3 py-2">{data.foods?.find(food => food.id === ingredient.foodId)?.name ?? ingredient.foodId}</td><td className="px-3 py-2 text-right font-semibold">{ingredient.quantityPerPortion} {ingredient.unit}/suất</td></tr>)}</tbody></table>}{!dish.ingredients.length && <p className="px-3 pb-2 text-sm text-neutral-600">Chưa có nguyên liệu.</p>}</div>)}
      </div>)}</section>)}</div>
    </div>
    {!!data.warnings.length && <details className="border-t border-[var(--line)] px-4 py-3 text-sm"><summary className="cursor-pointer font-semibold text-[#715500]">Lưu ý cần xem lại ({data.warnings.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5">{data.warnings.map(text => <li key={text}>{text}</li>)}</ul></details>}
    <details className="border-t border-[var(--line)] px-4 py-3 text-sm"><summary className="cursor-pointer font-semibold">Lịch sử phiên bản ({data.history.length})</summary><ol className="mt-2 space-y-2">{data.history.map(item => <li key={item.revision}>v{item.revision} · {date(item.createdAt)} · {item.reason}</li>)}</ol></details>
  </section>;
}

export default function TemplateCatalog() {
  const [items, setItems] = useState<Item[]>([]), [opened, setOpened] = useState<Opened | null>(null), [q, setQ] = useState(""), [direction, setDirection] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true), [opening, setOpening] = useState(false), [next, setNext] = useState<number | null>(null);
  const listSequence = useRef(0), openSequence = useRef(0), appliedFilter = useRef({ q: "", direction: "" });
  const open = useCallback(async (id: string) => {
    const sequence = ++openSequence.current; setNotice(""); setOpened(null); setOpening(true);
    try { const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}`, { cache: "no-store" }); const data = await response.json(); if (sequence !== openSequence.current) return; if (!response.ok) throw new Error(data.message ?? "Chưa mở được mẫu."); setOpened(data); window.history.replaceState(null, "", `?template=${encodeURIComponent(id)}`); }
    catch (error) { if (sequence === openSequence.current) setNotice(error instanceof Error ? error.message : "Chưa mở được mẫu."); }
    finally { if (sequence === openSequence.current) setOpening(false); }
  }, []);
  const load = useCallback(async (query = "", offset = 0, kind = "") => {
    const sequence = ++listSequence.current; setLoading(true); setNotice("");
    try { const response = await fetch(`/api/admin/menu-library/templates?q=${encodeURIComponent(query)}&offset=${offset}&direction=${encodeURIComponent(kind)}`, { cache: "no-store" }); const data = await response.json(); if (sequence !== listSequence.current) return; if (!response.ok) throw new Error(data.message ?? "Chưa tải được kho mẫu."); appliedFilter.current = { q: query, direction: kind }; setItems(previous => offset ? [...previous, ...data.items] : data.items); setNext(data.nextOffset); }
    catch (error) { if (sequence === listSequence.current) setNotice(error instanceof Error ? error.message : "Chưa tải được kho mẫu."); }
    finally { if (sequence === listSequence.current) setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => { void load(); const selected = new URLSearchParams(window.location.search).get("template"); if (selected) void open(selected); }); }, [load, open]);
  function close() { openSequence.current++; setOpened(null); setOpening(false); window.history.replaceState(null, "", window.location.pathname); }
  function search(event: FormEvent) { event.preventDefault(); close(); void load(q, 0, direction); }
  async function copyLink(item: Item) { try { await navigator.clipboard.writeText(item.url); setNotice("Đã sao chép liên kết mẫu."); } catch { setNotice("Chưa sao chép được. Mở mẫu rồi sao chép địa chỉ trên trình duyệt."); } }
  return <div className="space-y-3">
    <form onSubmit={search} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-[var(--line)] bg-white p-3 md:grid-cols-[minmax(0,1fr)_10rem_auto_auto]"><label className="col-span-2 min-w-0 text-sm font-semibold md:col-span-1">Tìm mẫu<input value={q} onChange={event => setQ(event.target.value)} maxLength={100} placeholder="Nhập tên thực đơn" className={input} /></label><label className="col-span-2 min-w-0 text-sm font-semibold md:col-span-1">Nhánh<select value={direction} onChange={event => { const kind = event.target.value; setDirection(kind); close(); void load(q, 0, kind); }} className={input}><option value="">Tất cả</option><option value="collective">Tập thể</option><option value="individual">Cá nhân</option></select></label><button disabled={loading} className="min-h-11 rounded-md bg-[var(--brand)] px-4 py-2 font-semibold text-white">Tìm kiếm</button><button type="button" disabled={loading} onClick={() => { void load(q, 0, direction); if (opened) void open(opened.template.id); }} className="min-h-11 rounded-md border border-[var(--control-line)] px-3 py-2">Làm mới</button></form>
    {notice && <p role="status" className="rounded-lg border border-[#d8c992] bg-[#fff9e7] px-4 py-2">{notice}</p>}
    {(loading || opening) && <p role="status">{opening ? "Đang mở mẫu…" : "Đang tải kho mẫu…"}</p>}
    {opened && <><button type="button" onClick={close} className="min-h-11 py-2 font-semibold text-[var(--brand)] underline">← Danh sách mẫu</button><TemplatePreview key={`${opened.template.id}-${opened.template.revision}`} data={opened} /></>}
    {!opened && !opening && <>
      <section aria-label="Danh sách mẫu" className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2 text-sm"><h2 className="font-semibold text-[var(--brand)]">Danh sách mẫu · {items.length}{next !== null ? "+" : ""}</h2><span className="text-neutral-600">Cập nhật gần nhất trước</span></div>
        {!loading && !items.length && <div className="p-4"><h3 className="font-semibold text-[var(--brand)]">Chưa có mẫu phù hợp</h3><a href="/quan-tri/ket-noi-ai" className="mt-2 inline-block py-2 text-sm font-semibold underline">Mở ủy quyền AI →</a></div>}
        <ul className="divide-y divide-[var(--line)]">{items.map(item => <li key={item.id} className="grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-1 px-4 py-2 hover:bg-[var(--surface-soft)] sm:grid-cols-[minmax(0,1fr)_6rem_11rem_auto]"><button type="button" onClick={() => void open(item.id)} className="col-span-2 min-h-11 min-w-0 break-words sm:col-span-1 py-2 text-left font-semibold text-[var(--brand)] underline-offset-4 hover:underline">{item.title}</button><span className="text-sm">{item.direction === "collective" ? "Tập thể" : "Cá nhân"}<span className="block text-xs text-[var(--muted)]">Nháp v{item.revision}</span></span><time className="text-sm text-neutral-600" dateTime={item.updatedAt}>{date(item.updatedAt)}</time><div className="col-span-2 flex gap-2 sm:col-span-1"><button type="button" onClick={() => void open(item.id)} aria-label={`Xem mẫu ${item.title}`} className="min-h-11 rounded-md border border-[var(--control-line)] px-3 py-2 text-sm font-semibold">Xem</button><button type="button" onClick={() => void copyLink(item)} aria-label={`Sao chép liên kết ${item.title}`} className="min-h-11 px-2 py-2 text-sm underline">Chép link</button></div></li>)}</ul>
      </section>
      {next !== null && <button type="button" disabled={loading} onClick={() => void load(appliedFilter.current.q, next, appliedFilter.current.direction)} className="min-h-11 rounded-lg border border-[var(--control-line)] px-5 py-2">Xem thêm mẫu</button>}
    </>}
  </div>;
}
