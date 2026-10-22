/* Standalone file preview embeds the existing SVG; Next Image is not available here. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Icon from "../../../src/components/ui/Icon";
import { examples, type ExampleTemplate } from "./menu-library-fixtures";

declare const BRAND_MARK: string;
const site = "https://dinhduong2598.food";
const unitName = (item: ExampleTemplate) => item.draft.unit?.label ?? "Cá nhân";
const unitKey = (item: ExampleTemplate) => item.draft.unit?.id ?? "individual";
const mealLabels = (item: ExampleTemplate) => [...new Set(item.draft.days.flatMap(day => day.meals.map(meal => meal.label)))].join(" · ");
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" });

type DetailState = { item: ExampleTemplate; day: number };
function MenuDetail({ item, initialDay, back }: { item: ExampleTemplate; initialDay: number; back: () => void }) {
  const [dayIndex, setDay] = useState(initialDay), [groupId, setGroup] = useState(item.draft.groups[0]?.id ?? "");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const draft = item.draft, day = draft.days[dayIndex], group = draft.groups.find(g => g.id === groupId);
  return <section className="ml-detail" aria-label="Chi tiết mẫu">
    <button className="ml-back" onClick={back}>← Quay lại kho mẫu</button>
    <div className="ml-detail-title"><div><p className="ml-muted">{unitName(item)}</p><h2 tabIndex={-1} ref={heading}>{draft.title}</h2></div><span className="ml-status">Bản nháp v{draft.version}</span></div>
    <div className="ml-detail-filters">
      <label>Ngày<select value={dayIndex} onChange={event => setDay(Number(event.target.value))}>{draft.days.map((d, i) => <option key={d.id} value={i}>Ngày {d.dayIndex}</option>)}</select></label>
      <label>Nhóm khẩu phần<select value={groupId} onChange={event => setGroup(event.target.value)}>{draft.groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
      <p className="ml-muted">{draft.coverage === "served_meals" ? "Các bữa phục vụ" : "Cả ngày"}<br />Chưa gắn ngày lịch</p>
    </div>
    <p className="ml-note">Món minh họa chưa có nguyên liệu và định lượng. Chưa tính dinh dưỡng.</p>
    <div className="ml-meals">{day.meals.map(meal => {
      const portion = meal.groupPortions.find(p => p.groupId === groupId);
      return <section key={meal.id} className="ml-meal"><div className="ml-meal-title"><h3>{meal.label}</h3><span>{portion?.headcount == null ? "— suất · Chưa nhập" : `${portion.headcount} suất${portion.headcount === 0 ? " · Không phục vụ" : ""}`}</span></div>
        <p className="ml-muted">{group?.label}</p>
        {portion ? <ul className="ml-dishes">{portion.dishes.map(dish => <li key={dish.id}><span>{dish.label}</span><span className="ml-muted">Chưa định lượng</span></li>)}</ul> : <p>Chưa có nhóm suất cho bữa này.</p>}
      </section>;
    })}</div>
    <details className="ml-reference"><summary>Căn cứ &amp; tình trạng dữ liệu</summary><p>Đây là dữ liệu xem thử. Chưa chọn nguồn nhu cầu ngày, quy tắc bữa, nguyên liệu hoặc mục tiêu. Số suất chỉ để minh họa cách hiển thị giá trị đã biết, 0 và chưa nhập.</p></details>
  </section>;
}

function App() {
  const [layout, setLayout] = useState<"a" | "b">("a"), [empty, setEmpty] = useState(false), [q, setQ] = useState(""), [direction, setDirection] = useState(""), [selectedUnit, setUnit] = useState(""), [templateId, setTemplate] = useState(examples[0].draft.id), [detail, setDetail] = useState<DetailState | null>(null);
  const returnTarget = useRef<HTMLButtonElement | null>(null), scroll = useRef(0);
  const all = empty ? [] : examples;
  const filtered = all.filter(item => (!direction || item.draft.direction === direction) && fold(`${item.draft.title} ${unitName(item)} ${mealLabels(item)}`).includes(fold(q)));
  const units = [...new Map(filtered.map(item => [unitKey(item), { key: unitKey(item), name: unitName(item) }])).values()];
  const activeUnit = units.find(unit => unit.key === selectedUnit)?.key ?? units[0]?.key ?? "";
  const unitItems = filtered.filter(item => unitKey(item) === activeUnit);
  const active = unitItems.find(item => item.draft.id === templateId) ?? unitItems[0];
  function show(item: ExampleTemplate, day: number, trigger: HTMLButtonElement) { scroll.current = window.scrollY; returnTarget.current = trigger; setDetail({ item, day }); }
  function back() { setDetail(null); requestAnimationFrame(() => { window.scrollTo(0, scroll.current); returnTarget.current?.focus({ preventScroll: true }); }); }
  function changeLayout(value: "a" | "b") { setLayout(value); setDetail(null); }
  return <>
    <div className="ml-review" aria-label="Điều khiển bản xem thử">
      <fieldset><legend>So sánh bố cục</legend><button aria-pressed={layout === "a"} onClick={() => changeLayout("a")}>A · Danh sách</button><button aria-pressed={layout === "b"} onClick={() => changeLayout("b")}>B · Theo đơn vị</button></fieldset>
      <label className="ml-fixture-switch"><input type="checkbox" checked={empty} onChange={event => { setEmpty(event.target.checked); setDetail(null); }} />Thử kho trống</label>
    </div>
    <div className="ml-prototype" data-layout={layout}>
      <header className="ml-site-header"><a href={site} target="_blank" rel="noreferrer"><img src={BRAND_MARK} alt="" width="32" height="32" /><span>Dinh dưỡng 2598</span></a><span>Quản trị · Xem thử</span></header>
      <main className="ml-main">
        <div className="ml-breadcrumb"><a href={`${site}/quan-tri`} target="_blank" rel="noreferrer">Quản trị</a><Icon name="chevron-right" width="14" height="14" /><span>Kho mẫu thực đơn</span></div>
        <div className="ml-title-row"><div><h1>Kho mẫu thực đơn</h1><p className="ml-muted">{layout === "a" ? "Tìm và mở mẫu thực đơn đã biên soạn." : "Theo dõi thực đơn theo từng đơn vị phục vụ."}</p></div><a className="ml-primary" href={`${site}/quan-tri/ket-noi-ai`} target="_blank" rel="noreferrer"><Icon name="plus" width="17" height="17" />Thêm qua AI</a></div>
        <p className="ml-demo">Xem thử với 5 mẫu minh họa · Không lưu vào kho thật.</p>
        {!detail ? <>
          <div className="ml-toolbar">
            <label className="ml-search"><span className="ml-sr">Tìm mẫu</span><Icon name="search" width="18" height="18" /><input type="search" value={q} onChange={event => setQ(event.target.value)} placeholder="Tìm mẫu, đơn vị…" /></label>
            <label className="ml-kind"><span className="ml-sr">Nhánh</span><select value={direction} onChange={event => setDirection(event.target.value)}><option value="">Mọi nhánh</option><option value="collective">Tập thể</option><option value="individual">Cá nhân</option></select></label>
          </div>
          {layout === "a" ? <section className="ml-catalog" aria-label="Danh sách mẫu"><div className="ml-section-heading"><h2>Danh sách mẫu <span>{filtered.length}</span></h2><span className="ml-muted">Cập nhật gần nhất</span></div>
            {filtered.length ? <div className="ml-table"><div className="ml-table-head" aria-hidden="true"><span>Mẫu thực đơn / Đơn vị</span><span>Ngày · Nhóm</span><span>Bữa phục vụ</span><span>Cập nhật</span><span /></div><ul>{filtered.map(item => <li key={item.draft.id} className="ml-template-row">
              <div className="ml-identity"><button onClick={event => show(item, 0, event.currentTarget)}>{item.draft.title}</button><span className="ml-muted">{unitName(item)}{item.draft.direction === "collective" ? " · Tập thể" : ""}</span></div>
              <span className="ml-size">{item.draft.days.length} ngày · {item.draft.groups.length} nhóm</span><span className="ml-meal-label">{mealLabels(item)}</span><span className="ml-revision"><span className="ml-status">Nháp v{item.draft.version}</span><time dateTime={item.updatedAt}>{date(item.updatedAt)}</time></span>
              <button className="ml-open" aria-label={`Xem ${item.draft.title}`} onClick={event => show(item, 0, event.currentTarget)}>Xem <Icon name="arrow-right" width="16" height="16" /></button>
            </li>)}</ul></div> : <Empty filtered={!!q || !!direction} reset={() => { setQ(""); setDirection(""); }} />}
          </section> : <div className="ml-unit-workspace">
            <aside className="ml-units"><h2>Đơn vị <span>{units.length}</span></h2><label className="ml-unit-mobile"><span className="ml-sr">Chọn đơn vị</span><select value={activeUnit} onChange={event => setUnit(event.target.value)}>{!units.length && <option value="">Chưa có đơn vị</option>}{units.map(unit => <option key={unit.key} value={unit.key}>{unit.name}</option>)}</select></label>
              <nav aria-label="Đơn vị" className="ml-unit-nav">{units.map(unit => <button key={unit.key} aria-pressed={activeUnit === unit.key} onClick={() => setUnit(unit.key)}><span>{unit.name}</span><span>{filtered.filter(item => unitKey(item) === unit.key).length} mẫu</span></button>)}</nav>
            </aside>
            <section className="ml-planner" aria-label="Thực đơn theo đơn vị">{active ? <>
              <div className="ml-planner-title"><div><h2>{unitName(active)}</h2><p className="ml-muted">{active.draft.groups.map(group => group.label).join(" · ")}</p></div><span className="ml-status">Bản nháp</span></div>
              <label className="ml-template-select">Thực đơn<select value={active.draft.id} onChange={event => setTemplate(event.target.value)}>{unitItems.map(item => <option key={item.draft.id} value={item.draft.id}>{item.draft.title} · v{item.draft.version}</option>)}</select></label>
              <div className="ml-schedule-heading"><h3>{active.draft.days.length} ngày · {mealLabels(active)}</h3><span className="ml-muted">Chưa gắn ngày lịch</span></div>
              <div className="ml-schedule">{active.draft.days.map((day, dayIndex) => <section key={day.id} className="ml-day"><button className="ml-day-title" onClick={event => show(active, dayIndex, event.currentTarget)}>Ngày {day.dayIndex}<Icon name="arrow-right" width="15" height="15" /></button>{day.meals.map(meal => <div key={meal.id} className="ml-day-meal"><h4>{meal.label}</h4><ul>{meal.groupPortions[0]?.dishes.map(dish => <li key={dish.id}>{dish.label}</li>)}</ul></div>)}<button className="ml-day-open" aria-label={`Xem nhóm suất ngày ${day.dayIndex}`} onClick={event => show(active, dayIndex, event.currentTarget)}>Nhóm suất &amp; chi tiết →</button></section>)}</div>
              <p className="ml-note">Bộ món minh họa giống nhau giữa các nhóm; định lượng từng nhóm chưa nhập.</p>
            </> : <Empty filtered={!!q || !!direction} reset={() => { setQ(""); setDirection(""); }} />}</section>
          </div>}
          <details className="ml-help"><summary><Icon name="circle-help" width="18" height="18" />Trợ giúp &amp; căn cứ<span>Mở +</span></summary><div><p>Ủy quyền cho AI để thêm bản nháp. Mỗi mẫu lưu riêng ngày, bữa và nhóm khẩu phần. Mẫu tập thể hiện chưa hỗ trợ tính dinh dưỡng hoặc xuất đi chợ.</p><a href={`${site}/quan-tri/kho-thuc-don/huong-dan`} target="_blank" rel="noreferrer">Đọc hướng dẫn trên website ↗</a></div></details>
        </> : <MenuDetail key={`${detail.item.draft.id}-${detail.day}`} item={detail.item} initialDay={detail.day} back={back} />}
      </main>
      <footer className="ml-footer">Xem thử bố cục {layout.toUpperCase()} · Món và số suất là dữ liệu minh họa, chưa có tính toán dinh dưỡng.</footer>
    </div>
  </>;
}
function Empty({ filtered, reset }: { filtered: boolean; reset: () => void }) {
  return <div className="ml-empty"><h3>{filtered ? "Chưa tìm thấy mẫu phù hợp" : "Kho mẫu đang trống"}</h3><p className="ml-muted">{filtered ? "Thử tên khác hoặc bỏ bộ lọc hiện tại." : "Bắt đầu bằng bản nháp cho đơn vị hoặc người ăn của bạn."}</p>{filtered ? <button className="ml-back" onClick={reset}>Xóa bộ lọc</button> : <a className="ml-back" href={`${site}/quan-tri/ket-noi-ai`} target="_blank" rel="noreferrer">Ủy quyền AI thêm mẫu →</a>}</div>;
}
createRoot(document.getElementById("comparison")!).render(<App />);
