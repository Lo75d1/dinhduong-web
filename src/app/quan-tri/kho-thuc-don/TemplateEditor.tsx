"use client";
import { useEffect, useState } from "react";
import { COOKING_METHOD_OPTIONS, TEXTURE_OPTIONS, LIFE_STAGE_OPTIONS, type MenuLibraryDraft } from "@/lib/menu-library/contracts";
import type { NutritionFood } from "@/lib/nutrition-chat/contracts";
import { foodDisplayName } from "@/lib/menu-library/presentation";
import { hasReferenceProfileInputs, librarySection, tidyInstructions } from "@/lib/menu-library/content-policy";
import { changedFractionalQuantity } from "@/lib/menu-library/production";
import styles from "./clinical.module.css";

function Lines({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <label>{label}<textarea rows={3} maxLength={20000} className={styles.control} value={value.join("\n")} onChange={event => onChange(event.target.value.split(/\r?\n/))} /><small>Mỗi dòng một ý / bước. Tối đa 20 dòng, 1.000 ký tự mỗi dòng.</small></label>;
}
type ReferenceProfile = NonNullable<MenuLibraryDraft["groups"][number]["recommendationProfile"]>;
const EMPTY_REFERENCE_PROFILE = { age: "", ageUnit: "", gender: "", height: "", weight: "", activityLevel: "", physiology: "", pregnancyWeek: "", prePregnancyWeight: "", pregnancyNote: "" } as unknown as ReferenceProfile;
function ReferenceProfileFields({ profile, onChange }: { profile?: ReferenceProfile | null; onChange: (profile: ReferenceProfile | null) => void }) {
  function set(key: keyof ReferenceProfile, value: string) { onChange({ ...EMPTY_REFERENCE_PROFILE, ...profile, [key]: value }); }
  return <details className={styles.editorSettings}><summary>Hồ sơ đối chiếu khuyến nghị sẵn có</summary><p>Áp dụng cho nhóm của mẫu, không nhập tên hoặc mã người bệnh. Tuổi, giới, vận động và sinh lý dùng khớp bảng KhuyenNghi. Cân nặng / chiều cao được giữ khi đã có.</p>
    <div className={styles.ageRange}>
      <label>Tuổi đối chiếu<input className={styles.control} type="number" min="0" max="1800" step="any" value={profile?.age ?? ""} onChange={event => set("age", event.target.value)} /></label>
      <label>Đơn vị tuổi<select className={styles.control} value={profile?.ageUnit ?? ""} onChange={event => set("ageUnit", event.target.value)}><option value="">Chọn</option><option value="tuoi">Năm</option><option value="thang">Tháng</option></select></label>
      <label>Giới tính đối chiếu<select className={styles.control} value={profile?.gender ?? ""} onChange={event => set("gender", event.target.value)}><option value="">Chọn</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></label>
      <label>Cân nặng (kg)<input className={styles.control} type="number" min="0" max="600" step="any" value={profile?.weight ?? ""} onChange={event => set("weight", event.target.value)} /></label>
      <label>Chiều cao (cm)<input className={styles.control} type="number" min="0" max="300" step="any" value={profile?.height ?? ""} onChange={event => set("height", event.target.value)} /></label>
      <label>Mức vận động<select className={styles.control} value={profile?.activityLevel ?? ""} onChange={event => set("activityLevel", event.target.value)}><option value="">Chọn</option><option value="sedentary">Tĩnh tại</option><option value="light">Nhẹ</option><option value="moderate">Trung bình</option><option value="heavy">Nặng</option><option value="very_heavy">Rất nặng</option></select></label>
      <label>Tình trạng sinh lý<select className={styles.control} value={profile?.physiology ?? ""} onChange={event => set("physiology", event.target.value)}><option value="">Chọn</option><option value="normal">Thông thường</option><option value="pregnant_1">Thai kỳ 3 tháng đầu</option><option value="pregnant_2">Thai kỳ 3 tháng giữa</option><option value="pregnant_3">Thai kỳ 3 tháng cuối</option><option value="lactating_1">Cho con bú 6 tháng đầu</option><option value="lactating_2">Cho con bú 6 tháng sau</option></select></label>
    </div><button className={styles.secondary} type="button" onClick={() => onChange(null)}>Bỏ hồ sơ đối chiếu</button>
  </details>;
}
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
  useEffect(() => { onDraftChange?.(tidyInstructions(draft)); }, [draft, onDraftChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(update: (value: MenuLibraryDraft) => void) { setDraft(previous => { const next = structuredClone(previous); update(next); next.schemaVersion = "1.2.0"; return next; }); setDirty(true); setError(""); }
  function changeDish(di: number, mi: number, pi: number, si: number, update: (dish: Dish) => void) {
    change(value => { const dish = value.days[di].meals[mi].groupPortions[pi].dishes[si]; update(dish); dish.sourceKind = "manual"; dish.recipeId = null; });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.groups.some(group => !hasReferenceProfileInputs(group.recommendationProfile))) { setError("Chọn đủ tuổi, đơn vị tuổi, giới, vận động và tình trạng sinh lý cho hồ sơ đối chiếu; hoặc bỏ hồ sơ khi chưa có dữ kiện."); return; }
    if (changedFractionalQuantity(content, draft)) { setError("Lượng mới dùng bước 1 g/ml. Cân chỉnh cả công thức; không tự nâng từng lượng gia vị lẻ lên 1 g."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/menu-library/templates/${encodeURIComponent(content.id)}`, {
        method: "PUT", headers: { "Content-Type": "application/json", "x-menu-library-csrf": csrf },
        body: JSON.stringify({ content: { ...tidyInstructions(draft), version: content.version + 1, status: "draft" }, expectedRevision: content.version, requestKey: `manual-${content.id}-${content.version + 1}`, reason: reason.trim() || "Admin điều chỉnh món và định lượng trên website." }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Chưa lưu được mẫu.");
      setDirty(false); onDirty(false); onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa lưu được mẫu."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className={styles.editor}>
    <div className={styles.editorIntro}><h3>Cân chỉnh khẩu phần</h3><p>Lượng mới dùng bước 1 g/ml. Lượng lẻ của bản cũ được giữ nguyên để cân chỉnh, không làm tròn âm thầm.</p></div>
    <fieldset disabled={busy}>
      <details className={styles.editorSettings}><summary>Thông tin mẫu & mục tiêu năng lượng</summary>
        <label>Tên thực đơn<input required maxLength={200} className={styles.control} value={draft.title} onChange={event => change(value => { value.title = event.target.value; })} /></label>
        {draft.groups.map((group, index) => <label key={group.id}>Mục tiêu thiết kế · {group.label.split(";")[0]} (kcal/ngày)<input type="number" min="1" max="20000" step="any" className={styles.control} value={group.designEnergyKcal ?? ""} placeholder="Chưa xác định" onChange={event => { const target = event.target.value === "" ? null : event.target.valueAsNumber; change(value => { value.groups[index].designEnergyKcal = target; }); }} /></label>)}
      </details>
      <section className={styles.instructions} aria-label="Phân loại và hướng dẫn sử dụng">
        <h3>Phân loại & hướng dẫn</h3>
        {draft.direction === "individual" ? <label>Kho<select className={styles.control} value={librarySection(draft)} onChange={event => change(value => { value.librarySection = event.target.value as "individual" | "hospital"; value.hospitalUse = event.target.value === "hospital" ? "patient_guidance" : null; })}><option value="individual">Cá thể</option><option value="hospital">Bệnh viện · Khuyến nghị cho người bệnh</option></select></label> : <p>{librarySection(draft) === "hospital" ? "Bệnh viện · Bếp bệnh viện" : "Tập thể"} · {draft.unit?.label}</p>}
        <label>Tình trạng sử dụng<select className={styles.control} value={draft.availability?.state ?? "active"} onChange={event => change(value => { value.availability = { state: event.target.value as "active" | "archived", reason: value.availability?.reason ?? null }; })}><option value="active">Đang dùng</option><option value="archived">Ngừng dùng</option></select></label>
        {draft.availability?.state === "archived" && <label>Lý do ngừng dùng<input required maxLength={1000} className={styles.control} value={draft.availability.reason ?? ""} onChange={event => change(value => { value.availability!.reason = event.target.value || null; })} /><small>Ẩn khỏi danh mục đang dùng; giữ nguyên nội dung và lịch sử. Có thể mở lại.</small></label>}
        {draft.groups.map((group, gi) => !groupId || group.id === groupId ? <section key={group.id}>
          <h4>{group.label}</h4>
          <label>Phân loại người ăn<select className={styles.control} value={group.lifeStage ?? ""} onChange={event => change(value => { value.groups[gi].lifeStage = event.target.value as typeof group.lifeStage || null; })}><option value="">Chưa phân loại</option>{LIFE_STAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          {group.lifeStage === "complementary_feeding" && <div className={styles.ageRange}>{(["min", "max"] as const).map(key => <label key={key}>{key === "min" ? "Từ tháng tuổi" : "Đến tháng tuổi"}<input className={styles.control} type="number" min="0" max="216" step="1" value={group.ageMonths?.[key] ?? ""} onChange={event => { const age = event.target.valueAsNumber; change(value => { value.groups[gi].ageMonths = Number.isFinite(age) ? { ...(value.groups[gi].ageMonths ?? { min: age, max: age }), [key]: age } : null; }); }} /></label>)}</div>}
          <ReferenceProfileFields profile={group.recommendationProfile} onChange={profile => change(value => { value.groups[gi].recommendationProfile = profile; })} />
          <Lines label="Lưu ý cho người ăn / người chăm sóc" value={group.guidance?.notes ?? []} onChange={notes => change(value => { value.groups[gi].guidance = { recommendations: [], ...value.groups[gi].guidance, notes }; })} />
          <Lines label="Khuyến nghị sử dụng thực đơn" value={group.guidance?.recommendations ?? []} onChange={recommendations => change(value => { value.groups[gi].guidance = { notes: [], ...value.groups[gi].guidance, recommendations }; })} />
        </section> : null)}
        <p className={styles.scopeNote}>Cần đủ cách chế biến, kết cấu, lưu ý và khuyến nghị trước khi duyệt. Nhãn kết cấu không xác nhận tiêu chuẩn nuốt hay dùng qua sonde.</p>
      </section>
      {draft.days.map((day, di) => !dayId || day.id === dayId ? <div key={day.id}>{draft.days.length > 1 && <h3>Ngày {day.dayIndex}</h3>}{day.meals.map((meal, mi) => !mealId || meal.id === mealId ? <section key={meal.id} className={styles.editMeal}><h4>{meal.label}</h4>{meal.groupPortions.map((portion, pi) => !groupId || portion.groupId === groupId ? <div key={portion.groupId}>{!groupId && draft.groups.length > 1 && <p>{draft.groups.find(group => group.id === portion.groupId)?.label}</p>}{portion.dishes.map((dish, si) => <section key={dish.id} className={styles.editDish}>
        <div className={styles.dishEditHeader}><label><span className="sr-only">Tên món</span><input required maxLength={200} value={dish.label} className={styles.control} onChange={event => changeDish(di, mi, pi, si, item => { item.label = event.target.value; })} /></label><button type="button" className={styles.remove} aria-label={`Xóa món ${dish.label}`} onClick={() => change(value => { value.days[di].meals[mi].groupPortions[pi].dishes.splice(si, 1); })}>Bỏ món</button></div>
        {dish.ingredients.map((ingredient, ii) => {
          const name = knownFoods.find(food => food.id === ingredient.foodId)?.name;
          const inputId = `${day.id}-${meal.id}-${portion.groupId}-${dish.id}-${ii}`;
          return <div key={`${ingredient.foodId}-${ii}`} className={styles.editIngredient}><label htmlFor={inputId} title={name}>{foodDisplayName(name ?? "Chưa đọc được tên thực phẩm")}</label><input id={inputId} required type="number" min="0" max="100000" step={Number.isInteger(content.days[di]?.meals[mi]?.groupPortions[pi]?.dishes[si]?.ingredients[ii]?.quantityPerPortion ?? 0) ? "1" : "any"} value={Number.isFinite(ingredient.quantityPerPortion) ? ingredient.quantityPerPortion : ""} className={styles.control} onChange={event => { const quantity = event.target.valueAsNumber; changeDish(di, mi, pi, si, item => { item.ingredients[ii].quantityPerPortion = quantity; }); }} /><span>{ingredient.unit}</span><button type="button" aria-label={`Xóa ${name ?? "thực phẩm"} khỏi ${dish.label}`} className={styles.remove} onClick={() => changeDish(di, mi, pi, si, item => { item.ingredients.splice(ii, 1); })}>×</button></div>;
        })}
        <div className={styles.instructions}>
          <label>Hình thức chế biến<select aria-label={`Hình thức chế biến ${dish.label}`} className={styles.control} value={dish.preparation?.method ?? ""} onChange={event => changeDish(di, mi, pi, si, item => { item.preparation = { texture: null, steps: [], notes: [], ...item.preparation, method: event.target.value as NonNullable<Dish["preparation"]>["method"] || null }; })}><option value="">Chưa bổ sung</option>{COOKING_METHOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Kết cấu món<select aria-label={`Kết cấu món ${dish.label}`} className={styles.control} value={dish.preparation?.texture ?? ""} onChange={event => changeDish(di, mi, pi, si, item => { item.preparation = { method: null, steps: [], notes: [], ...item.preparation, texture: event.target.value as NonNullable<Dish["preparation"]>["texture"] || null }; })}><option value="">Chưa bổ sung</option>{TEXTURE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <Lines label={`Cách chế biến ${dish.label}`} value={dish.preparation?.steps ?? []} onChange={steps => changeDish(di, mi, pi, si, item => { item.preparation = { method: null, texture: null, notes: [], ...item.preparation, steps }; })} />
          <Lines label={`Lưu ý chế biến / phục vụ ${dish.label}`} value={dish.preparation?.notes ?? []} onChange={notes => changeDish(di, mi, pi, si, item => { item.preparation = { method: null, texture: null, steps: [], ...item.preparation, notes }; })} />
        </div>
        <IngredientPicker add={food => { setKnownFoods(previous => [...previous.filter(item => item.id !== food.id), food]); changeDish(di, mi, pi, si, item => { item.ingredients.push({ foodId: food.id, quantityPerPortion: 0, unit: food.unit, basis: "edible_raw", edibleFraction: null, cookingYield: null }); }); }} />
      </section>)}<button type="button" className={styles.textButton} onClick={() => change(value => { value.days[di].meals[mi].groupPortions[pi].dishes.push({ id: `manual-${crypto.randomUUID()}`, label: "Món mới", sourceKind: "manual", recipeId: null, ingredients: [] }); })}>+ Thêm món ăn</button></div> : null)}</section> : null)}</div> : null)}
      {error && <p role="alert" className={styles.calculationError}>{error} Nội dung đang sửa vẫn được giữ trên màn hình.</p>}
      <div className={styles.saveBar}><label><span className="sr-only">Ghi chú điều chỉnh</span><input maxLength={500} placeholder="Ghi chú điều chỉnh (nếu cần)" value={reason} onChange={event => setReason(event.target.value)} className={styles.control} /></label><button disabled={!dirty} className={styles.action}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button><button type="button" className={styles.secondary} onClick={() => { if (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?")) onCancel(); }}>Hủy</button><span>Lưu xong cần duyệt lại.</span></div>
    </fieldset>
  </form>;
}
