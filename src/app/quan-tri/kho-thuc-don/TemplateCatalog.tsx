"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";
import { EATING_CONTEXT_OPTIONS, eatingContextLabel, mealEatingContext, type EatingContext } from "@/lib/menu-library/contracts";
import Icon from "@/components/ui/Icon";
import styles from "./library.module.css";

type Item = { id: string; title: string; direction: string; revision: number; updatedAt: string; url: string; unitLabel?: string | null; dayCount?: number | null; groupCount?: number | null; mealLabels?: string[]; eatingContext?: EatingContext | null };
type Opened = { template: Item; content: MenuLibraryDraft; warnings: string[]; foods: { id: string; name: string; unit: string }[]; history: { revision: number; reason: string; createdAt: string }[] };
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const shortDate = (value: string) => new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const input = "min-h-11 w-full rounded-md border border-[var(--control-line)] bg-white px-3 py-2 font-normal";

export function TemplatePreview({ data }: { data: Opened }) {
  const [dayId, setDayId] = useState(data.content.days[0]?.id ?? ""), [groupId, setGroupId] = useState(""), [mealId, setMealId] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const day = data.content.days.find(item => item.id === dayId);
  const meals = day?.meals.filter(meal => !mealId || meal.id === mealId) ?? [];
  return <section className="min-w-0 rounded-lg border border-[var(--line)] bg-white" aria-label="Chi tiết mẫu">
    <header className="border-b border-[var(--line)] px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 ref={heading} tabIndex={-1} className="text-xl font-semibold text-[var(--ink)]">{data.content.title}</h2><span className="rounded bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">BẢN NHÁP · v{data.template.revision}</span></div><p className="mt-1 text-sm">{data.content.unit?.label ?? "Cá nhân"} · {data.content.coverage === "served_meals" ? "Các bữa phục vụ" : "Cả ngày"} · {data.content.days.length} ngày · {data.content.groups.length} nhóm · {eatingContextLabel(data.content.eatingContext)}</p></header>
    <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--surface-soft)] p-3 sm:grid-cols-3">
      <label className="min-w-0 text-sm font-semibold">Ngày<select value={dayId} onChange={event => { setDayId(event.target.value); setMealId(""); }} className={input}>{data.content.days.map(item => <option key={item.id} value={item.id}>Ngày {item.dayIndex}{item.date ? ` · ${item.date}` : ""}</option>)}</select></label>
      <label className="min-w-0 text-sm font-semibold">Bữa<select value={mealId} onChange={event => setMealId(event.target.value)} className={input}><option value="">Tất cả bữa</option>{day?.meals.map(meal => <option key={meal.id} value={meal.id}>{meal.label}</option>)}</select></label>
      <label className="min-w-0 text-sm font-semibold">Nhóm khẩu phần<select value={groupId} onChange={event => setGroupId(event.target.value)} className={input}><option value="">Tất cả nhóm</option>{data.content.groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
    </div>
    <div className="p-3 sm:p-4">{!day && <p>Chưa có ngày.</p>}{day && !day.meals.length && <p>Chưa có bữa.</p>}
      <div className="grid items-start gap-4 xl:grid-cols-2">{meals.map(meal => <section key={meal.id} className="min-w-0 overflow-hidden rounded-md border border-[var(--line)]"><h3 className="bg-[var(--surface-soft)] px-3 py-2 font-semibold text-[var(--ink)]">Ngày {day!.dayIndex} · {meal.label}<span className="ml-2 font-normal text-[var(--muted)]">· {eatingContextLabel(mealEatingContext(data.content.eatingContext, meal.eatingContext))}</span></h3>{!meal.groupPortions.length && <p className="p-3 text-sm">Chưa có nhóm suất.</p>}{!!meal.groupPortions.length && !meal.groupPortions.some(portion => !groupId || portion.groupId === groupId) && <p className="p-3 text-sm">Bữa này chưa có suất cho nhóm đã chọn.</p>}{meal.groupPortions.filter(portion => !groupId || portion.groupId === groupId).map(portion => <div key={portion.groupId} className="border-t border-[var(--line)]">
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
  const [items, setItems] = useState<Item[]>([]), [opened, setOpened] = useState<Opened | null>(null);
  const [q, setQ] = useState(""), [direction, setDirection] = useState(""), [eatingContext, setEatingContext] = useState(""), [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true), [opening, setOpening] = useState(false), [next, setNext] = useState<number | null>(null);
  const [listError, setListError] = useState(""), [openError, setOpenError] = useState(""), [filtered, setFiltered] = useState(false);
  const listSequence = useRef(0), openSequence = useRef(0);
  const appliedFilter = useRef({ q: "", direction: "", eatingContext: "" }), requestedFilter = useRef({ q: "", direction: "", eatingContext: "" });
  const failedLoad = useRef({ query: "", offset: 0, kind: "", context: "" }), lastOpenedId = useRef("");
  const listScroll = useRef(0), rowButtons = useRef(new Map<string, HTMLButtonElement>()), listHeading = useRef<HTMLHeadingElement>(null);

  const open = useCallback(async (id: string) => {
    const sequence = ++openSequence.current;
    lastOpenedId.current = id; setNotice(""); setOpenError(""); setOpened(null); setOpening(true);
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (sequence !== openSequence.current) return;
      if (!response.ok) throw new Error(data.message ?? "Chưa mở được mẫu.");
      setOpened(data);
      const url = new URL(window.location.href); url.searchParams.set("template", id);
      window.history.replaceState(null, "", url);
    } catch (error) {
      if (sequence === openSequence.current) setOpenError(error instanceof Error ? error.message : "Chưa mở được mẫu.");
    } finally { if (sequence === openSequence.current) setOpening(false); }
  }, []);

  const load = useCallback(async (query = "", offset = 0, kind = "", context = "") => {
    const sequence = ++listSequence.current;
    requestedFilter.current = { q: query, direction: kind, eatingContext: context };
    failedLoad.current = { query, offset, kind, context };
    setLoading(true); setListError(""); setOpenError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/menu-library/templates?q=${encodeURIComponent(query)}&offset=${offset}&direction=${encodeURIComponent(kind)}&eatingContext=${encodeURIComponent(context)}`, { cache: "no-store" });
      const data = await response.json();
      if (sequence !== listSequence.current) return;
      if (!response.ok) throw new Error(data.message ?? "Chưa tải được kho mẫu.");
      if (!Array.isArray(data.items)) throw new Error("Chưa đọc được danh sách mẫu.");
      appliedFilter.current = { q: query, direction: kind, eatingContext: context }; setFiltered(!!query || !!kind || !!context);
      setItems(previous => offset ? [...previous, ...data.items] : data.items); setNext(data.nextOffset);
    } catch (error) {
      if (sequence === listSequence.current) setListError(error instanceof Error ? error.message : "Chưa tải được kho mẫu.");
    } finally { if (sequence === listSequence.current) setLoading(false); }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void load();
      const selected = new URLSearchParams(window.location.search).get("template");
      if (selected) void open(selected);
    });
  }, [load, open]);

  useEffect(() => {
    const query = q.trim();
    if (query === requestedFilter.current.q && direction === requestedFilter.current.direction && eatingContext === requestedFilter.current.eatingContext) return;
    const timer = window.setTimeout(() => { void load(query, 0, direction, eatingContext); }, 250);
    return () => window.clearTimeout(timer);
  }, [q, direction, eatingContext, load]);

  function close() {
    openSequence.current++; setOpened(null); setOpening(false); setOpenError("");
    const url = new URL(window.location.href); url.searchParams.delete("template"); window.history.replaceState(null, "", url);
    requestAnimationFrame(() => {
      window.scrollTo(0, listScroll.current);
      (rowButtons.current.get(lastOpenedId.current) ?? listHeading.current)?.focus({ preventScroll: true });
    });
  }
  function choose(id: string) { listScroll.current = window.scrollY; void open(id); }
  function search(event: FormEvent) { event.preventDefault(); void load(q.trim(), 0, direction, eatingContext); }
  function resetFilters() { setQ(""); setDirection(""); setEatingContext(""); void load(); }
  async function copyLink(item: Item) {
    try { await navigator.clipboard.writeText(item.url); setNotice("Đã sao chép liên kết mẫu."); }
    catch { setNotice("Chưa sao chép được. Sao chép địa chỉ trên trình duyệt để chia sẻ mẫu."); }
  }
  const showingDetail = !!opened || opening;
  return <div>
    <form onSubmit={search} className={styles.toolbar} hidden={showingDetail} role="search" aria-label="Tìm trong kho mẫu">
      <div className={styles.search}><label htmlFor="menu-library-search" className="sr-only">Tìm mẫu</label><input id="menu-library-search" type="search" value={q} onChange={event => setQ(event.target.value)} maxLength={100} placeholder="Tìm mẫu, đơn vị…" /><button disabled={loading} aria-label="Tìm kiếm" title="Tìm kiếm"><Icon name="search" className="h-[18px] w-[18px]" /></button></div>
      <label className={styles.branch}><span className="sr-only">Nhánh</span><select value={direction} onChange={event => { const kind = event.target.value; setDirection(kind); void load(q.trim(), 0, kind, eatingContext); }}><option value="">Mọi nhánh</option><option value="collective">Tập thể</option><option value="individual">Cá nhân</option></select></label>
      <label className={`${styles.branch} ${styles.context}`}><span className="sr-only">Bối cảnh ăn uống</span><select value={eatingContext} onChange={event => { const context = event.target.value; setEatingContext(context); void load(q.trim(), 0, direction, context); }}><option value="">Mọi bối cảnh</option>{EATING_CONTEXT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <button type="button" disabled={loading} title="Làm mới" aria-label="Làm mới" onClick={() => void load(q.trim(), 0, direction, eatingContext)} className={styles.refresh}><Icon name="refresh-cw" className="h-4 w-4" /><span>Làm mới</span></button>
    </form>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {openError && <div role="alert" className={styles.error}><p>{openError}</p><button type="button" onClick={() => void open(lastOpenedId.current)}>Thử mở lại mẫu</button></div>}
    {opening && <div><button type="button" onClick={close} className={styles.back}>← Danh sách mẫu</button><p role="status" className={styles.notice}>Đang mở mẫu…</p></div>}
    {opened && <>
      <div className={styles.detailActions}><button type="button" onClick={close} className={styles.back}>← Danh sách mẫu</button><button type="button" className={styles.copy} aria-label={`Sao chép liên kết ${opened.template.title}`} onClick={() => void copyLink(opened.template)}><Icon name="copy" className="h-4 w-4" />Chép liên kết</button></div>
      <TemplatePreview key={`${opened.template.id}-${opened.template.revision}`} data={opened} />
    </>}
    <section aria-label="Danh sách mẫu" className={styles.catalog} hidden={showingDetail} aria-busy={loading}>
      <div className={styles.listHeader}><h2 ref={listHeading} tabIndex={-1}>Danh sách mẫu <span>{loading && !items.length ? "—" : `${items.length}${next !== null ? "+" : ""}`}</span></h2><span>Mới nhất</span></div>
      {listError && <div role="alert" className={styles.error}><p>{listError}</p>{!!items.length && <p>Danh sách dưới đây là lần tải thành công gần nhất.</p>}<button type="button" onClick={() => { const args = failedLoad.current; void load(args.query, args.offset, args.kind, args.context); }}>Thử tải lại</button></div>}
      {loading && <p role="status" className={styles.notice}>{items.length ? "Đang cập nhật danh sách…" : "Đang tải kho mẫu…"}</p>}
      <div className={styles.columns} aria-hidden="true"><span>Mẫu thực đơn / Đơn vị</span><span>Ngày · Nhóm</span><span>Bữa phục vụ</span><span>Cập nhật</span><span /></div>
      {loading && !items.length && <div aria-hidden="true">{[0, 1, 2].map(index => <div key={index} className={styles.skeleton}><span /><span /></div>)}</div>}
      {!loading && !listError && !items.length && <div className={styles.empty}>
        <h3>{filtered ? "Chưa có mẫu phù hợp" : "Kho mẫu đang trống"}</h3>
        <p>{filtered ? "Thử tên khác hoặc bỏ bộ lọc hiện tại." : "Bắt đầu bằng bản nháp cho đơn vị hoặc người ăn của bạn."}</p>
        {filtered ? <button type="button" onClick={resetFilters}>Xóa bộ lọc</button> : <a href="/quan-tri/ket-noi-ai">Ủy quyền AI thêm mẫu →</a>}
      </div>}
      <ul>{items.map(item => <li key={item.id} className={styles.row}>
        <div className={styles.identity}><button ref={node => { if (node) rowButtons.current.set(item.id, node); else rowButtons.current.delete(item.id); }} type="button" onClick={() => choose(item.id)}>{item.title}</button><span>{item.direction === "individual" ? "Cá nhân" : `${item.unitLabel ?? "Chưa có tên đơn vị"} · Tập thể`} · {eatingContextLabel(item.eatingContext)}</span></div>
        <span className={styles.size}>{item.dayCount ?? "—"} ngày · {item.groupCount ?? "—"} nhóm</span>
        <span className={styles.mealLabels}>{item.mealLabels?.length ? item.mealLabels.join(" · ") : item.dayCount == null ? "—" : "Chưa có bữa"}</span>
        <span className={styles.revision}><span className={styles.draft}>Nháp v{item.revision}</span><time dateTime={item.updatedAt} title={date(item.updatedAt)}>{shortDate(item.updatedAt)}</time></span>
        <button type="button" onClick={() => choose(item.id)} aria-label={`Xem mẫu ${item.title}`} className={styles.open}>Xem <Icon name="arrow-right" className="h-4 w-4" /></button>
      </li>)}</ul>
      {next !== null && <button type="button" disabled={loading} onClick={() => void load(appliedFilter.current.q, next, appliedFilter.current.direction, appliedFilter.current.eatingContext)} className={styles.more}>Xem thêm mẫu</button>}
    </section>
  </div>;
}
