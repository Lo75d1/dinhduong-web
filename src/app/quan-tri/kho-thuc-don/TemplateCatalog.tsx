"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { EATING_CONTEXT_OPTIONS, eatingContextLabel, type EatingContext } from "@/lib/menu-library/contracts";
import Icon from "@/components/ui/Icon";
import styles from "./library.module.css";
import TemplateWorkspace, { type OpenedTemplate } from "./TemplateWorkspace";
export { TemplatePreview } from "./TemplateWorkspace";

type Item = { id: string; title: string; direction: string; revision: number; updatedAt: string; url: string; unitLabel?: string | null; dayCount?: number | null; groupCount?: number | null; mealLabels?: string[]; eatingContext?: EatingContext | null; reviewState?: string };
type Opened = OpenedTemplate;
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const shortDate = (value: string) => new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
export default function TemplateCatalog() {
  const [items, setItems] = useState<Item[]>([]), [opened, setOpened] = useState<Opened | null>(null);
  const [q, setQ] = useState(""), [direction, setDirection] = useState(""), [eatingContext, setEatingContext] = useState(""), [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true), [opening, setOpening] = useState(false), [next, setNext] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [listError, setListError] = useState(""), [openError, setOpenError] = useState(""), [filtered, setFiltered] = useState(false);
  const listSequence = useRef(0), openSequence = useRef(0);
  const appliedFilter = useRef({ q: "", direction: "", eatingContext: "" }), requestedFilter = useRef({ q: "", direction: "", eatingContext: "" });
  const failedLoad = useRef({ query: "", offset: 0, kind: "", context: "" }), lastOpenedId = useRef("");
  const listScroll = useRef(0), rowButtons = useRef(new Map<string, HTMLButtonElement>()), listHeading = useRef<HTMLHeadingElement>(null);

  const open = useCallback(async (id: string) => {
    const sequence = ++openSequence.current;
    lastOpenedId.current = id; setNotice(""); setOpenError(""); setOpened(null); setOpening(true); setDirty(false);
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
    if (dirty && !window.confirm("Bỏ các thay đổi chưa lưu?")) return;
    setDirty(false);
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
      <TemplateWorkspace key={`${opened.template.id}-${opened.template.revision}`} data={opened} onDirty={setDirty} onReload={() => { void open(opened.template.id); void load(appliedFilter.current.q, 0, appliedFilter.current.direction, appliedFilter.current.eatingContext); }} />
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
        <span className={styles.revision}><span className={styles.draft}>{item.reviewState === "approved" ? "Đã duyệt" : item.reviewState === "changes_requested" ? "Cần sửa" : "Nháp"} v{item.revision}</span><time dateTime={item.updatedAt} title={date(item.updatedAt)}>{shortDate(item.updatedAt)}</time></span>
        <button type="button" onClick={() => choose(item.id)} aria-label={`Xem mẫu ${item.title}`} className={styles.open}>Xem <Icon name="arrow-right" className="h-4 w-4" /></button>
      </li>)}</ul>
      {next !== null && <button type="button" disabled={loading} onClick={() => void load(appliedFilter.current.q, next, appliedFilter.current.direction, appliedFilter.current.eatingContext)} className={styles.more}>Xem thêm mẫu</button>}
    </section>
  </div>;
}
