"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, pointerWithin, closestCenter, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Icon from "@/components/ui/Icon";
import { librarySection, hospitalUse } from "@/lib/menu-library/content-policy";
import { EMPTY_MANAGER_FILTERS, HOSPITAL_USES, LIBRARY_SECTIONS, energyLabel, parseTags, reorderSelectedMeals, type CatalogMenu, type ManagerFilters, type ManagerCatalog, type MealSelection, type MealTarget, type BatchRequest, type BatchOperation, type BatchResult } from "@/lib/menu-library/manager-contracts";
import TemplateWorkspace, { type OpenedTemplate } from "./TemplateWorkspace";
import NewTemplateForm from "./NewTemplateForm";
import { ManagerDialog, SectionButton, MenuCard, DayTarget, SelectedMealTray, MealBlock } from "./ManagerParts";
import styles from "./manager.module.css";
type Scope = {
  dayId: string;
  groupId: string;
};
const mealKey = (ref: MealSelection) => `${ref.id}:${ref.dayId}:${ref.mealId}:${ref.groupId}`;
const refOf = (item: CatalogMenu) => ({
  id: item.id,
  revision: item.revision
});
function snapshotItem(data: OpenedTemplate): CatalogMenu {
  const draft = data.content;
  return {
    id: data.template.id,
    title: draft.title,
    revision: data.template.revision,
    updatedAt: data.template.updatedAt,
    section: librarySection(draft),
    hospitalUse: hospitalUse(draft),
    description: draft.description ?? null,
    tags: draft.tags ?? [],
    availability: draft.availability?.state ?? "active",
    unitLabel: draft.unit?.label ?? null,
    eatingContext: draft.eatingContext ?? null,
    reviewState: data.currentReview?.decision ?? "draft",
    groups: draft.groups,
    days: draft.days.map(day => ({
      id: day.id,
      dayIndex: day.dayIndex,
      date: day.date,
      mealCount: day.meals.length,
      mealLabels: day.meals.map(meal => meal.label)
    }))
  };
}
export default function MenuLibraryManager() {
  const [filters, setFilters] = useState<ManagerFilters>(EMPTY_MANAGER_FILTERS),
    [result, setResult] = useState<ManagerCatalog | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState<OpenedTemplate | null>(null),
    [scope, setScope] = useState<Scope>({
      dayId: "",
      groupId: ""
    }),
    [editing, setEditing] = useState(false),
    [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<Record<string, CatalogMenu>>({}),
    [meals, setMeals] = useState<MealSelection[]>([]);
  const [pending, setPending] = useState<BatchRequest | null>(null),
    [busy, setBusy] = useState(false),
    [mutationError, setMutationError] = useState("");
  const [creatingBusy, setCreatingBusy] = useState(false),
    [editorSaving, setEditorSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false),
    [tagText, setTagText] = useState(""),
    [dragLabel, setDragLabel] = useState("");
  const [transfer, setTransfer] = useState<{
    sources: MealSelection[];
    menus: CatalogMenu[];
    choices: Record<string, Scope>;
    mode: "copy" | "move";
    requestKey: string;
  } | null>(null);
  const previewPane = useRef<HTMLElement>(null);
  const sequence = useRef(0),
    openSequence = useRef(0),
    writing = useRef(false),
    loadedFilters = useRef(EMPTY_MANAGER_FILTERS),
    dragMeals = useRef<MealSelection[]>([]);
  const sensors = useSensors(useSensor(MouseSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(TouchSensor, {
    activationConstraint: {
      delay: 220,
      tolerance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const csrf = result?.csrf ?? opened?.csrf ?? "",
    locked = busy || opening || editorSaving;
  const load = useCallback(async (f: ManagerFilters, offset = 0) => {
    const seq = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/menu-library/catalog?${new URLSearchParams({
        ...f,
        q: f.q.trim(),
        offset: String(offset)
      })}`, {
        cache: "no-store"
      });
      const data = await response.json();
      if (seq !== sequence.current) return;
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.message ?? "Chưa tải được kho thực đơn.");
      loadedFilters.current = f;
      setResult(previous => ({
        ...data,
        items: offset && previous ? [...previous.items, ...data.items] : data.items
      }));
    } catch (cause) {
      if (seq === sequence.current) setError(cause instanceof Error ? cause.message : "Chưa tải được kho thực đơn.");
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, []);
  const open = useCallback(async (id: string, requested?: Partial<Scope>, edit = false) => {
    const seq = ++openSequence.current;
    setOpening(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(id)}`, {
        cache: "no-store"
      });
      const data: OpenedTemplate & {
        message?: string;
      } = await response.json();
      if (seq !== openSequence.current) return;
      if (!response.ok) throw new Error(data.message ?? "Chưa mở được thực đơn.");
      if (requested?.dayId && !data.content.days.some(day => day.id === requested.dayId) || requested?.groupId && !data.content.groups.some(group => group.id === requested.groupId)) throw new Error("Ngày hoặc nhóm trong liên kết không còn tồn tại. Chọn lại từ kho.");
      const next = {
        dayId: requested?.dayId ?? data.content.days[0]?.id ?? "",
        groupId: requested?.groupId ?? data.content.groups[0]?.id ?? ""
      };
      setOpened(data);
      setScope(next);
      setEditing(edit);
      setDirty(false);
      const url = new URL(window.location.href);
      url.searchParams.set("template", id);
      url.searchParams.set("day", next.dayId);
      url.searchParams.set("group", next.groupId);
      window.history.replaceState(null, "", url);
    } catch (cause) {
      if (seq === openSequence.current) setError(cause instanceof Error ? cause.message : "Chưa mở được thực đơn.");
    } finally {
      if (seq === openSequence.current) setOpening(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(filters), 200);
    return () => window.clearTimeout(timer);
  }, [filters, load]);
  useEffect(() => {
    if (!opened) return;
    previewPane.current?.querySelector<HTMLHeadingElement>("h2")?.focus({ preventScroll: true });
    if (window.matchMedia?.("(max-width: 850px)").matches) previewPane.current?.scrollIntoView({ block: "start" });
  }, [opened]);
  const invalidate = useCallback(() => {
    sequence.current++;
    openSequence.current++;
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search),
        id = params.get("template");
      if (active && id) void open(id, {
        ...(params.get("day") ? {
          dayId: params.get("day")!
        } : {}),
        ...(params.get("group") ? {
          groupId: params.get("group")!
        } : {})
      });
    });
    return () => {
      active = false;
      invalidate();
    };
  }, [open, invalidate]);
  function changeScope(next: Scope) {
    setScope(next);
    if (opened) {
      const url = new URL(window.location.href);
      url.searchParams.set("day", next.dayId);
      url.searchParams.set("group", next.groupId);
      window.history.replaceState(null, "", url);
    }
  }
  function finishEditing() {
    setEditing(false);
    setDirty(false);
    if (opened) changeScope({
      dayId: opened.content.days.some(day => day.id === scope.dayId) ? scope.dayId : opened.content.days[0]?.id ?? "",
      groupId: opened.content.groups.some(group => group.id === scope.groupId) ? scope.groupId : opened.content.groups[0]?.id ?? ""
    });
  }
  function reloadSelections() {
    setPending(null);
    setTransfer(null);
    setSelected({});
    setMeals([]);
    setMutationError("");
    void load(filters);
    if (opened) void open(opened.template.id);
  }
  function choose(item: CatalogMenu) {
    if (dirty && !window.confirm("Bỏ thay đổi chưa lưu để mở thực đơn khác?")) return;
    void open(item.id);
  }
  function toggle(item: CatalogMenu) {
    setSelected(previous => {
      const next = {
        ...previous
      };
      if (next[item.id]) delete next[item.id];else next[item.id] = item;
      return next;
    });
  }
  function toggleMeal(item: MealSelection) {
    setMeals(previous => previous.some(value => mealKey(value) === mealKey(item)) ? previous.filter(value => mealKey(value) !== mealKey(item)) : [...previous, item]);
  }
  function prepare(operation: BatchOperation) {
    setPending({
      ...operation,
      requestKey: `batch-${crypto.randomUUID()}`,
      reason: operation.action === "trash" ? "Admin chuyển thực đơn vào thùng rác." : operation.action === "restore" ? "Admin khôi phục thực đơn từ thùng rác." : operation.action === "remove_meals" ? "Admin xóa các bữa đã chọn khỏi khẩu phần nhóm." : "Admin cập nhật kho thực đơn."
    });
    setMutationError("");
    setTagText("");
  }
  async function execute(operation: BatchRequest) {
    if (writing.current || !csrf) return;
    writing.current = true;
    setBusy(true);
    setMutationError("");
    try {
      const response = await fetch("/api/admin/menu-library/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-menu-library-csrf": csrf
        },
        body: JSON.stringify(operation)
      });
      const data: BatchResult & {
        message?: string;
      } = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Chưa hoàn tất thao tác.");
      const ids = new Set(data.items.map(item => item.id));
      setSelected(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !ids.has(id))));
      setMeals(previous => previous.filter(item => !ids.has(item.id)));
      setPending(null);
      setTransfer(null);
      setNotice(operation.action === "trash" ? `Đã chuyển ${data.items.length} thực đơn vào thùng rác.` : operation.action === "transfer" ? `Đã ${operation.mode === "move" ? "chuyển" : "sao chép"} ${operation.meals.length} bữa. Các thực đơn nhận bữa được lưu thành bản nháp mới.` : `Đã cập nhật ${data.items.length} thực đơn.`);
      if (opened && ids.has(opened.template.id)) void open(opened.template.id, scope);
      void load(loadedFilters.current);
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : "Chưa hoàn tất thao tác.");
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  function startTransfer(sources: MealSelection[], menus: CatalogMenu[], target?: MealTarget) {
    if (!sources.length || !menus.length) {
      setNotice("Chọn bữa nguồn và ít nhất một thực đơn nhận bữa.");
      return;
    }
    if (menus.length > 20) {
      setNotice("Mỗi lần sao chép chọn tối đa 20 thực đơn nhận bữa.");
      return;
    }
    setMutationError("");
    setTransfer({
      sources,
      menus,
      mode: "copy",
      requestKey: `batch-${crypto.randomUUID()}`,
      choices: Object.fromEntries(menus.map(menu => [menu.id, {
        dayId: target?.id === menu.id ? target.dayId : menu.days[0]?.id ?? "",
        groupId: target?.id === menu.id ? target.groupId : menu.groups.length === 1 ? menu.groups[0].id : ""
      }]))
    });
  }
  function dragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.kind === "meal") {
      const meal = data.selection as MealSelection;
      dragMeals.current = meals.some(item => mealKey(item) === mealKey(meal)) ? meals : [meal];
      setDragLabel(`${dragMeals.current.length} bữa`);
    } else if (data?.kind === "tray") {
      dragMeals.current = meals;
      setDragLabel(`${meals.length} bữa`);
    } else if (data?.kind === "template") setDragLabel(selected[data.item.id] ? `${Object.keys(selected).length} thực đơn` : data.item.title);
  }
  function dragEnd(event: DragEndEvent) {
    setDragLabel("");
    const source = event.active.data.current,
      target = event.over?.data.current;
    if (!source || !target || locked || !csrf) return;
    if (source.kind === "template" && target.kind === "section") {
      const items = selected[source.item.id] ? Object.values(selected) : [source.item as CatalogMenu];
      prepare({
        action: "section",
        items: items.map(refOf),
        section: target.section,
        hospitalUse: target.hospitalUse
      });
      return;
    }
    if ((source.kind === "meal" || source.kind === "tray") && target.kind === "day" && opened) {
      startTransfer(dragMeals.current, [snapshotItem(opened)], target.target);
      return;
    }
    if (source.kind === "meal" && target.kind === "meal" && opened) {
      const from = source.selection as MealSelection,
        to = target.selection as MealSelection;
      if (from.id !== to.id || from.dayId !== to.dayId || from.groupId !== to.groupId || from.mealId === to.mealId) return;
      if (dragMeals.current.some(item => item.id !== from.id || item.dayId !== from.dayId || item.groupId !== from.groupId)) {
        setNotice("Kéo nhóm bữa từ nhiều thực đơn vào ô ngày nhận bữa để sao chép hoặc chuyển.");
        return;
      }
      const day = opened.content.days.find(day => day.id === from.dayId);
      if (!day) return;
      const moving = new Set(dragMeals.current.map(item => item.mealId));
      if (moving.has(to.mealId)) return;
      const rest = reorderSelectedMeals(day.meals.map(meal => meal.id), [...moving], to.mealId);
      void execute({
        action: "reorder",
        item: {
          id: from.id,
          revision: from.revision
        },
        dayId: from.dayId,
        mealIds: rest,
        requestKey: `batch-${crypto.randomUUID()}`,
        reason: `Admin kéo sắp xếp bữa trong ngày ${from.dayIndex}.`
      });
    }
  }
  const selectedItems = Object.values(selected),
    preview = opened ? snapshotItem(opened) : null,
    day = opened?.content.days.find(day => day.id === scope.dayId);
  const visibleMeals = day?.meals.filter(meal => meal.groupPortions.some(portion => portion.groupId === scope.groupId)) ?? [];
  const actionLabel = pending?.action === "trash" ? "Xóa thực đơn" : pending?.action === "restore" ? "Khôi phục thực đơn" : pending?.action === "tag" ? "Gắn hashtag" : pending?.action === "section" ? "Chuyển kho" : "Xóa bữa đã chọn";
  return <DndContext sensors={sensors} collisionDetection={args => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)} onDragStart={dragStart} onDragEnd={dragEnd} onDragCancel={() => setDragLabel("")} accessibility={{
    screenReaderInstructions: {
      draggable: "Nhấn phím cách để bắt đầu kéo. Dùng phím mũi tên để di chuyển, phím cách để thả, Escape để hủy."
    }
  }}>
    <div className={styles.manager}>
      <div className={styles.managerTop}><nav aria-label="Kho thực đơn" className={styles.sectionTabs}>{LIBRARY_SECTIONS.map(option => <SectionButton key={option.value} value={option.value} label={option.label} selected={filters.section === option.value} disabled={locked || !csrf} onSelect={() => setFilters(previous => ({
            ...previous,
            section: option.value,
            hospitalUse: ""
          }))} />)}</nav><div className={styles.topActions}><button type="button" className={styles.secondary} disabled={locked} aria-pressed={filters.availability === "archived"} onClick={() => {
            setSelected({});
            setFilters(previous => ({
              ...previous,
              availability: previous.availability === "active" ? "archived" : "active"
            }));
          }}><Icon name="trash-2" />{filters.availability === "archived" ? "Về kho đang dùng" : "Thùng rác"}</button><button className={styles.primary} type="button" disabled={!csrf || locked} onClick={() => setCreateOpen(true)}><Icon name="plus" />Thêm thực đơn</button></div></div>
      {filters.section === "hospital" && <nav className={styles.hospitalTabs} aria-label="Mục bệnh viện">{HOSPITAL_USES.map(option => <SectionButton key={option.value} value="hospital" hospitalUse={option.value} label={`${option.label} · ${option.description}`} selected={filters.hospitalUse === option.value} disabled={locked || !csrf} onSelect={() => setFilters(previous => ({
          ...previous,
          hospitalUse: option.value
        }))} />)}</nav>}
      <div className={styles.searchRow}><form role="search" aria-label="Tìm thực đơn" onSubmit={event => {
          event.preventDefault();
          void load(filters);
        }}><Icon name="search" /><input type="search" disabled={locked} value={filters.q} maxLength={100} placeholder="Tìm tên, mô tả, đối tượng, món ăn hoặc hashtag…" aria-label="Tìm trong kho" onChange={event => setFilters(previous => ({
            ...previous,
            q: event.target.value
          }))} /><button type="submit" disabled={loading}>Tìm</button></form><button type="button" className={styles.textButton} onClick={() => setFilters(previous => ({
          ...previous,
          section: "",
          hospitalUse: "",
          q: ""
        }))}>Tìm cả ba kho</button></div>
      <div className={styles.listHeading}><label className={styles.checkLabel}><input type="checkbox" aria-label="Chọn tất cả thực đơn đang hiển thị" checked={!!result?.items.length && result.items.every(item => !!selected[item.id])} disabled={locked || loading || !result?.items.length} onChange={() => {
            const all = result!.items.every(item => !!selected[item.id]);
            setSelected(previous => {
              const next = {
                ...previous
              };
              result!.items.forEach(item => {
                if (all) delete next[item.id];else next[item.id] = item;
              });
              return next;
            });
          }} /><span>{result?.total ?? "—"} thực đơn{filters.availability === "archived" ? " trong thùng rác" : ""}</span></label><span>Mỗi thẻ là một bộ thực đơn</span></div>
      {!!selectedItems.length && <section className={styles.bulkBar} aria-label="Thao tác với thực đơn đã chọn"><strong>{selectedItems.length} thực đơn đã chọn</strong><button type="button" onClick={() => setSelected({})} disabled={locked}>Bỏ chọn</button>{filters.availability === "archived" ? <button type="button" onClick={() => prepare({
          action: "restore",
          items: selectedItems.map(refOf)
        })} disabled={locked || !csrf}>Khôi phục</button> : <><button type="button" onClick={() => prepare({
            action: "section",
            items: selectedItems.map(refOf),
            section: filters.section || "individual",
            hospitalUse: filters.section === "hospital" ? filters.hospitalUse || "patient_guidance" : null
          })} disabled={locked || !csrf}>Chuyển kho</button><button type="button" onClick={() => prepare({
            action: "tag",
            items: selectedItems.map(refOf),
            tags: []
          })} disabled={locked || !csrf}>Gắn hashtag</button><button type="button" disabled={locked || !csrf || !meals.length} onClick={() => startTransfer(meals, selectedItems)}>Nhận bữa đã chọn</button><button type="button" className={styles.deleteButton} onClick={() => prepare({
            action: "trash",
            items: selectedItems.map(refOf)
          })} disabled={locked || !csrf}><Icon name="trash-2" />Xóa</button></>}</section>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}{error && <div role="alert" className={styles.error}><p>{error}</p><p>Danh mục hiện có là lần tải trước.</p><button type="button" onClick={() => void load(filters)}>Tải lại kho</button></div>}{mutationError && !pending && !transfer && <p role="alert" className={styles.error}>{mutationError}</p>}
      <div className={`${styles.managerGrid} ${opened ? styles.withPreview : ""}`}>
        <section className={styles.catalogPane} aria-label="Danh mục thực đơn" aria-busy={loading}>
          {loading && <p role="status" className={styles.muted}>Đang tải thực đơn…</p>}
          {!loading && !error && !result?.items.length && <div className={styles.empty}><Icon name="notebook-tabs" /><h2>Chưa có thực đơn phù hợp</h2><p>Thử từ khóa khác hoặc thêm thực đơn mới.</p></div>}
          <ul className={styles.cardGrid}>{result?.items.map(item => <MenuCard key={item.id} item={item} checked={!!selected[item.id]} opened={opened?.template.id === item.id} onSelect={() => toggle(item)} onOpen={() => choose(item)} onTrash={() => prepare({
              action: item.availability === "archived" ? "restore" : "trash",
              items: [refOf(item)]
            })} busy={locked || loading || !csrf || !!error} />)}</ul>
          {result?.nextOffset != null && <button className={styles.more} type="button" disabled={loading} onClick={() => void load(loadedFilters.current, result.nextOffset!)}>Xem thêm thực đơn</button>}
        </section>
        {opened && preview && <aside ref={previewPane} className={styles.preview} aria-label="Xem nhanh thực đơn" aria-busy={opening}>
          <header className={styles.previewHeader}><div><span>Xem nhanh · {preview.days.length} ngày</span><h2 tabIndex={-1}>{opened.content.title}</h2><p>{opened.content.description ?? "Chưa có mô tả"}</p></div><button type="button" aria-label="Đóng xem nhanh" onClick={() => {
              openSequence.current++;
              setOpening(false);
              setOpened(null);
              const url = new URL(window.location.href);
              ["template", "day", "group"].forEach(key => url.searchParams.delete(key));
              window.history.replaceState(null, "", url);
            }}><Icon name="x" /></button></header>
          <div className={styles.previewFacts}><strong>{energyLabel(preview.groups)}</strong><span>{preview.groups.map(group => group.label).join(" / ")}</span></div>
          <div className={styles.previewTools}><label>Khẩu phần<select aria-label="Khẩu phần đang xem" value={scope.groupId} onChange={event => changeScope({
                ...scope,
                groupId: event.target.value
              })}>{opened.content.groups.map(group => <option key={group.id} value={group.id}>{group.label}{group.designEnergyKcal ? ` · ${group.designEnergyKcal} kcal` : ""}</option>)}</select></label><button type="button" className={styles.primary} disabled={locked || !csrf} onClick={() => setEditing(true)}>Chỉnh sửa &amp; nhập món</button></div>
          <div className={styles.dayTargets} aria-label="Ngày ăn và vùng nhận bữa">{opened.content.days.map(d => <DayTarget key={d.id} target={{
              ...refOf(preview),
              dayId: d.id,
              groupId: scope.groupId
            }} dayIndex={d.dayIndex} mealCount={d.meals.filter(meal => meal.groupPortions.some(p => p.groupId === scope.groupId)).length} selected={scope.dayId === d.id} onSelect={() => changeScope({
              ...scope,
              dayId: d.id
            })} disabled={locked || !csrf || preview.availability === "archived"} />)}</div>
          <div className={styles.mealBoardHeading}><label className={styles.checkLabel}><input type="checkbox" aria-label="Chọn tất cả bữa trong ngày đang xem" checked={!!visibleMeals.length && visibleMeals.every(meal => meals.some(item => item.id === preview.id && item.dayId === scope.dayId && item.groupId === scope.groupId && item.mealId === meal.id))} disabled={locked || preview.availability === "archived"} onChange={() => {
                const refs = visibleMeals.map(meal => ({
                  ...refOf(preview),
                  ...scope,
                  mealId: meal.id,
                  title: preview.title,
                  label: meal.label,
                  dayIndex: day!.dayIndex
                }));
                const all = refs.every(ref => meals.some(item => mealKey(ref) === mealKey(item)));
                setMeals(previous => all ? previous.filter(item => !refs.some(ref => mealKey(ref) === mealKey(item))) : [...previous.filter(item => !refs.some(ref => mealKey(ref) === mealKey(item))), ...refs]);
              }} /><strong>Ngày {day?.dayIndex} · {visibleMeals.length} bữa</strong></label><span>Kéo tay nắm để sắp xếp; thả vào ô ngày để sao chép.</span></div>
          <SortableContext items={visibleMeals.map(meal => `meal:${preview.id}:${scope.dayId}:${meal.id}:${scope.groupId}`)} strategy={verticalListSortingStrategy}><div className={styles.mealBoard}>{visibleMeals.map(meal => {
                const selection = {
                  ...refOf(preview),
                  ...scope,
                  mealId: meal.id,
                  title: preview.title,
                  label: meal.label,
                  dayIndex: day!.dayIndex
                };
                return <MealBlock key={meal.id} meal={meal} selection={selection} checked={meals.some(item => mealKey(item) === mealKey(selection))} onSelect={() => toggleMeal(selection)} foods={opened.foods} disabled={locked || !csrf || preview.availability === "archived"} />;
              })}</div></SortableContext>
          {!visibleMeals.length && <div className={styles.empty}><p>Ngày này chưa có bữa cho nhóm đang xem.</p><button type="button" className={styles.textButton} onClick={() => setEditing(true)} disabled={locked || !csrf}>Thêm bữa &amp; nhập món</button></div>}
        </aside>}
      </div>
      <SelectedMealTray items={meals} onRemove={item => setMeals(previous => previous.filter(value => mealKey(value) !== mealKey(item)))} onClear={() => setMeals([])} busy={locked} onPaste={() => startTransfer(meals, selectedItems.length ? selectedItems : preview ? [preview] : [])} onDelete={() => prepare({
        action: "remove_meals",
        meals
      })} />
    </div>
    <DragOverlay dropAnimation={null}>{dragLabel && <div className={styles.dragGhost}><Icon name="menu" />{dragLabel}</div>}</DragOverlay>
    {createOpen && <ManagerDialog title="Thêm thực đơn" busy={creatingBusy} onClose={() => setCreateOpen(false)}><NewTemplateForm onSaving={setCreatingBusy} csrf={csrf} section={filters.section} hospitalUse={filters.hospitalUse} onCancel={() => setCreateOpen(false)} onCreated={id => {
        setCreateOpen(false);
        void load(filters);
        void open(id, undefined, true);
      }} /></ManagerDialog>}
    {editing && opened && <ManagerDialog title="Biên soạn thực đơn" wide busy={editorSaving} onClose={() => {
      if (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?")) finishEditing();
    }}><TemplateWorkspace key={`${opened.template.id}:${opened.template.revision}`} initialEditing onCancelEditing={finishEditing} onSaving={setEditorSaving} data={opened} initialDayId={scope.dayId} initialGroupId={scope.groupId} onScopeChange={changeScope} onDirty={setDirty} onReload={() => {
        void open(opened.template.id, scope);
        void load(loadedFilters.current);
      }} /></ManagerDialog>}
    {pending && <ManagerDialog title={actionLabel} busy={busy} onClose={() => setPending(null)}><form className={styles.form} onSubmit={event => {
        event.preventDefault();
        void execute(pending.action === "tag" ? {
          ...pending,
          tags: parseTags(tagText)
        } : pending);
      }}><p>{"items" in pending ? `${pending.items.length} thực đơn đã chọn` : `${"meals" in pending ? pending.meals.length : 0} bữa đã chọn`}</p>{pending.action === "trash" && <p>Thực đơn được chuyển vào thùng rác và có thể khôi phục. Nội dung và lịch sử được giữ lại.</p>}{pending.action === "remove_meals" && <p>Xóa các bữa khỏi khẩu phần nhóm đã chọn. Các nhóm khác trong cùng bữa được giữ nguyên.</p>}{pending.action === "tag" && <label>Hashtag, cách nhau bằng dấu phẩy<input required maxLength={1000} value={tagText} onChange={event => setTagText(event.target.value)} placeholder="Ăn dặm, Mềm, Ít muối…" /></label>}{pending.action === "section" && <><label>Kho nhận<select value={pending.section} onChange={event => setPending({
              ...pending,
              section: event.target.value,
              hospitalUse: event.target.value === "hospital" ? "patient_guidance" : null
            })}>{LIBRARY_SECTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{pending.section === "hospital" && <label>Mục bệnh viện<select value={pending.hospitalUse ?? "patient_guidance"} onChange={event => setPending({
              ...pending,
              hospitalUse: event.target.value
            })}>{HOSPITAL_USES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}</>}{mutationError && <div role="alert" className={styles.error}><p>{mutationError}</p><button type="button" disabled={busy} onClick={reloadSelections}>Tải lại để chọn lại</button></div>}<div className={styles.dialogActions}><button type="button" onClick={() => setPending(null)} disabled={busy}>Hủy</button><button className={pending.action === "trash" || pending.action === "remove_meals" ? styles.danger : styles.primary} disabled={busy}>{busy ? "Đang lưu…" : actionLabel}</button></div></form></ManagerDialog>}
    {transfer && <ManagerDialog title="Sao chép / chuyển bữa" busy={busy} onClose={() => setTransfer(null)}><form className={styles.form} onSubmit={event => {
        event.preventDefault();
        if (transfer.menus.some(menu => !transfer.choices[menu.id]?.dayId || !transfer.choices[menu.id]?.groupId)) {
          setMutationError("Chọn ngày và khẩu phần nhận bữa cho từng thực đơn.");
          return;
        }
        void execute({
          action: "transfer",
          meals: transfer.sources.map(({
            id,
            revision,
            dayId,
            mealId,
            groupId
          }) => ({
            id,
            revision,
            dayId,
            mealId,
            groupId
          })),
          targets: transfer.menus.map(menu => ({
            ...refOf(menu),
            ...transfer.choices[menu.id]
          })),
          mode: transfer.mode,
          requestKey: transfer.requestKey,
          reason: `Admin ${transfer.mode === "copy" ? "sao chép" : "chuyển"} ${transfer.sources.length} bữa vào ngày / nhóm đã chọn.`
        });
      }}><p><strong>{transfer.sources.length} bữa nguồn</strong> → {transfer.menus.length} thực đơn nhận</p><ul className={styles.transferSources}>{transfer.sources.map(item => <li key={mealKey(item)}>{item.label} · {item.title} · Ngày {item.dayIndex}</li>)}</ul><label>Thao tác<select value={transfer.mode} onChange={event => setTransfer({
            ...transfer,
            mode: event.target.value as "copy" | "move"
          })}><option value="copy">Sao chép — giữ bữa nguồn</option>{transfer.menus.length === 1 && <option value="move">Chuyển — bỏ bữa ở nguồn</option>}</select></label>{transfer.menus.map(menu => <fieldset className={styles.targetChoice} key={menu.id}><legend>{menu.title}</legend><label>Ngày nhận<select required value={transfer.choices[menu.id]?.dayId ?? ""} onChange={event => setTransfer({
              ...transfer,
              choices: {
                ...transfer.choices,
                [menu.id]: {
                  ...transfer.choices[menu.id],
                  dayId: event.target.value
                }
              }
            })}><option value="">Chọn ngày</option>{menu.days.map(day => <option key={day.id} value={day.id}>Ngày {day.dayIndex} · {day.mealCount} bữa</option>)}</select></label><label>Khẩu phần nhận<select required value={transfer.choices[menu.id]?.groupId ?? ""} onChange={event => setTransfer({
              ...transfer,
              choices: {
                ...transfer.choices,
                [menu.id]: {
                  ...transfer.choices[menu.id],
                  groupId: event.target.value
                }
              }
            })}><option value="">Chọn khẩu phần</option>{menu.groups.map(group => <option key={group.id} value={group.id}>{group.label}{group.designEnergyKcal ? ` · ${group.designEnergyKcal} kcal` : ""}</option>)}</select></label></fieldset>)}<p className={styles.muted}>Thêm nguyên bữa vào ngày nhận, giữ nguyên định lượng một suất. Kiểm tra lại mức năng lượng và sự phù hợp với nhóm nhận trước khi duyệt.</p>{mutationError && <div role="alert" className={styles.error}><p>{mutationError}</p><button type="button" disabled={busy} onClick={reloadSelections}>Tải lại để chọn lại</button></div>}<div className={styles.dialogActions}><button type="button" onClick={() => setTransfer(null)} disabled={busy}>Hủy</button><button className={styles.primary} disabled={busy}>{busy ? "Đang lưu…" : transfer.mode === "copy" ? "Sao chép các bữa" : "Chuyển các bữa"}</button></div></form></ManagerDialog>}
  </DndContext>;
}
