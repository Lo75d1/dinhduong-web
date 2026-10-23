"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EATING_CONTEXT_OPTIONS, LIFE_STAGE_OPTIONS } from "@/lib/menu-library/contracts";
import { dailyMenuTitle, EMPTY_DAILY_FILTERS, type DailyCatalog, type DailyFilters, type DailyMenu } from "@/lib/menu-library/daily-catalog";
import TemplateWorkspace, { type OpenedTemplate } from "./TemplateWorkspace";
import styles from "./library.module.css";
export { TemplatePreview } from "./TemplateWorkspace";
type Scope = { dayId: string; groupId: string };
const keyOf = (item: DailyMenu) => `${item.id}:${item.dayId}`;
const reviewLabel = (value: string) => value === "approved" ? "Đã duyệt" : value === "changes_requested" ? "Cần sửa" : "Nháp";
export default function TemplateCatalog() {
  const [filters, setFilters] = useState<DailyFilters>(EMPTY_DAILY_FILTERS), [result, setResult] = useState<DailyCatalog | null>(null);
  const [opened, setOpened] = useState<OpenedTemplate | null>(null), [scope, setScope] = useState<Scope>({ dayId: "", groupId: "" });
  const [loading, setLoading] = useState(true), [opening, setOpening] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [openError, setOpenError] = useState(""), [notice, setNotice] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const sequence = useRef(0), openingSequence = useRef(0), last = useRef({ id: "", dayId: "", groupId: "" });
  const applied = useRef(EMPTY_DAILY_FILTERS), failed = useRef({ filters: EMPTY_DAILY_FILTERS, offset: 0 });
  const buttons = useRef(new Map<string, HTMLButtonElement>()), heading = useRef<HTMLHeadingElement>(null), scroll = useRef(0);
  const load = useCallback(async (f: DailyFilters, offset = 0) => {
    const current = ++sequence.current; failed.current = { filters: f, offset }; setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ ...f, q: f.q.trim(), offset: String(offset) });
      const response = await fetch(`/api/admin/menu-library/days?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (current !== sequence.current) return;
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.message ?? "Chưa tải được danh mục thực đơn ngày.");
      applied.current = f;
      setResult(previous => ({ ...data, items: offset && previous ? [...previous.items, ...data.items] : data.items }));
    } catch (cause) { if (current === sequence.current) setError(cause instanceof Error ? cause.message : "Chưa tải được danh mục."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, []);
  const open = useCallback(async (id: string, dayId = "", groupId = "") => {
    const current = ++openingSequence.current; last.current = { id, dayId, groupId };
    setOpening(true); setOpened(null); setOpenError(""); setNotice(""); setDirty(false);
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data: OpenedTemplate & { message?: string } = await response.json();
      if (current !== openingSequence.current) return;
      if (!response.ok) throw new Error(data.message ?? "Chưa mở được thực đơn.");
      if (dayId && !data.content.days.some(day => day.id === dayId)) throw new Error("Ngày trong liên kết không còn trong phiên bản hiện tại. Chọn lại từ danh mục.");
      if (groupId && !data.content.groups.some(group => group.id === groupId)) throw new Error("Khẩu phần trong liên kết không còn trong phiên bản hiện tại. Chọn lại từ danh mục.");
      const selected = { dayId: data.content.days.find(day => day.id === dayId)?.id ?? data.content.days[0]?.id ?? "", groupId: data.content.groups.find(group => group.id === groupId)?.id ?? data.content.groups[0]?.id ?? "" };
      last.current = { id, ...selected }; setScope(selected); setOpened(data);
      const url = new URL(window.location.href); url.searchParams.set("template", id); url.searchParams.set("day", selected.dayId); url.searchParams.set("group", selected.groupId); window.history.replaceState(null, "", url);
    } catch (cause) { if (current === openingSequence.current) setOpenError(cause instanceof Error ? cause.message : "Chưa mở được thực đơn."); }
    finally { if (current === openingSequence.current) setOpening(false); }
  }, []);
  useEffect(() => { let active = true; void Promise.resolve().then(() => { const query = new URLSearchParams(window.location.search), id = query.get("template"); if (active && id) void open(id, query.get("day") ?? "", query.get("group") ?? ""); }); return () => { active = false; }; }, [open]);
  useEffect(() => { const timer = window.setTimeout(() => void load(filters), 250); return () => window.clearTimeout(timer); }, [filters, load]);
  function close() {
    if (dirty && !window.confirm("Bỏ các thay đổi chưa lưu?")) return;
    openingSequence.current++; setOpened(null); setOpening(false); setOpenError(""); setDirty(false);
    const url = new URL(window.location.href); ["template", "day", "group"].forEach(key => url.searchParams.delete(key)); window.history.replaceState(null, "", url);
    requestAnimationFrame(() => { window.scrollTo(0, scroll.current); (buttons.current.get(`${last.current.id}:${last.current.dayId}`) ?? heading.current)?.focus({ preventScroll: true }); });
  }
  function scopeChanged(selected: Scope) {
    setScope(selected); last.current = { ...last.current, ...selected };
    const url = new URL(window.location.href); url.searchParams.set("day", selected.dayId); url.searchParams.set("group", selected.groupId); window.history.replaceState(null, "", url);
  }
  function choose(item: DailyMenu, groupId: string) { scroll.current = window.scrollY; void open(item.id, item.dayId, groupId); }
  function select(key: keyof DailyFilters, value: string) { setFilters(previous => ({ ...previous, [key]: value, ...(key === "section" ? { direction: "", unitType: "", hospitalUse: "" } : {}) })); }
  async function copyLink() { try { await navigator.clipboard.writeText(window.location.href); setNotice("Đã chép liên kết đúng ngày và khẩu phần."); } catch { setNotice("Dùng địa chỉ trên trình duyệt để mở lại đúng ngày."); } }
  const detail = !!opened || opening;
  return <div>
    <nav aria-label="Kho thực đơn" hidden={detail} className={styles.sectionTabs}>
      {[{value:"individual",label:"Cá thể"},{value:"collective",label:"Tập thể"},{value:"hospital",label:"Bệnh viện"}].map(option => <button key={option.value} type="button" aria-pressed={filters.section === option.value} onClick={() => select("section", option.value)}>{option.label}</button>)}
    </nav>
    {filters.section === "hospital" && !detail && <div className={styles.notice}><p>Tạm dừng bổ sung nội dung bệnh viện. Các bản nháp hiện có được giữ để rà soát.</p><label>Mục bệnh viện <select value={filters.hospitalUse} onChange={event => select("hospitalUse", event.target.value)}><option value="">Cả hai mục</option><option value="patient_guidance">Khuyến nghị cho người bệnh</option><option value="hospital_kitchen">Bếp bệnh viện</option></select></label></div>}
    <form role="search" aria-label="Tìm và lọc thực đơn ngày" hidden={detail} className={styles.dailyToolbar} onSubmit={event => { event.preventDefault(); void load(filters); }}>
      <label className={styles.dailySearch}>Tìm trong toàn bộ kho<input type="search" maxLength={100} value={filters.q} placeholder="Tên thực đơn, món ăn, chế độ, đơn vị…" onChange={event => select("q", event.target.value)} /></label>
      <label>Phân loại người ăn<select value={filters.lifeStage} onChange={event => select("lifeStage", event.target.value)}><option value="">Mọi nhóm tuổi</option>{LIFE_STAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}<option value="unclassified">Chưa phân loại</option></select></label>
      {filters.section === "collective" && <label>Đơn vị tập thể<select value={filters.unitType} onChange={event => select("unitType", event.target.value)}><option value="">Mọi đơn vị</option><option value="school">Trường học</option><option value="workplace">Doanh nghiệp</option><option value="agency">Cơ quan</option><option value="other">Khác</option></select></label>}
      <label>Chế độ ăn<select value={filters.diet} onChange={event => select("diet", event.target.value)}><option value="">Mọi chế độ</option>{result?.diets.map(diet => <option key={diet.id} value={diet.id}>{diet.code} · {diet.name}</option>)}</select></label>
      <label>Mục tiêu kcal<select value={filters.energy} onChange={event => select("energy", event.target.value)}><option value="">Mọi mức kcal</option>{result?.energies.map(energy => <option key={energy} value={energy}>{energy} kcal</option>)}</select></label>
      <label>Bữa phục vụ<select value={filters.meal} onChange={event => select("meal", event.target.value)}><option value="">Mọi bữa</option><option value="breakfast">Sáng</option><option value="lunch">Trưa</option><option value="afternoon_main">Bữa chính chiều</option><option value="afternoon_snack">Phụ chiều</option><option value="dinner">Tối</option><option value="shift_main">Bữa ca</option><option value="other">Bữa khác</option></select></label>
      <label>Bối cảnh<select value={filters.eatingContext} onChange={event => select("eatingContext", event.target.value)}><option value="">Mọi bối cảnh</option>{EATING_CONTEXT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Trạng thái<select value={filters.review} onChange={event => select("review", event.target.value)}><option value="">Mọi trạng thái</option><option value="draft">Nháp</option><option value="approved">Đã duyệt</option><option value="changes_requested">Cần sửa</option></select></label>
      <label>Tình trạng sử dụng<select value={filters.availability} onChange={event => select("availability", event.target.value)}><option value="active">Đang dùng</option><option value="archived">Ngừng dùng</option><option value="all">Tất cả để rà soát</option></select></label>
      <div className={styles.filterActions}><button type="submit" disabled={loading}>Tìm kiếm</button><button type="button" onClick={() => setFilters({ ...EMPTY_DAILY_FILTERS })}>Tìm cả ba kho</button></div>
    </form>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {openError && <div role="alert" className={styles.error}><p>{openError}</p><button onClick={() => void open(last.current.id, last.current.dayId, last.current.groupId)}>Thử mở lại</button><button onClick={close}>Về danh mục</button></div>}
    {opening && <div><button className={styles.back} onClick={close}>← Danh mục thực đơn ngày</button><p role="status">Đang mở đúng ngày và khẩu phần…</p></div>}
    {opened && <><div className={styles.detailActions}><button className={styles.back} onClick={close}>← Danh mục thực đơn ngày</button><button className={styles.copy} onClick={() => void copyLink()}>Chép liên kết ngày này</button></div><TemplateWorkspace key={`${opened.template.id}-${opened.template.revision}`} data={opened} initialDayId={scope.dayId} initialGroupId={scope.groupId} onScopeChange={scopeChanged} onDirty={setDirty} onReload={() => { void open(opened.template.id, scope.dayId, scope.groupId); void load(applied.current); }} /></>}
    <section aria-label="Danh mục thực đơn ngày" hidden={detail} className={styles.catalog} aria-busy={loading}>
      <div className={styles.listHeader}><h2 tabIndex={-1} ref={heading}>Thực đơn theo ngày <span>{result?.total ?? "—"}</span></h2><span>Mới nhất</span></div>
      {error && <div role="alert" className={styles.error}><p>{error}</p>{!!result?.items.length && <p>Đang hiện lần tải trước; bộ lọc mới chưa được áp dụng.</p>}<button onClick={() => void load(failed.current.filters, failed.current.offset)}>Thử tải lại</button></div>}
      {loading && <p role="status" className={styles.notice}>Đang tìm trong toàn bộ kho…</p>}
      {!loading && !error && result?.total === 0 && <div className={styles.empty}><h3>Chưa có thực đơn phù hợp</h3><p>Thử tên khác hoặc bớt bộ lọc.</p></div>}
      <ul className={styles.dayList}>{result?.items.map(item => {
        const key = keyOf(item), groupId = item.groups.length === 1 ? item.groups[0].id : item.groups.some(group => group.id === choices[key]) ? choices[key] : "";
        return <li key={key} className={styles.dayRow}>
          <div className={styles.dayIdentity}><h3>{dailyMenuTitle(item.title)}</h3><p>{item.section === "hospital" ? item.hospitalUse === "patient_guidance" ? "Bệnh viện · Khuyến nghị cho người bệnh" : "Bệnh viện · Bếp bệnh viện" : item.direction === "individual" ? "Cá thể" : item.unitLabel ?? "Tập thể"}</p><p>{item.date ?? `Ngày ${item.dayIndex} của bộ ${item.dayCount} ngày`} · {item.availability === "archived" ? "Ngừng dùng · " : ""}{reviewLabel(item.reviewState)} v{item.revision}</p></div>
          <div className={styles.dayMeals}><strong>{item.coverage === "full_day" ? "Đủ ngày" : "Các bữa phục vụ"}</strong><ul>{item.meals.map(meal => <li key={meal.id}><span>{meal.label}:</span> {meal.dishes.join(", ") || "Chưa có món"}</li>)}</ul></div>
          <div className={styles.dayChoice}><span>{[...new Set(item.groups.map(group => LIFE_STAGE_OPTIONS.find(option => option.value === group.lifeStage)?.label ?? "Chưa phân loại"))].join(" · ")}</span>{item.groups.length > 1 ? <label>Khẩu phần<select aria-label={`Khẩu phần ${dailyMenuTitle(item.title)}, ngày ${item.dayIndex}`} value={groupId} onChange={event => setChoices(previous => ({ ...previous, [key]: event.target.value }))}><option value="">Chọn mức kcal / nhóm</option>{item.groups.map(group => <option key={group.id} value={group.id}>{group.energy ? `${group.energy} kcal · ` : ""}{group.label}</option>)}</select></label> : <span>{item.groups[0]?.energy ? `${item.groups[0].energy} kcal · mục tiêu` : item.groups[0]?.label}</span>}
            <button ref={node => { if (node) buttons.current.set(key, node); else buttons.current.delete(key); }} disabled={!groupId || loading} onClick={() => choose(item, groupId)} aria-label={`Xem ${dailyMenuTitle(item.title)}, ngày ${item.dayIndex}`}>Xem ngày</button>
          </div>
        </li>;
      })}</ul>
      {result?.nextOffset != null && <button disabled={loading} className={styles.more} onClick={() => void load(applied.current, result.nextOffset!)}>Xem thêm thực đơn ngày</button>}
    </section>
  </div>;
}
