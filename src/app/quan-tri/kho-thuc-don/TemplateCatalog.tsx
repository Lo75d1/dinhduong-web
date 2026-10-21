"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";

type Item = { id: string; title: string; direction: string; revision: number; updatedAt: string; url: string };
type Opened = { template: Item; content: MenuLibraryDraft; warnings: string[]; foods: { id: string; name: string; unit: string }[]; history: { revision: number; reason: string; createdAt: string }[] };
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export function TemplatePreview({ data }: { data: Opened }) {
  return <section className="min-w-0 rounded-xl border border-[#b7ccc0] bg-white p-5 sm:p-6" aria-label="Chi tiết mẫu">
    <p className="text-sm text-[#52786d]">BẢN NHÁP · PHIÊN BẢN {data.template.revision}</p><h2 className="mt-2 text-2xl font-semibold text-[#123c36]">{data.content.title}</h2>
    <p className="mt-2 text-sm">{data.content.unit?.label ?? "Cá nhân"} · {data.content.coverage === "served_meals" ? "Các bữa phục vụ" : "Cả ngày"} · {data.content.groups.length} nhóm</p>
    <ul className="mt-4 list-disc space-y-1 rounded-lg bg-[#fff9e7] p-4 pl-8 text-sm leading-6">{data.warnings.map(text => <li key={text}>{text}</li>)}</ul>
    <div className="mt-5 space-y-5">{data.content.days.map(day => <section key={day.id} className="border-t border-[#d4dfd8] pt-4"><h3 className="text-xl font-semibold">Ngày {day.dayIndex}{day.date ? ` · ${day.date}` : ""}</h3>{!day.meals.length && <p className="mt-2 text-sm">Chưa có bữa.</p>}{day.meals.map(meal => <div key={meal.id} className="mt-4 rounded-lg border border-[#d4dfd8] p-4"><h4 className="font-semibold text-[#123c36]">{meal.label}</h4>{!meal.groupPortions.length && <p className="mt-2 text-sm">Chưa có nhóm suất.</p>}{meal.groupPortions.map(portion => <div key={portion.groupId} className="mt-3 border-t border-[#e0e8e2] pt-3"><p className="font-semibold">{data.content.groups.find(group => group.id === portion.groupId)?.label} · {portion.headcount === null ? "Chưa nhập số suất" : `${portion.headcount} suất`}</p>{portion.dishes.length === 0 && <p className="mt-2 text-sm text-neutral-600">Chưa có món.</p>}{portion.dishes.map(dish => <div key={dish.id} className="mt-3"><p className="font-semibold">{dish.label} <span className="text-xs font-normal text-neutral-600">({dish.sourceKind === "ai" ? "AI gợi ý" : dish.sourceKind === "catalog" ? "Công thức tham chiếu trong kho" : "Tự biên soạn"})</span></p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{dish.ingredients.map((ingredient, index) => <li key={index}>{data.foods?.find(food => food.id === ingredient.foodId)?.name ?? ingredient.foodId}: <strong>{ingredient.quantityPerPortion} {ingredient.unit}/suất</strong> sống sạch</li>)}</ul>{!dish.ingredients.length && <p className="mt-2 text-sm text-neutral-600">Chưa có nguyên liệu.</p>}</div>)}</div>)}</div>)}</section>)}</div>
    <details className="mt-6 border-t border-[#d4dfd8] pt-4"><summary className="cursor-pointer font-semibold">Lịch sử phiên bản</summary><ol className="mt-3 space-y-2 text-sm">{data.history.map(item => <li key={item.revision}>v{item.revision} · {date(item.createdAt)} · {item.reason}</li>)}</ol></details>
  </section>;
}

export default function TemplateCatalog() {
  const [items, setItems] = useState<Item[]>([]), [opened, setOpened] = useState<Opened | null>(null), [q, setQ] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true), [next, setNext] = useState<number | null>(null);
  const listSequence = useRef(0), openSequence = useRef(0), appliedQuery = useRef("");
  const open = useCallback(async (id: string) => {
    const sequence = ++openSequence.current; setNotice(""); setOpened(null);
    try { const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}`, { cache: "no-store" }); const data = await response.json(); if (sequence !== openSequence.current) return; if (!response.ok) throw new Error(data.message ?? "Chưa mở được mẫu."); setOpened(data); window.history.replaceState(null, "", `?template=${encodeURIComponent(id)}`); }
    catch (error) { if (sequence === openSequence.current) setNotice(error instanceof Error ? error.message : "Chưa mở được mẫu."); }
  }, []);
  const load = useCallback(async (query = "", offset = 0) => {
    const sequence = ++listSequence.current; setLoading(true); setNotice("");
    try { const response = await fetch(`/api/admin/menu-library/templates?q=${encodeURIComponent(query)}&offset=${offset}`, { cache: "no-store" }); const data = await response.json(); if (sequence !== listSequence.current) return; if (!response.ok) throw new Error(data.message ?? "Chưa tải được kho mẫu."); appliedQuery.current = query; setItems(previous => offset ? [...previous, ...data.items] : data.items); setNext(data.nextOffset); }
    catch (error) { if (sequence === listSequence.current) setNotice(error instanceof Error ? error.message : "Chưa tải được kho mẫu."); }
    finally { if (sequence === listSequence.current) setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => { void load(); const selected = new URLSearchParams(window.location.search).get("template"); if (selected) void open(selected); }); }, [load, open]);
  function close() { openSequence.current++; setOpened(null); window.history.replaceState(null, "", window.location.pathname); }
  function search(event: FormEvent) { event.preventDefault(); close(); void load(q); }
  return <div className="space-y-5">
    <form onSubmit={search} className="flex flex-wrap items-end gap-3 rounded-xl border border-[#b7ccc0] bg-white p-5"><label className="min-w-0 basis-full font-semibold sm:flex-1 sm:basis-auto">Tìm mẫu<input value={q} onChange={event => setQ(event.target.value)} maxLength={100} placeholder="Nhập tên thực đơn" className="mt-2 w-full rounded-lg border border-[#8fa99e] px-3 py-2.5 font-normal" /></label><button disabled={loading} className="min-h-11 rounded-lg bg-[#123c36] px-5 py-2.5 font-semibold text-white">Tìm kiếm</button><button type="button" disabled={loading} onClick={() => { void load(q); if (opened) void open(opened.template.id); }} className="min-h-11 rounded-lg border border-[#8fa99e] px-4 py-2.5">Làm mới</button></form>
    {notice && <p role="alert" className="rounded-lg border border-[#d8c992] bg-[#fff9e7] p-4">{notice}</p>}
    {loading && <p role="status">Đang tải kho mẫu…</p>}
    {opened && <><button type="button" onClick={close} className="py-2 font-semibold text-[#123c36] underline">← Danh sách mẫu</button><TemplatePreview data={opened} /></>}
    {!opened && <>
    {!loading && !notice && !items.length && <div className="rounded-xl border border-[#b7ccc0] bg-white p-8 text-center"><h2 className="text-xl font-semibold text-[#123c36]">Chưa có mẫu phù hợp</h2><p className="mx-auto mt-3 max-w-xl leading-7">Ủy quyền cho kết nối AI, rồi yêu cầu AI lập và lưu nháp. Mẫu đã lưu sẽ xuất hiện tại đây để bạn xem lại.</p><a href="/quan-tri/ket-noi-ai" className="mt-5 inline-block font-semibold underline">Mở ủy quyền AI →</a></div>}
    <div className="grid gap-3 sm:grid-cols-2">{items.map(item => <button type="button" key={item.id} onClick={() => void open(item.id)} className="min-w-0 rounded-xl border border-[#b7ccc0] bg-white p-5 text-left hover:border-[#123c36]"><span className="text-xs font-semibold text-[#52786d]">{item.direction === "collective" ? "TẬP THỂ" : "CÁ NHÂN"} · NHÁP v{item.revision}</span><span className="mt-2 block break-words text-lg font-semibold text-[#123c36]">{item.title}</span><span className="mt-3 block text-sm text-neutral-600">Cập nhật {date(item.updatedAt)}</span><span className="mt-3 block font-semibold">Xem mẫu →</span></button>)}</div>
    {next !== null && <button type="button" disabled={loading} onClick={() => void load(appliedQuery.current, next)} className="rounded-lg border border-[#8fa99e] px-5 py-3">Xem thêm mẫu</button>}
    </>}
  </div>;
}
