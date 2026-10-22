"use client";
import { useEffect, useState } from "react";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";
import type { NutritionFood } from "@/lib/nutrition-chat/contracts";

type Dish = MenuLibraryDraft["days"][number]["meals"][number]["groupPortions"][number]["dishes"][number];
const control = "min-h-11 rounded-md border border-[var(--control-line)] bg-white px-3 py-2";
const button = `${control} font-semibold disabled:opacity-50`;

function IngredientPicker({ add }: { add: (food: NutritionFood) => void }) {
  const [query, setQuery] = useState(""), [items, setItems] = useState<NutritionFood[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true); setMessage(""); setItems([]);
    try {
      const response = await fetch(`/api/admin/menu-library/foods?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Chưa tra được thực phẩm.");
      setItems(result.items); if (!result.items.length) setMessage("Chưa có thực phẩm phù hợp.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa tra được thực phẩm."); }
    finally { setBusy(false); }
  }
  return <details className="mt-2 rounded border border-[var(--line)] p-2"><summary className="cursor-pointer font-semibold">Thêm nguyên liệu từ kho</summary>
    <div className="mt-2 flex gap-2"><input aria-label="Tên nguyên liệu cần thêm" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} maxLength={120} className={`${control} min-w-0 flex-1`} placeholder="Tên thực phẩm…" /><button type="button" disabled={busy || !query.trim()} className={button} onClick={() => void search()}>Tra</button></div>
    {message && <p role="status">{message}</p>}
    <ul className="max-h-64 overflow-y-auto">{items.map(food => <li key={food.id} className="border-b border-[var(--line)] py-2"><button type="button" className="w-full text-left underline" onClick={() => { add(food); setItems([]); setQuery(""); }}>{food.name} · {food.source.label} · {food.unit}{food.foodType ? ` · ${food.foodType}` : ""}</button>{food.nutrientBasis?.status === "unverified" && <p className="text-sm text-amber-800">Cơ sở dinh dưỡng chưa xác minh; chưa thể duyệt khi có lượng khác 0.</p>}</li>)}</ul>
  </details>;
}

export default function TemplateEditor({ content, csrf, foods, onSaved, onCancel, onDirty }: {
  content: MenuLibraryDraft; csrf: string; foods: { id: string; name: string; unit: string }[];
  onSaved: () => void; onCancel: () => void; onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(content)), [knownFoods, setKnownFoods] = useState(foods);
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(update: (value: MenuLibraryDraft) => void) { setDraft(previous => { const next = structuredClone(previous); update(next); return next; }); setDirty(true); setError(""); }
  function changeDish(dayIndex: number, mealIndex: number, groupIndex: number, dishIndex: number, update: (dish: Dish) => void) {
    change(value => { const dish = value.days[dayIndex].meals[mealIndex].groupPortions[groupIndex].dishes[dishIndex]; update(dish); dish.sourceKind = "manual"; dish.recipeId = null; });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(content.id)}`, {
        method: "PUT", headers: { "Content-Type": "application/json", "x-menu-library-csrf": csrf },
        body: JSON.stringify({ content: { ...draft, version: content.version + 1, status: "draft" }, expectedRevision: content.version, requestKey: `manual-${content.id}-${content.version + 1}`, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Chưa lưu được mẫu.");
      setDirty(false); onDirty(false); onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa lưu được mẫu."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-4 rounded-lg border border-[var(--line)] bg-white p-3 sm:p-4">
    <h2 className="text-xl font-semibold">Chỉnh sửa mẫu · từ v{content.version}</h2>
    <p className="text-sm">Định lượng cho một suất, theo trạng thái nguồn. Gạo ghi lượng gạo khô. Lưu tạo phiên bản mới và cần phân tích, duyệt lại. Món sửa tay được ghi là tự biên soạn.</p>
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <label className="block font-semibold">Tên mẫu<input required maxLength={200} className={`${control} block w-full font-normal`} value={draft.title} onChange={event => change(value => { value.title = event.target.value; })} /></label>
      {draft.groups.map((group, index) => <label key={group.id} className="block">Mục tiêu thiết kế kcal/ngày · {group.label}<input type="number" min="1" max="20000" step="any" className={`${control} ml-2 w-32`} value={group.designEnergyKcal ?? ""} onChange={event => { const target = event.target.value === "" ? null : event.target.valueAsNumber; change(value => { value.groups[index].designEnergyKcal = target; }); }} /><span className="mt-1 block text-sm text-neutral-600">Để trống nếu chưa xác định; không tự suy từ tên mẫu hay coi là nhu cầu của người bệnh.</span></label>)}
      {draft.days.map((day, di) => <section key={day.id} className="space-y-3"><h3 className="text-lg font-semibold">Ngày {day.dayIndex}</h3>{day.meals.map((meal, mi) => <section key={meal.id} className="rounded-md border border-[var(--line)] p-3"><h4 className="font-semibold">{meal.label}</h4>{meal.groupPortions.map((portion, pi) => <div key={portion.groupId} className="mt-2 space-y-3"><p className="text-sm">{draft.groups.find(group => group.id === portion.groupId)?.label} · lượng / suất</p>{portion.dishes.map((dish, si) => <div key={dish.id} className="rounded border border-[var(--line)] bg-[#fafafa] p-2">
        <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Tên món</span><input required maxLength={200} value={dish.label} className={`${control} w-full font-semibold`} onChange={event => changeDish(di, mi, pi, si, item => { item.label = event.target.value; })} /></label><button type="button" className={button} aria-label={`Xóa món ${dish.label}`} onClick={() => change(value => { value.days[di].meals[mi].groupPortions[pi].dishes.splice(si, 1); })}>Xóa món</button></div>
        {dish.ingredients.map((ingredient, ii) => <div key={`${ingredient.foodId}-${ii}`} className="mt-2 grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2"><label htmlFor={`${day.id}-${meal.id}-${portion.groupId}-${dish.id}-${ii}`} className="min-w-0 break-words text-sm">{knownFoods.find(food => food.id === ingredient.foodId)?.name ?? ingredient.foodId}<span className="block text-neutral-600">{ingredient.unit}/suất</span></label><input id={`${day.id}-${meal.id}-${portion.groupId}-${dish.id}-${ii}`} required type="number" min="0" max="100000" step="any" value={Number.isFinite(ingredient.quantityPerPortion) ? ingredient.quantityPerPortion : ""} className={`${control} w-full text-right`} onChange={event => { const quantity = event.target.valueAsNumber; changeDish(di, mi, pi, si, item => { item.ingredients[ii].quantityPerPortion = quantity; }); }} /><button type="button" aria-label={`Xóa ${knownFoods.find(food => food.id === ingredient.foodId)?.name ?? ingredient.foodId} khỏi ${dish.label}`} className={`${button} px-2`} onClick={() => changeDish(di, mi, pi, si, item => { item.ingredients.splice(ii, 1); })}>×</button></div>)}
        <IngredientPicker add={food => { setKnownFoods(previous => [...previous.filter(item => item.id !== food.id), food]); changeDish(di, mi, pi, si, item => { item.ingredients.push({ foodId: food.id, quantityPerPortion: 0, unit: food.unit, basis: "edible_raw", edibleFraction: null, cookingYield: null }); }); }} />
      </div>)}<button type="button" className={button} onClick={() => change(value => { value.days[di].meals[mi].groupPortions[pi].dishes.push({ id: `manual-${crypto.randomUUID()}`, label: "Món mới", sourceKind: "manual", recipeId: null, ingredients: [] }); })}>+ Thêm món</button></div>)}</section>)}</section>)}
      <label className="block font-semibold">Lý do chỉnh sửa<input required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className={`${control} mt-1 block w-full font-normal`} /></label>
      {error && <p role="alert" className="text-red-800">{error} Nội dung đang sửa vẫn được giữ trên màn hình.</p>}
      <div className="flex flex-wrap gap-2"><button disabled={!dirty || !reason.trim()} className={`${button} bg-[var(--ink)] text-white`}>{busy ? "Đang lưu…" : "Lưu phiên bản mới"}</button><button type="button" className={button} onClick={() => { if (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?")) onCancel(); }}>Hủy chỉnh sửa</button></div>
    </fieldset>
  </form>;
}
