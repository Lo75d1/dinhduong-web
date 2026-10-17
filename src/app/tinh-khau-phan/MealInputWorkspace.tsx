"use client";

import { useState, type ReactNode, type RefObject } from "react";

export type InputMeal = { meal: string; kcal: string; dishes: { dish: string; kcal: string }[] };
type Selection = { meal: string; dish: string };

export function EditableTitle({ value, onCommit, className, placeholder, disabled }: { value: string; onCommit: (value: string) => void; className?: string; placeholder?: string; disabled?: boolean }) {
  const [text, setText] = useState(value);
  return <input aria-label={placeholder} disabled={disabled} value={text} placeholder={placeholder} onChange={event => setText(event.target.value)} onBlur={() => { if (text.trim()) onCommit(text.trim()); else setText(value); }} className={className} />;
}

/** The calculator's shared compact meal tree and mobile tree/detail navigation. */
export default function MealInputWorkspace({ meals, selection, disabled, initialPane = "tree", onSelect, onRenameMeal, onMoveMeal, onAddDish, onDeleteMeal, onAddMeal, mealExtra, mealActions, listRef, children }: {
  meals: InputMeal[]; selection?: Selection; disabled?: boolean; initialPane?: "tree" | "detail";
  onSelect: (selection: Selection) => void; onRenameMeal: (meal: string, name: string) => void;
  onMoveMeal: (meal: string, direction: "up" | "down") => void; onAddDish: (meal: string) => void; onDeleteMeal: (meal: string) => void;
  onAddMeal: () => void; mealExtra?: (meal: string) => ReactNode; mealActions?: (meal: string) => ReactNode; listRef?: RefObject<HTMLDivElement | null>; children: ReactNode;
}) {
  const [pane, setPane] = useState(initialPane);
  return <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-3" data-calculator-meal-workspace>
    <div className={`flex-col gap-2 ${pane === "detail" ? "hidden" : "flex"} lg:flex lg:min-h-0 lg:overflow-y-auto lg:pr-1`}>
      <div ref={listRef} className="scroll-mt-6 outline-none" tabIndex={-1}>
        {!meals.length ? <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">Chưa có bữa ăn nào. Bấm “+ Thêm bữa ăn” để bắt đầu.</div> : <div className="flex flex-col gap-2">{meals.map((meal, index) => <div key={meal.meal} className={`overflow-hidden rounded-lg border ${meal.meal === selection?.meal ? "border-[#123c36]" : "border-neutral-300"}`}>
          <div className="flex items-center gap-0.5 bg-[#eef4f1] px-1.5 py-1 text-[#0c5f4d]">
            <span className="shrink-0 text-[15px]" aria-hidden="true">🍱</span><EditableTitle key={meal.meal} value={meal.meal} disabled={disabled} onCommit={name => onRenameMeal(meal.meal, name)} placeholder="Tên bữa ăn" className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-semibold text-[#0c5f4d] focus:bg-white focus:outline-none" />
            <span className="shrink-0 rounded bg-[#123c36] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white" title="Tổng năng lượng của bữa">{meal.kcal}</span>
            <button type="button" disabled={disabled || index === 0} onClick={() => onMoveMeal(meal.meal, "up")} title="Chuyển bữa lên" className="shrink-0 rounded px-1 text-xs hover:bg-white/70 disabled:opacity-30">▲</button>
            <button type="button" disabled={disabled || index === meals.length - 1} onClick={() => onMoveMeal(meal.meal, "down")} title="Chuyển bữa xuống" className="shrink-0 rounded px-1 text-xs hover:bg-white/70 disabled:opacity-30">▼</button>
            <button type="button" disabled={disabled} onClick={() => onAddDish(meal.meal)} title="Thêm món" className="shrink-0 rounded px-1 text-sm font-bold hover:bg-white/70">＋</button>
            {mealActions?.(meal.meal)}<button type="button" disabled={disabled} onClick={() => onDeleteMeal(meal.meal)} title="Xóa bữa" className="shrink-0 rounded px-1 text-sm text-[#8a2323] hover:bg-white/70">✕</button>
          </div>
          {!meal.dishes.length ? <p className="bg-white px-2 py-1.5 pl-8 text-xs text-neutral-500">Chưa có món — bấm ＋ hoặc dùng thanh dưới.</p> : <div className="bg-white">{meal.dishes.map(dish => <button key={dish.dish} type="button" disabled={disabled} onClick={() => { onSelect({ meal: meal.meal, dish: dish.dish }); setPane("detail"); }} aria-pressed={selection?.meal === meal.meal && selection.dish === dish.dish} className={`flex w-full items-center gap-1.5 border-t border-neutral-200 px-2 py-1.5 pl-8 text-left text-sm ${selection?.meal === meal.meal && selection.dish === dish.dish ? "bg-[#dceee1] font-semibold text-[#123c36] ring-1 ring-inset ring-[#123c36]/30" : "text-neutral-800 hover:bg-neutral-50"}`}><span className="shrink-0 text-[14px]" aria-hidden="true">🍽️</span><span className="min-w-0 flex-1 truncate">{dish.dish}</span><span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-900">{dish.kcal}</span></button>)}</div>}
          {mealExtra?.(meal.meal)}
        </div>)}</div>}
        <button type="button" disabled={disabled} onClick={() => { onAddMeal(); setPane("tree"); }} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-emerald-600 bg-emerald-50/70 px-3 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60">＋ Thêm bữa ăn mới</button>
      </div>
    </div>
    <div className={`min-w-0 ${pane === "tree" ? "hidden" : "block"} lg:block lg:min-h-0 lg:overflow-y-auto`}>
      <button type="button" onClick={() => setPane("tree")} className="mb-3 inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-[#123c36] lg:hidden">‹ Danh sách bữa / món</button>
      {children}
    </div>
  </div>;
}

export function DishInputFrame({ name, onRename, onDelete, onDuplicate, disabled, leading, quantity, children }: { name: string; onRename: (name: string) => void; onDelete: () => void; onDuplicate: () => void; disabled?: boolean; leading?: ReactNode; quantity?: ReactNode; children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-[#7f948d] bg-white shadow-sm" data-calculator-dish-panel aria-label="Thành phần món ăn">
    <div className="flex items-center gap-1.5 border-l-4 border-[#52786d] bg-[#dceee1] px-2 py-1.5">
      {leading}<span className="shrink-0 text-base" aria-hidden="true">🍽️</span><EditableTitle key={name} value={name} onCommit={onRename} disabled={disabled} placeholder="Tên món" className="min-w-0 flex-1 rounded border border-[#8ba39b] bg-white px-2 py-0.5 text-sm font-semibold text-neutral-950 placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#123c36]" />{quantity}
      <button type="button" disabled={disabled} onClick={onDuplicate} className="shrink-0 rounded px-2 py-1 text-sm text-[#0c5f4d] hover:bg-white/70" title="Nhân đôi món">⧉</button><button type="button" disabled={disabled} onClick={onDelete} className="shrink-0 rounded px-2 py-1 text-sm text-[#6d1f1f] hover:bg-[#fff0f0]" title="Xóa món">✕</button>
    </div>{children}
  </div>;
}
