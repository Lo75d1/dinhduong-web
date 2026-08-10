"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToHorizontalAxis, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import MenuFoodSearch from "./MenuFoodSearch";
import MultiDayAnalysis from "./MultiDayAnalysis";
import PersonalProfile, { DEFAULT_PROFILE, type Profile } from "./PersonalProfile";
import type { RecommendationRow } from "./matchRecommendation";
import { basisForMode, calculateQuantity } from "./quantity";
import { loadRows, type Row } from "./types";
import {
  addDishRecipe,
  addEmptyDish,
  addEmptyMeal,
  addFoodToDish,
  dayKcal,
  dayMealsOrdered,
  deleteDishInRows,
  duplicateDay,
  duplicateDishInRows,
  duplicateMealInRows,
  loadMenuDays,
  makeEmptyDay,
  mealNodeKcal,
  moveDishToDay,
  reorderMealsInRows,
  renameMealInRows,
  rowKcal,
  saveMenuDays,
  type MenuDay,
  type MenuDishIngredient,
  type MenuFoodResult,
} from "./multi-day";

// Tông xanh dương của chế độ nhiều ngày (khác xanh rêu của chế độ một ngày).
const INK = "#0C447C";
const ACCENT = "#185FA5";

const round = (n: number) => Math.round(n * 10) / 10;

function useMenuSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export default function MultiDayBoard({ view = "entry" }: { view?: "entry" | "analysis" }) {
  const [days, setDays] = useState<MenuDay[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState<{ dayId: string; meal: string } | null>(null);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [activeDish, setActiveDish] = useState<{ label: string } | null>(null);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  // #3: món đang chọn (trong bữa đang mở) + tab của thanh tìm cố định đáy màn hình
  const [selDish, setSelDish] = useState<string | null>(null);
  const [bottomKind, setBottomKind] = useState<"food" | "dish">("food");
  const daySensors = useMenuSensors();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDays(loadMenuDays());
    try {
      const rawProfile = window.localStorage.getItem("khauphan_profile_v1");
      if (rawProfile) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(rawProfile) });
    } catch {
      setProfile(null);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onProfile(event: Event) {
      setProfile({ ...DEFAULT_PROFILE, ...(event as CustomEvent<Profile>).detail });
    }
    window.addEventListener("khauphan:profile", onProfile);
    return () => window.removeEventListener("khauphan:profile", onProfile);
  }, []);

  useEffect(() => {
    fetch("/api/nutrition-recommendations")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setRecommendations(Array.isArray(data.items) ? data.items : []))
      .catch(() => setRecommendations([]));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveMenuDays(days);
  }, [days, hydrated]);

  useEffect(() => {
    if (!moveNotice) return;
    const t = window.setTimeout(() => setMoveNotice(null), 4500);
    return () => window.clearTimeout(t);
  }, [moveNotice]);

  function importCurrentDay() {
    const rows = loadRows().map((row) => ({ ...row }));
    if (!rows.length) {
      window.alert(
        "Chưa có khẩu phần nào ở chế độ một ngày để nhập vào. Hãy dựng một ngày ở tab 'Một ngày' rồi quay lại đây nhập."
      );
      return;
    }
    setDays((prev) => [
      ...prev,
      { id: makeEmptyDay(prev.length).id, label: `Ngày ${prev.length + 1}`, date: "", rows },
    ]);
  }

  function addEmptyDay() {
    setDays((prev) => [...prev, makeEmptyDay(prev.length)]);
  }

  function onDuplicateDay(index: number) {
    setDays((prev) => {
      const copy = duplicateDay(prev[index], prev.length);
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }

  function onDeleteDay(id: string) {
    const day = days.find((d) => d.id === id);
    if (day && day.rows.length && !window.confirm(`Xóa "${day.label}" và toàn bộ nội dung?`)) return;
    setDays((prev) => prev.filter((d) => d.id !== id));
    setExpanded((cur) => (cur?.dayId === id ? null : cur));
  }

  function moveDay(index: number, dir: "up" | "down") {
    const swap = dir === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= days.length) return;
    setDays((prev) => {
      const next = [...prev];
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  function resolveDayIdFromOver(overId: string): string | null {
    if (overId.startsWith("dropday::")) return overId.slice("dropday::".length);
    if (overId.startsWith("dish::")) return overId.split("::")[1];
    return days.some((d) => d.id === overId) ? overId : null;
  }

  function onBoardDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("dish::")) {
      const parts = id.split("::");
      setActiveDish({ label: parts.slice(3).join("::") });
    } else {
      setActiveDayId(id);
    }
  }

  function onBoardDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    setActiveDayId(null);
    setActiveDish(null);
    if (!overId) return;
    // Kéo MÓN sang ngày khác
    if (activeId.startsWith("dish::")) {
      const parts = activeId.split("::");
      const srcDayId = parts[1];
      const meal = parts[2];
      const dish = parts.slice(3).join("::");
      const targetDayId = resolveDayIdFromOver(overId);
      if (targetDayId && targetDayId !== srcDayId) {
        const srcLabel = days.find((d) => d.id === srcDayId)?.label ?? "?";
        const dstLabel = days.find((d) => d.id === targetDayId)?.label ?? "?";
        setDays((cur) => moveDishToDay(cur, srcDayId, meal, dish, targetDayId));
        setExpanded(null);
        setMoveNotice(`Đã chuyển món “${dish}” (bữa ${meal}) từ ${srcLabel} → ${dstLabel}`);
      }
      return;
    }
    // Sắp xếp NGÀY
    if (activeId === overId) return;
    setDays((current) => {
      const from = current.findIndex((day) => day.id === activeId);
      const to = current.findIndex((day) => day.id === overId);
      return from >= 0 && to >= 0 ? arrayMove(current, from, to) : current;
    });
  }

  function patchDay(id: string, patch: Partial<MenuDay>) {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function patchDayRows(id: string, updater: (rows: Row[]) => Row[]) {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, rows: updater(d.rows) } : d)));
  }

  function onRenameMeal(dayId: string, oldName: string, newName: string) {
    patchDayRows(dayId, (rows) => renameMealInRows(rows, oldName, newName));
    setExpanded((cur) =>
      cur?.dayId === dayId && cur.meal === oldName && newName.trim() ? { dayId, meal: newName.trim() } : cur
    );
  }

  function onDuplicateMeal(dayId: string, meal: string) {
    patchDayRows(dayId, (rows) => duplicateMealInRows(rows, meal));
  }

  function onDeleteMeal(dayId: string, meal: string) {
    if (!window.confirm(`Xóa bữa "${meal}" khỏi ngày này?`)) return;
    patchDayRows(dayId, (rows) => rows.filter((r) => r.meal !== meal));
    setExpanded((cur) => (cur?.dayId === dayId && cur.meal === meal ? null : cur));
  }

  function onReorderMeal(dayId: string, activeMeal: string, overMeal: string) {
    patchDayRows(dayId, (rows) => reorderMealsInRows(rows, activeMeal, overMeal));
  }

  function updateRowGrams(dayId: string, uid: string, inputGrams: number) {
    const basis = basisForMode("menu");
    patchDayRows(dayId, (rows) =>
      rows.map((r) => {
        if (r.uid !== uid) return r;
        const q = calculateQuantity({ grams: inputGrams, basis, conversionFactor: r.conversionFactor, wastePercent: r.wastePercent });
        return { ...r, inputGrams, inputBasis: basis, grams: q.edibleGrams ?? 0 };
      })
    );
  }

  function deleteRow(dayId: string, uid: string) {
    patchDayRows(dayId, (rows) => rows.filter((r) => r.uid !== uid));
  }

  function addMealToDay(dayId: string) {
    const day = days.find((d) => d.id === dayId);
    const count = day ? new Set(day.rows.map((r) => r.meal)).size : 0;
    patchDayRows(dayId, (rows) => addEmptyMeal(rows, `Bữa ${count + 1}`));
  }

  function addDishToMeal(dayId: string, meal: string, name: string) {
    if (!name.trim()) return;
    patchDayRows(dayId, (rows) => addEmptyDish(rows, meal, name.trim()));
  }

  function deleteDishMenu(dayId: string, meal: string, dish: string) {
    if (!window.confirm(`Xóa món "${dish}" khỏi bữa này?`)) return;
    patchDayRows(dayId, (rows) => deleteDishInRows(rows, meal, dish));
  }

  function duplicateDishMenu(dayId: string, meal: string, dish: string) {
    patchDayRows(dayId, (rows) => duplicateDishInRows(rows, meal, dish));
  }

  function addFood(dayId: string, meal: string, dish: string, food: MenuFoodResult) {
    patchDayRows(dayId, (rows) => addFoodToDish(rows, meal, dish, food, "menu"));
  }

  function addRecipe(dayId: string, meal: string, dishName: string, ingredients: MenuDishIngredient[]) {
    let msg = "";
    patchDayRows(dayId, (rows) => {
      const result = addDishRecipe(rows, meal, dishName, ingredients, "menu");
      if (result.added === 0) msg = "Món này chưa liên kết được nguyên liệu nào để tính dinh dưỡng.";
      else if (result.skipped > 0) msg = `Đã thêm ${result.added} nguyên liệu có dữ liệu; ${result.skipped} nguyên liệu chưa liên kết dữ liệu nên bỏ qua.`;
      return result.rows;
    });
    if (msg) window.setTimeout(() => window.alert(msg), 0);
  }

  // Bữa đang mở + các món của nó (để thanh tìm đáy biết thêm vào đâu).
  const openDay = expanded ? days.find((d) => d.id === expanded.dayId) : null;
  const openMealDishes = openDay ? dayMealsOrdered(openDay).find((m) => m.meal === expanded!.meal)?.dishes.map((d) => d.dish) ?? [] : [];
  const targetDish = selDish && openMealDishes.includes(selDish) ? selDish : (openMealDishes[0] ?? null);

  function pickFoodBottom(food: MenuFoodResult) {
    if (!expanded) { window.alert("Bấm vào một bữa (rồi chọn món) để thêm thực phẩm."); return; }
    if (!targetDish) { window.alert("Bữa này chưa có món. Dùng tab “Món ăn” để thêm món trước, hoặc bấm “＋ Món trống”."); return; }
    addFood(expanded.dayId, expanded.meal, targetDish, food);
  }
  function pickDishBottom(dish: { name: string; ingredients: MenuDishIngredient[] }) {
    if (!expanded) { window.alert("Bấm vào một bữa để thêm món."); return; }
    addRecipe(expanded.dayId, expanded.meal, dish.name, dish.ingredients);
    setSelDish(dish.name);
  }

  const totalKcalAll = days.reduce((s, d) => s + dayKcal(d), 0);

  return (
    <section className="flex flex-col gap-3" aria-label="Thực đơn nhiều ngày">
      {view === "entry" && <>
      {/* Thanh công cụ — gọn: chỉ tiêu đề + tổng. Thêm/nhân đôi ngày dùng nút dưới + góc ngày. */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: "#B5D4F4", background: "#F4F9FE" }}>
        <span className="text-base font-semibold" style={{ color: INK }}>🍽️ Thực đơn nhiều ngày</span>
        <PersonalProfile onChange={setProfile} />
        <span className="rounded-full bg-[#e6f7ef] px-2 py-0.5 text-xs font-semibold text-[#0c5f4d]" title="Thực đơn được tự động lưu vào trình duyệt máy này (chưa đăng nhập/lưu server)">✓ Tự lưu trên máy này</span>
        <span className="ml-auto text-sm" style={{ color: "#5a708c" }}>
          {days.length} ngày · tổng <b style={{ color: INK }}>{round(totalKcalAll)}</b> kcal
        </span>
      </div>

      {moveNotice && (
        <div className="menu-day-enter flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: ACCENT, background: "#E6F1FB", color: INK }}>
          <span>↔ {moveNotice}</span>
          <button type="button" onClick={() => setMoveNotice(null)} className="ml-auto text-xs font-semibold" style={{ color: ACCENT }}>✕</button>
        </div>
      )}

      {days.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed px-5 py-10 text-center" style={{ borderColor: "#B5D4F4", color: "#5a708c" }}>
          <p className="text-base">Chưa có ngày nào. Bấm <b>“＋ Thêm ngày”</b> để bắt đầu dựng thực đơn — mỗi ngày thêm bữa, món và thực phẩm.</p>
          <button type="button" onClick={addEmptyDay} className="mt-4 rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ background: ACCENT }}>＋ Thêm ngày</button>
          <p className="mt-3 text-xs">Hoặc dựng ở tab <b>Một ngày</b> rồi <button type="button" onClick={importCurrentDay} className="underline" style={{ color: ACCENT }}>nhập ngày đang mở</button>.</p>
        </div>
      ) : (
        <DndContext
          sensors={daySensors}
          collisionDetection={closestCenter}
          modifiers={activeDish ? [] : [restrictToVerticalAxis]}
          onDragStart={onBoardDragStart}
          onDragCancel={() => { setActiveDayId(null); setActiveDish(null); }}
          onDragEnd={onBoardDragEnd}
        >
          <SortableContext items={days.map((day) => day.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2.5">
              {days.map((day, index) => (
                <SortableDayCard
                  key={day.id}
                  day={day}
                  isFirst={index === 0}
                  isLast={index === days.length - 1}
                  expandedMeal={expanded?.dayId === day.id ? expanded.meal : null}
                  onToggleMeal={(meal) =>
                    setExpanded((cur) => (cur?.dayId === day.id && cur.meal === meal ? null : { dayId: day.id, meal }))
                  }
                  onRename={(label) => patchDay(day.id, { label })}
                  onSetDate={(date) => patchDay(day.id, { date })}
                  onDuplicate={() => onDuplicateDay(index)}
                  onDelete={() => onDeleteDay(day.id)}
                  onMove={(dir) => moveDay(index, dir)}
                  onRenameMeal={(oldName, newName) => onRenameMeal(day.id, oldName, newName)}
                  onDuplicateMeal={(meal) => onDuplicateMeal(day.id, meal)}
                  onDeleteMeal={(meal) => onDeleteMeal(day.id, meal)}
                  onReorderMeal={(activeMeal, overMeal) => onReorderMeal(day.id, activeMeal, overMeal)}
                  onUpdateGrams={(uid, g) => updateRowGrams(day.id, uid, g)}
                  onDeleteRow={(uid) => deleteRow(day.id, uid)}
                  onAddMeal={() => addMealToDay(day.id)}
                  onAddDish={(meal, name) => addDishToMeal(day.id, meal, name)}
                  onAddFood={(meal, dish, food) => addFood(day.id, meal, dish, food)}
                  onAddRecipe={(meal, dishName, ingredients) => addRecipe(day.id, meal, dishName, ingredients)}
                  onDeleteDish={(meal, dish) => deleteDishMenu(day.id, meal, dish)}
                  onDuplicateDish={(meal, dish) => duplicateDishMenu(day.id, meal, dish)}
                  selectedDish={expanded?.dayId === day.id ? selDish : null}
                  onSelectDish={setSelDish}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeDayId ? <div className="rounded-xl border-2 bg-white px-4 py-3 text-sm font-bold shadow-xl" style={{ borderColor: ACCENT, color: INK }}>{days.find((day) => day.id === activeDayId)?.label ?? "Ngày"}</div>
              : activeDish ? <div className="rounded-lg border-2 bg-white px-3 py-2 text-sm font-bold shadow-xl" style={{ borderColor: ACCENT, color: INK }}>🍽️ {activeDish.label}</div>
              : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Nút thêm ngày cuối bảng — thêm ngày trống là chính; nhập ngày đang mở là phụ */}
      {days.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={addEmptyDay} className="flex-1 rounded-lg border-2 border-dashed px-3 py-3 text-base font-semibold" style={{ borderColor: ACCENT, color: INK, background: "#F4F9FE" }}>＋ Thêm ngày</button>
          <button type="button" onClick={importCurrentDay} className="rounded-lg border px-3 py-3 text-sm font-semibold" style={{ borderColor: "#B5D4F4", color: "#5a708c" }} title="Lấy khẩu phần đang mở ở tab Một ngày">↧ nhập ngày đang mở</button>
        </div>
      )}

      {/* #3 · Thanh tìm & thêm CỐ ĐỊNH đáy màn hình (như 1 ngày): thêm vào bữa/món đang chọn */}
      {days.length > 0 && (
        <div className="sticky bottom-0 z-30 -mx-1 mt-1 rounded-t-xl border-2 border-b-0 bg-white px-3 py-2 shadow-[0_-6px_18px_rgba(12,68,124,0.15)]" style={{ borderColor: ACCENT }}>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold" style={{ color: INK }}>🔎 Tìm & thêm</span>
            <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: "#B5D4F4" }}>
              {(["food", "dish"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setBottomKind(k)} className="px-3 py-1 text-sm font-semibold" style={bottomKind === k ? { background: ACCENT, color: "#fff" } : { color: "#5a708c" }}>{k === "food" ? "Thực phẩm" : "Món ăn"}</button>
              ))}
            </div>
            <span className="text-xs" style={{ color: expanded ? INK : "#8a5a1d" }}>
              {expanded ? <>→ thêm vào <b>{openDay?.label} · {expanded.meal}{bottomKind === "food" && targetDish ? ` · ${targetDish}` : ""}</b></> : "Bấm một bữa (rồi chọn món) để chọn nơi thêm"}
            </span>
          </div>
          <MenuFoodSearch kind={bottomKind} onPickFood={pickFoodBottom} onPickDish={pickDishBottom} />
        </div>
      )}
      </>}

      {view === "analysis" && (days.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed px-5 py-10 text-center" style={{ borderColor: "#B5D4F4", color: "#5a708c" }}>
          <p className="text-sm">Chưa có ngày nào để phân tích. Sang bước <b>Nhập</b> để dựng thực đơn nhiều ngày.</p>
        </div>
      ) : (
        <>
          <MultiDayAnalysis days={days} profile={profile} recommendations={recommendations} />
        </>
      ))}
    </section>
  );
}

type DayCardProps = {
  day: MenuDay;
  isFirst: boolean;
  isLast: boolean;
  expandedMeal: string | null;
  dragHandle?: ReactNode;
  onToggleMeal: (meal: string) => void;
  onRename: (label: string) => void;
  onSetDate: (date: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
  onRenameMeal: (oldName: string, newName: string) => void;
  onDuplicateMeal: (meal: string) => void;
  onDeleteMeal: (meal: string) => void;
  onReorderMeal: (activeMeal: string, overMeal: string) => void;
  onUpdateGrams: (uid: string, grams: number) => void;
  onDeleteRow: (uid: string) => void;
  onAddMeal: () => void;
  onAddDish: (meal: string, name: string) => void;
  onAddFood: (meal: string, dish: string, food: MenuFoodResult) => void;
  onAddRecipe: (meal: string, dishName: string, ingredients: MenuDishIngredient[]) => void;
  onDeleteDish: (meal: string, dish: string) => void;
  onDuplicateDish: (meal: string, dish: string) => void;
  selectedDish: string | null;
  onSelectDish: (dish: string) => void;
};

function SortableDayCard(props: DayCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.day.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1, zIndex: isDragging ? 5 : undefined }}>
    <DayCard
      {...props}
      dragHandle={<button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Kéo để sắp xếp ${props.day.label}`} title="Giữ và kéo để sắp xếp ngày" className="cursor-grab touch-none select-none rounded px-1 py-0.5 text-lg active:cursor-grabbing" style={{ color: ACCENT }}>⋮⋮</button>}
    />
  </div>;
}

function DayCard({
  day,
  isFirst,
  isLast,
  expandedMeal,
  dragHandle,
  onToggleMeal,
  onRename,
  onSetDate,
  onDuplicate,
  onDelete,
  onMove,
  onRenameMeal,
  onDuplicateMeal,
  onDeleteMeal,
  onReorderMeal,
  onUpdateGrams,
  onDeleteRow,
  onAddMeal,
  onAddDish,
  onAddFood,
  onAddRecipe,
  onDeleteDish,
  onDuplicateDish,
  selectedDish,
  onSelectDish,
}: DayCardProps) {
  const meals = dayMealsOrdered(day);
  const kcal = dayKcal(day);
  const mealSensors = useMenuSensors();
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  // Vùng thả cho món kéo từ ngày khác sang.
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `dropday::${day.id}` });
  function onMealDragEnd(event: DragEndEvent) {
    const overMeal = event.over?.id ? String(event.over.id) : null;
    const active = String(event.active.id);
    setActiveMeal(null);
    if (overMeal && active !== overMeal) onReorderMeal(active, overMeal);
  }
  return (
    <div ref={setDropRef} className="menu-day-enter overflow-hidden rounded-xl border transition-colors" style={{ borderColor: isOver ? ACCENT : "#B5D4F4", borderWidth: isOver ? 2 : 1, background: isOver ? "#E6F1FB" : "#fff" }}>
      {/* Đầu ngày */}
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5" style={{ background: "#E6F1FB" }}>
        {dragHandle}
        <EditableText value={day.label} onCommit={onRename} className="rounded bg-transparent px-1 py-0.5 text-sm font-semibold focus:bg-white" style={{ color: INK, minWidth: 70 }} />
        <input
          type="date"
          value={day.date}
          onChange={(e) => onSetDate(e.target.value)}
          className="rounded border px-1.5 py-0.5 text-xs"
          style={{ borderColor: "#B5D4F4", color: "#5a708c" }}
          title="Gán ngày cụ thể (không bắt buộc)"
        />
        <span className="rounded px-2 py-0.5 text-xs font-bold tabular-nums" style={{ background: "#B5D4F4", color: INK }}>{Math.round(kcal)} kcal</span>
        <div className="ml-auto flex items-center gap-0.5" style={{ color: ACCENT }}>
          <button type="button" onClick={() => onMove("up")} disabled={isFirst} title="Lên" className="rounded px-1 text-xs hover:bg-white/70 disabled:opacity-30">▲</button>
          <button type="button" onClick={() => onMove("down")} disabled={isLast} title="Xuống" className="rounded px-1 text-xs hover:bg-white/70 disabled:opacity-30">▼</button>
          <button type="button" onClick={onDuplicate} title="Nhân đôi ngày" className="rounded px-1 text-sm hover:bg-white/70">⧉</button>
          <button type="button" onClick={onDelete} title="Xóa ngày" className="rounded px-1 text-sm hover:bg-white/70" style={{ color: "#8a2323" }}>✕</button>
        </div>
      </div>

      {/* Dải các bữa (khối ngang) */}
      <DndContext
        sensors={mealSensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={(event) => setActiveMeal(String(event.active.id))}
        onDragCancel={() => setActiveMeal(null)}
        onDragEnd={onMealDragEnd}
      >
        <SortableContext items={meals.map((meal) => meal.meal)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-stretch gap-2 overflow-x-auto p-2.5">
            {meals.length === 0 && (
              <span className="self-center text-xs" style={{ color: "#7d8ea3" }}>Ngày trống — thêm bữa, hoặc nhân đôi/nhập từ ngày khác.</span>
            )}
            {meals.map((meal) => <SortableMealCard key={meal.meal} meal={meal} active={expandedMeal === meal.meal} onToggle={() => onToggleMeal(meal.meal)} />)}
            <button
              type="button"
              onClick={onAddMeal}
              className="flex shrink-0 items-center justify-center rounded-lg border border-dashed px-3 text-sm font-semibold"
              style={{ minWidth: 64, borderColor: ACCENT, color: INK, background: "#F4F9FE" }}
              title="Thêm bữa vào ngày này"
            >
              ＋ bữa
            </button>
          </div>
        </SortableContext>
        <DragOverlay>{activeMeal ? <div className="rounded-lg border-2 bg-white px-3 py-2 text-sm font-bold shadow-xl" style={{ borderColor: ACCENT, color: INK }}>{activeMeal}</div> : null}</DragOverlay>
      </DndContext>

      {/* Panel sổ ra cho riêng bữa được chọn */}
      {expandedMeal && meals.some((m) => m.meal === expandedMeal) && (
        <MealPanel
          key={expandedMeal}
          dayId={day.id}
          meal={meals.find((m) => m.meal === expandedMeal)!}
          onRename={(newName) => onRenameMeal(expandedMeal, newName)}
          onDuplicate={() => onDuplicateMeal(expandedMeal)}
          onDelete={() => onDeleteMeal(expandedMeal)}
          onUpdateGrams={onUpdateGrams}
          onDeleteRow={onDeleteRow}
          onAddDish={(name) => onAddDish(expandedMeal, name)}
          onAddFood={(dish, food) => onAddFood(expandedMeal, dish, food)}
          onAddRecipe={(dishName, ingredients) => onAddRecipe(expandedMeal, dishName, ingredients)}
          onDeleteDish={(dish) => onDeleteDish(expandedMeal, dish)}
          onDuplicateDish={(dish) => onDuplicateDish(expandedMeal, dish)}
          selectedDish={selectedDish}
          onSelectDish={onSelectDish}
        />
      )}
    </div>
  );
}

function SortableMealCard({ meal, active, onToggle }: { meal: ReturnType<typeof dayMealsOrdered>[number]; active: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: meal.meal });
  return <div ref={setNodeRef} className="flex flex-1 overflow-hidden rounded-lg border" style={{ minWidth: 190, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1, borderColor: active ? ACCENT : "#D7E6F5", borderWidth: active ? 2 : 1, background: active ? "#E6F1FB" : "#fff" }}>
    <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Kéo để sắp xếp bữa ${meal.meal}`} title="Giữ và kéo để sắp xếp bữa" className="cursor-grab touch-none select-none border-r px-2 text-lg active:cursor-grabbing" style={{ borderColor: "#D7E6F5", color: ACCENT }}>⠿</button>
    <button type="button" onClick={onToggle} className="min-w-0 flex-1 px-2.5 py-2 text-left">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-base font-semibold" style={{ color: INK }}>{meal.meal}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{Math.round(mealNodeKcal(meal))} kcal {active ? "▾" : "▸"}</span>
      </div>
      {/* Món hiện sẵn kèm calo — kiểm soát ăn gì nhanh mà không cần bấm */}
      {meal.dishes.length === 0 ? (
        <div className="mt-1 text-sm" style={{ color: "#7d8ea3" }}>— chưa có món</div>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {meal.dishes.map((dish) => (
            <li key={dish.dish} className="flex items-center justify-between gap-2 text-sm font-medium" style={{ color: "#1f2937" }}>
              <span className="min-w-0 truncate">🍽️ {dish.dish}</span>
              <span className="shrink-0 tabular-nums" style={{ color: "#475569" }}>{Math.round(dish.rows.reduce((s, r) => s + rowKcal(r), 0))}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  </div>;
}

function MealPanel({
  dayId,
  meal,
  onRename,
  onDuplicate,
  onDelete,
  onUpdateGrams,
  onDeleteRow,
  onAddDish,
  onAddFood,
  onAddRecipe,
  onDeleteDish,
  onDuplicateDish,
  selectedDish,
  onSelectDish,
}: {
  dayId: string;
  meal: ReturnType<typeof dayMealsOrdered>[number];
  onRename: (newName: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdateGrams: (uid: string, grams: number) => void;
  onDeleteRow: (uid: string) => void;
  onAddDish: (name: string) => void;
  onAddFood: (dish: string, food: MenuFoodResult) => void;
  onAddRecipe: (dishName: string, ingredients: MenuDishIngredient[]) => void;
  onDeleteDish: (dish: string) => void;
  onDuplicateDish: (dish: string) => void;
  selectedDish: string | null;
  onSelectDish: (dish: string) => void;
}) {
  // Món đang chọn do board quản lý (đồng bộ với ô tìm ở đáy); nếu không khớp bữa này → mặc định món đầu.
  const selected = meal.dishes.find((d) => d.dish === selectedDish) ?? meal.dishes[0] ?? null;
  function addEmptyDishPrompt() {
    const name = window.prompt("Tên món mới", `Món ${meal.dishes.length + 1}`)?.trim();
    if (name) { onAddDish(name); onSelectDish(name); }
  }
  return (
    <div className="menu-drop border-t-2 px-3 py-3" style={{ borderColor: ACCENT, background: "#E6F1FB" }}>
      {/* Đầu bữa */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <EditableText value={meal.meal} onCommit={onRename} className="rounded border bg-white px-2 py-1 text-base font-semibold" style={{ color: INK, borderColor: "#B5D4F4" }} />
        <span className="text-sm" style={{ color: "#5a708c" }}>đang mở bữa này · {Math.round(mealNodeKcal(meal))} kcal</span>
        <div className="ml-auto flex items-center gap-1" style={{ color: ACCENT }}>
          <button type="button" onClick={onDuplicate} title="Nhân đôi bữa" className="rounded px-2 py-1 text-sm font-semibold hover:bg-white">⧉ Nhân đôi</button>
          <button type="button" onClick={onDelete} title="Xóa bữa" className="rounded px-2 py-1 text-sm font-semibold hover:bg-white" style={{ color: "#8a2323" }}>✕ Xóa bữa</button>
        </div>
      </div>

      {/* 2-pane: trái = bữa + các món · phải = chi tiết món + nhập thực phẩm */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* TRÁI */}
        <div className="flex flex-col gap-2 rounded-lg border bg-white p-2.5" style={{ borderColor: "#D7E6F5" }}>
          <div className="text-sm font-semibold" style={{ color: INK }}>Món trong bữa</div>
          {meal.dishes.length === 0 ? (
            <p className="text-sm" style={{ color: "#7d8ea3" }}>Chưa có món — dùng ô tìm ở đáy màn hình (tab <b>Món ăn</b>), hoặc bấm ＋ Món trống.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {meal.dishes.map((dish) => (
                <DishRow key={dish.dish} dayId={dayId} meal={meal.meal} dish={dish} active={selected?.dish === dish.dish} onSelect={() => onSelectDish(dish.dish)} onDelete={() => onDeleteDish(dish.dish)} onDuplicate={() => onDuplicateDish(dish.dish)} />
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: "#EEF3F9" }}>
            <span className="text-sm font-semibold" style={{ color: INK }}>Thêm món</span>
            <button type="button" onClick={addEmptyDishPrompt} className="rounded border px-2 py-1 text-sm font-semibold" style={{ borderColor: ACCENT, color: INK, background: "#E6F1FB" }}>＋ Món trống</button>
            <span className="text-xs" style={{ color: "#7d8ea3" }}>hoặc tìm ở ô đáy màn hình →</span>
          </div>
        </div>

        {/* PHẢI — tự nhảy sang chi tiết + nhập thực phẩm (remount theo món để có hoạt ảnh) */}
        <div className="rounded-lg border-2 bg-white p-2.5" style={{ borderColor: ACCENT }}>
          {!selected ? (
            <p className="text-sm" style={{ color: "#7d8ea3" }}>Chọn một món bên trái để xem/sửa thành phần (thêm thực phẩm ở ô đáy màn hình).</p>
          ) : (
            <DishEditor key={selected.dish} dish={selected} onUpdateGrams={onUpdateGrams} onDeleteRow={onDeleteRow} onAddFood={onAddFood} />
          )}
        </div>
      </div>
    </div>
  );
}

// Món ở cột trái: tay nắm kéo (sang ngày khác) + bấm để chọn xem chi tiết bên phải.
function DishRow({ dayId, meal, dish, active, onSelect, onDelete, onDuplicate }: {
  dayId: string;
  meal: string;
  dish: ReturnType<typeof dayMealsOrdered>[number]["dishes"][number];
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: `dish::${dayId}::${meal}::${dish.dish}` });
  const dKcal = Math.round(dish.rows.reduce((s, r) => s + rowKcal(r), 0));
  return (
    <div ref={setNodeRef} className="flex items-center gap-1 rounded-lg border transition-colors" style={{ borderColor: active ? ACCENT : "#E1E9F5", borderWidth: active ? 2 : 1, background: active ? "#E6F1FB" : "#fff", opacity: isDragging ? 0.4 : 1 }}>
      <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Kéo món ${dish.dish} sang ngày khác`} title="Giữ và kéo món sang ngày khác" className="cursor-grab touch-none select-none px-1.5 py-2 text-lg active:cursor-grabbing" style={{ color: ACCENT }}>⠿</button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 text-left">
        <span className="min-w-0 truncate text-sm font-semibold" style={{ color: INK }}>🍽️ {dish.dish}</span>
        <span className="shrink-0 text-xs" style={{ color: active ? ACCENT : "#7d8ea3" }}>{dish.rows.length} TP · {dKcal} kcal {active ? "▸" : ""}</span>
      </button>
      <button type="button" onClick={onDuplicate} title="Nhân đôi món" className="shrink-0 rounded px-1.5 py-2 text-sm hover:bg-white" style={{ color: ACCENT }}>⧉</button>
      <button type="button" onClick={onDelete} title="Xóa món" className="shrink-0 rounded px-1.5 py-2 text-sm hover:bg-white" style={{ color: "#8a2323" }}>✕</button>
    </div>
  );
}

// Cột phải: chi tiết món — bảng thực phẩm + ô tìm thực phẩm (ghim đáy).
function DishEditor({ dish, onUpdateGrams, onDeleteRow, onAddFood }: {
  dish: ReturnType<typeof dayMealsOrdered>[number]["dishes"][number];
  onUpdateGrams: (uid: string, grams: number) => void;
  onDeleteRow: (uid: string) => void;
  onAddFood: (dish: string, food: MenuFoodResult) => void;
}) {
  return (
    <div className="menu-day-enter flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold" style={{ color: INK }}>🍽️ {dish.dish}</span>
        <span className="text-xs" style={{ color: "#7d8ea3" }}>{dish.rows.length} thực phẩm · {Math.round(dish.rows.reduce((s, r) => s + rowKcal(r), 0))} kcal</span>
      </div>
      {dish.rows.length === 0 ? (
        <p className="text-sm" style={{ color: "#7d8ea3" }}>Món trống — dùng ô tìm ở đáy màn hình (tab <b>Thực phẩm</b>) để thêm.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "#7d8ea3" }}>
              <th className="py-0.5 text-left font-medium">Thực phẩm</th>
              <th className="py-0.5 text-right font-medium">Sống sạch (g)</th>
              <th className="py-0.5 text-right font-medium">kcal</th>
              <th className="py-0.5" />
            </tr>
          </thead>
          <tbody>
            {dish.rows.map((row) => (
              <tr key={row.uid} className="border-t" style={{ borderColor: "#EEF3F9" }}>
                <td className="py-1 pr-2">{row.foodName || "(chưa đặt tên)"}</td>
                <td className="py-1 text-right"><GramInput value={row.inputGrams} onCommit={(g) => onUpdateGrams(row.uid, g)} /></td>
                <td className="py-1 text-right tabular-nums" style={{ color: "#5a708c" }}>{Math.round(rowKcal(row))}</td>
                <td className="py-1 pl-1 text-right"><button type="button" onClick={() => onDeleteRow(row.uid)} title="Xóa" className="rounded px-1 text-xs" style={{ color: "#8a2323" }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Ô nhập gram: cập nhật khi rời ô hoặc Enter (không ghi state mỗi phím để tránh giật).
function GramInput({ value, onCommit }: { value: number; onCommit: (grams: number) => void }) {
  const [text, setText] = useState(String(value));
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setText(String(value)), [value]);
  function commit() {
    const n = Number(text);
    if (Number.isFinite(n) && n >= 0 && n !== value) onCommit(n);
    else setText(String(value));
  }
  return (
    <input
      type="number"
      min={0}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-16 rounded border px-1.5 py-0.5 text-right tabular-nums"
      style={{ borderColor: "#cdd9e6" }}
    />
  );
}

// Nhãn chỉnh sửa tại chỗ (tên ngày / tên bữa).
function EditableText({
  value,
  onCommit,
  className,
  style,
}: {
  value: string;
  onCommit: (next: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setText(value), [value]);
  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text.trim() && text !== value) onCommit(text.trim());
        else setText(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") ref.current?.blur();
        if (e.key === "Escape") {
          setText(value);
          ref.current?.blur();
        }
      }}
      className={className}
      style={style}
    />
  );
}
