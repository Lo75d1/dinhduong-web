"use client";
import { useEffect, useState } from "react";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";
import type { NutritionFood } from "@/lib/nutrition-chat/contracts";
import { foodDisplayName } from "@/lib/menu-library/presentation";
import styles from "./clinical.module.css";

type Dish = MenuLibraryDraft["days"][number]["meals"][number]["groupPortions"][number]["dishes"][number];
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
  return <details className={styles.picker}><summary>+ Thêm thực phẩm</summary>
    <div className={styles.pickerSearch}><input aria-label="Tên thực phẩm cần thêm" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} maxLength={120} className={styles.control} placeholder="Tìm thực phẩm trong kho…" /><button type="button" disabled={busy || !query.trim()} className={styles.secondary} onClick={() => void search()}>Tìm</button></div>
    {message && <p role="status">{message}</p>}
    <ul>{items.map(food => <li key={food.id}><button type="button" onClick={() => { add(food); setItems([]); setQuery(""); }}>{foodDisplayName(food.name)}<small>{food.source.label} · {food.unit} · {food.name}</small></button>{food.nutrientBasis?.status === "unverified" && <p className={styles.dataNotice}>Chưa xác minh cơ sở dinh dưỡng; chưa dùng để duyệt.</p>}</li>)}</ul>
  </details>;
}

export default function TemplateEditor({ content, csrf, foods, onSaved, onCancel, onDirty, onDraftChange, dayId, groupId, mealId }: {
  content: MenuLibraryDraft; csrf: string; foods: { id: string; name: string; unit: string }[];
  onSaved: () => void; onCancel: () => void; onDirty: (dirty: boolean) => void;
  onDraftChange?: (draft: MenuLibraryDraft) => void; dayId?: string; groupId?: string; mealId?: string;
}) {
  const [draft, setDraft] = useState(() => structuredClone(content)), [knownFoods, setKnownFoods] = useState(foods);
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => { onDraftChange?.(draft); }, [draft, onDraftChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(update: (value: MenuLibraryDraft) => void) { setDraft(previous => { const next = structuredClone(previous); update(next); return next; }); setDirty(true); setError(""); }
  function changeDish(di: number, mi: number, pi: number, si: number, update: (dish: Dish) => void) {
    change(value => { const dish = value.days[di].meals[mi].groupPortions[pi].dishes[si]; update(dish); dish.sourceKind = "manual"; dish.recipeId = null; });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(content.id)}`, {
        method: "PUT", headers: { "Content-Type": "application/json", "x-menu-library-csrf": csrf },
        body: JSON.stringify({ content: { ...draft, version: content.version + 1, status: "draft" }, expectedRevision: content.version, requestKey: `manual-${content.id}-${content.version + 1}`, reason: reason.trim() || "Admin điều chỉnh món và định lượng trên website." }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Chưa lưu được mẫu.");
      setDirty(false); onDirty(false); onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa lưu được mẫu."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className={styles.editor}>
    <div className={styles.editorIntro}><h3>Cân chỉnh khẩu phần</h3><p>Sửa lượng để cập nhật kcal và P–L–G ở trên.</p></div>
    <fieldset disabled={busy}>
      <details className={styles.editorSettings}><summary>Thông tin mẫu & mục tiêu năng lượng</summary>
        <label>Tên thực đơn<input required maxLength={200} className={styles.control} value={draft.title} onChange={event => change(value => { value.title = event.target.value; })} /></label>
        {draft.groups.map((group, index) => <label key={group.id}>Mục tiêu thiết kế · {group.label.split(";")[0]} (kcal/ngày)<input type="number" min="1" max="20000" step="any" className={styles.control} value={group.designEnergyKcal ?? ""} placeholder="Chưa xác định" onChange={event => { const target = event.target.value === "" ? null : event.target.valueAsNumber; change(value => { value.groups[index].designEnergyKcal = target; }); }} /></label>)}
      </details>
      {draft.days.map((day, di) => !dayId || day.id === dayId ? <div key={day.id}>{draft.days.length > 1 && <h3>Ngày {day.dayIndex}</h3>}{day.meals.map((meal, mi) => !mealId || meal.id === mealId ? <section key={meal.id} className={styles.editMeal}><h4>{meal.label}</h4>{meal.groupPortions.map((portion, pi) => !groupId || portion.groupId === groupId ? <div key={portion.groupId}>{!groupId && draft.groups.length > 1 && <p>{draft.groups.find(group => group.id === portion.groupId)?.label}</p>}{portion.dishes.map((dish, si) => <section key={dish.id} className={styles.editDish}>
        <div className={styles.dishEditHeader}><label><span className="sr-only">Tên món</span><input required maxLength={200} value={dish.label} className={styles.control} onChange={event => changeDish(di, mi, pi, si, item => { item.label = event.target.value; })} /></label><button type="button" className={styles.remove} aria-label={`Xóa món ${dish.label}`} onClick={() => change(value => { value.days[di].meals[mi].groupPortions[pi].dishes.splice(si, 1); })}>Bỏ món</button></div>
        {dish.ingredients.map((ingredient, ii) => {
          const name = knownFoods.find(food => food.id === ingredient.foodId)?.name;
          const inputId = `${day.id}-${meal.id}-${portion.groupId}-${dish.id}-${ii}`;
          return <div key={`${ingredient.foodId}-${ii}`} className={styles.editIngredient}><label htmlFor={inputId} title={name}>{foodDisplayName(name ?? "Chưa đọc được tên thực phẩm")}</label><input id={inputId} required type="number" min="0" max="100000" step="any" value={Number.isFinite(ingredient.quantityPerPortion) ? ingredient.quantityPerPortion : ""} className={styles.control} onChange={event => { const quantity = event.target.valueAsNumber; changeDish(di, mi, pi, si, item => { item.ingredients[ii].quantityPerPortion = quantity; }); }} /><span>{ingredient.unit}</span><button type="button" aria-label={`Xóa ${name ?? "thực phẩm"} khỏi ${dish.label}`} className={styles.remove} onClick={() => changeDish(di, mi, pi, si, item => { item.ingredients.splice(ii, 1); })}>×</button></div>;
        })}
        <IngredientPicker add={food => { setKnownFoods(previous => [...previous.filter(item => item.id !== food.id), food]); changeDish(di, mi, pi, si, item => { item.ingredients.push({ foodId: food.id, quantityPerPortion: 0, unit: food.unit, basis: "edible_raw", edibleFraction: null, cookingYield: null }); }); }} />
      </section>)}<button type="button" className={styles.textButton} onClick={() => change(value => { value.days[di].meals[mi].groupPortions[pi].dishes.push({ id: `manual-${crypto.randomUUID()}`, label: "Món mới", sourceKind: "manual", recipeId: null, ingredients: [] }); })}>+ Thêm món ăn</button></div> : null)}</section> : null)}</div> : null)}
      {error && <p role="alert" className={styles.calculationError}>{error} Nội dung đang sửa vẫn được giữ trên màn hình.</p>}
      <div className={styles.saveBar}><label><span className="sr-only">Ghi chú điều chỉnh</span><input maxLength={500} placeholder="Ghi chú điều chỉnh (nếu cần)" value={reason} onChange={event => setReason(event.target.value)} className={styles.control} /></label><button disabled={!dirty} className={styles.action}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button><button type="button" className={styles.secondary} onClick={() => { if (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?")) onCancel(); }}>Hủy</button><span>Lưu xong cần duyệt lại.</span></div>
    </fieldset>
  </form>;
}
