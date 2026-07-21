"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import AiRationInput, { type AiRationItem } from "./AiRationInput";
import {
  loadMedicationRows,
  makeMedicationRow,
  saveMedicationRows,
  type MedicationRow,
  type MedicationTiming,
} from "./medication-row";
import { basisForMode, calculateQuantity, isValidWastePercent } from "./quantity";
import {
  type DishNode,
  type MealNode,
  type RationMode,
  type Row,
  buildTree,
  loadRationMode,
  loadRows,
  makeRow,
  saveRationMode,
  saveRows,
} from "./types";

type FoodResult = { id: string; name: string; source: string; imageUrl?: string | null } & Record<string, number | null | string>;
type FoodType = "" | "TS" | "CB" | "MA" | "SP";
type SearchKind = "food" | "dish" | "medication";
type DishIngredientResult = { id: string; foodNameRaw: string; quantityG: number | null; food: FoodResult | null };
type DishResult = { id: string; name: string; totalWeightG: number | null; servingUnit: string | null; categoryRaw: string | null; ageGroup: string | null; diseaseDiet: string | null; imageSourceId?: string | null; ingredients: DishIngredientResult[] };

const FOOD_TYPE_FILTERS: { value: FoodType; label: string; chip: string }[] = [
  { value: "", label: "Tất cả", chip: "bg-neutral-100 text-neutral-800" },
  { value: "TS", label: "🥬 Tươi sống", chip: "bg-emerald-100 text-emerald-900" },
  { value: "CB", label: "🍳 Chế biến", chip: "bg-amber-50 text-amber-800" },
  { value: "MA", label: "🍜 Món ăn", chip: "bg-sky-50 text-sky-700" },
  { value: "SP", label: "📦 Sản phẩm", chip: "bg-violet-50 text-violet-800" },
];

function typeMeta(value: unknown) {
  return FOOD_TYPE_FILTERS.find((item) => item.value === value) ?? { label: "Chưa phân loại", chip: "bg-neutral-100 text-neutral-800" };
}

const UNASSIGNED_MEAL = "(Chưa phân bữa)";
const UNASSIGNED_DISH = "(Chưa phân món)";

function insertRowsIntoDish(previous: Row[], meal: string, dish: string, newRows: Row[]): Row[] {
  let lastIndex = -1;
  for (let index = previous.length - 1; index >= 0; index--) {
    if (previous[index].meal === meal && previous[index].dish === dish) { lastIndex = index; break; }
  }
  if (lastIndex < 0) return [...previous, ...newRows];
  return [...previous.slice(0, lastIndex + 1), ...newRows, ...previous.slice(lastIndex + 1)];
}

function toInputNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function MealInput({ onRowsChange, onModeChange }: { onRowsChange?: (rows: Row[]) => void; onModeChange?: (mode: RationMode) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<RationMode>("recall24h");
  const [hydrated, setHydrated] = useState(false);
  const [work, setWork] = useState<{ meal: string; dish: string } | null>(null);
  const [q, setQ] = useState("");
  const [searchKind, setSearchKind] = useState<SearchKind>("food");
  const [foodType, setFoodType] = useState<FoodType>("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [dishCategory, setDishCategory] = useState("");
  const [dishAge, setDishAge] = useState("");
  const [dishDisease, setDishDisease] = useState("");
  const [filterOptions, setFilterOptions] = useState<{ sources: string[]; groups: string[] }>({ sources: [], groups: [] });
  const [dishFilterOptions, setDishFilterOptions] = useState<{ categories: string[]; ageGroups: string[]; diseaseGroups: string[] }>({ categories: [], ageGroups: [], diseaseGroups: [] });
  const [results, setResults] = useState<FoodResult[]>([]);
  const [dishResults, setDishResults] = useState<DishResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEnergy, setManualEnergy] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualLipid, setManualLipid] = useState("");
  const [manualGlucid, setManualGlucid] = useState("");
  const [manualType, setManualType] = useState<FoodType>("CB");
  const [manualDescription, setManualDescription] = useState("");
  const [manualSourceNote, setManualSourceNote] = useState("");
  const [submitManualForReview, setSubmitManualForReview] = useState(true);
  const [manualMessage, setManualMessage] = useState("");
  const [medRows, setMedRows] = useState<MedicationRow[]>([]);
  const [medTiming, setMedTiming] = useState<MedicationTiming>("after");
  const [medTargetMeal, setMedTargetMeal] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medDoseUnit, setMedDoseUnit] = useState("viên");
  const [medNote, setMedNote] = useState("");
  const [dbMedRefs, setDbMedRefs] = useState<{ id: string; name: string; category: string | null; imageUrl?: string | null }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mealPlanRef = useRef<HTMLDivElement | null>(null);
  const [shouldScrollToMealPlan, setShouldScrollToMealPlan] = useState(false);

  useEffect(() => {
    // localStorage chỉ đọc sau hydration để HTML server/client không lệch nhau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(loadRows());
    setMode(loadRationMode());
    setMedRows(loadMedicationRows());
    setHydrated(true);
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!shouldScrollToMealPlan) return;
    const frame = window.requestAnimationFrame(() => {
      mealPlanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setShouldScrollToMealPlan(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shouldScrollToMealPlan, rows.length]);

  useEffect(() => {
    fetch("/api/dishes/filter-options")
      .then((response) => response.json())
      .then((data) => setDishFilterOptions({ categories: data.categories ?? [], ageGroups: data.ageGroups ?? [], diseaseGroups: data.diseaseGroups ?? [] }))
      .catch(() => setDishFilterOptions({ categories: [], ageGroups: [], diseaseGroups: [] }));
  }, []);

  useEffect(() => {
    fetch("/api/foods/filter-options")
      .then((response) => response.json())
      .then((data) => setFilterOptions({ sources: data.sources ?? [], groups: data.groups ?? [] }))
      .catch(() => setFilterOptions({ sources: [], groups: [] }));
  }, []);

  useEffect(() => {
    fetch("/api/medications")
      .then((response) => response.json())
      .then((data) => setDbMedRefs(data.items ?? []))
      .catch(() => setDbMedRefs([]));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveRows(rows);
    onRowsChange?.(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveRationMode(mode);
    onModeChange?.(mode);
  }, [mode, hydrated, onModeChange]);

  useEffect(() => {
    if (hydrated) saveMedicationRows(medRows);
  }, [medRows, hydrated]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 1 || searchKind === "medication") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (searchKind === "medication") setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (searchKind === "food" && foodType) params.set("type", foodType);
        if (searchKind === "food" && sourceFilter) params.set("source", sourceFilter);
        if (searchKind === "food" && groupFilter) params.set("group", groupFilter);
        if (searchKind === "dish" && dishCategory) params.set("category", dishCategory);
        if (searchKind === "dish" && dishAge) params.set("age", dishAge);
        if (searchKind === "dish" && dishDisease) params.set("disease", dishDisease);
        const res = await fetch(searchKind === "food" ? `/api/foods/search?${params}` : `/api/dishes/search?${params}`);
        const data = await res.json();
        if (searchKind === "food") setResults(data.items ?? []);
        else setDishResults(data.items ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, searchKind, foodType, sourceFilter, groupFilter, dishCategory, dishAge, dishDisease]);

  const tree = buildTree(rows);

  function changeMode(nextMode: RationMode) {
    if (nextMode === mode) return;
    setRows((previous) =>
      previous.map((row) => {
        if (!row.foodId) return row;
        const current = calculateQuantity({
          grams: row.inputGrams,
          basis: row.inputBasis,
          conversionFactor: row.conversionFactor,
          wastePercent: row.wastePercent,
        });
        const edibleGrams = current.edibleGrams ?? row.grams;
        return {
          ...row,
          grams: edibleGrams,
          inputBasis: "edible",
          inputGrams: edibleGrams,
          conversionFactor: 1,
        };
      })
    );
    setMode(nextMode);
  }

  function addMeal() {
    const name = `Bữa ${tree.length + 1}`;
    const dishName = "Món 1";
    setRows((previous) => [...previous, makeRow(name, dishName, null, mode)]);
    setWork({ meal: name, dish: dishName });
  }

  function addDish(meal: string) {
    const count = tree.find((item) => item.meal === meal)?.dishes.length ?? 0;
    const name = `Món ${count + 1}`;
    setRows((previous) => [...previous, makeRow(meal, name, null, mode)]);
    setWork({ meal, dish: name });
  }

  function addQuickDish() {
    const meal = work?.meal ?? tree[0]?.meal ?? `Bữa ${tree.length + 1}`;
    const suggestedName = "Món / đồ ăn nhanh";
    const dish = window.prompt("Tên món cần thêm", suggestedName)?.trim();
    if (!dish) return;
    setRows((previous) => [...previous, makeRow(meal, dish, null, mode)]);
    setWork({ meal, dish });
  }

  function renameMeal(oldName: string, newName: string) {
    if (!newName.trim() || newName === oldName) return;
    setRows((previous) => previous.map((row) => (row.meal === oldName ? { ...row, meal: newName } : row)));
    setWork((current) => (current?.meal === oldName ? { ...current, meal: newName } : current));
  }

  function renameDish(meal: string, oldDish: string, newDish: string) {
    if (!newDish.trim() || newDish === oldDish) return;
    setRows((previous) =>
      previous.map((row) => (row.meal === meal && row.dish === oldDish ? { ...row, dish: newDish } : row))
    );
    setWork((current) =>
      current?.meal === meal && current.dish === oldDish ? { ...current, dish: newDish } : current
    );
  }

  function deleteMeal(meal: string) {
    if (!window.confirm(`Xóa bữa "${meal}" và toàn bộ nội dung?`)) return;
    setRows((previous) => previous.filter((row) => row.meal !== meal));
    setWork((current) => (current?.meal === meal ? null : current));
  }

  function deleteDish(meal: string, dish: string) {
    if (!window.confirm(`Xóa món "${dish}" và toàn bộ thực phẩm trong đó?`)) return;
    setRows((previous) => previous.filter((row) => !(row.meal === meal && row.dish === dish)));
    setWork((current) => (current?.meal === meal && current.dish === dish ? null : current));
  }

  function deleteFoodRow(uid: string) {
    setRows((previous) => previous.filter((row) => row.uid !== uid));
  }

  function updateQuantity(uid: string, field: "inputGrams" | "conversionFactor", value: number) {
    const basis = basisForMode(mode);
    setRows((previous) =>
      previous.map((row) => {
        if (row.uid !== uid) return row;
        const inputGrams = field === "inputGrams" ? value : row.inputGrams;
        const conversionFactor = field === "conversionFactor" ? value : row.conversionFactor;
        const quantity = calculateQuantity({ grams: inputGrams, basis, conversionFactor, wastePercent: row.wastePercent });
        return {
          ...row,
          inputGrams,
          inputBasis: basis,
          conversionFactor,
          // Không dùng giá trị cũ khi người dùng đổi nguyên liệu nhưng thiếu dữ liệu quy đổi.
          grams: quantity.edibleGrams ?? 0,
        };
      })
    );
  }

  function updateNote(uid: string, note: string) {
    setRows((previous) => previous.map((row) => (row.uid === uid ? { ...row, note } : row)));
  }

  function updateSearch(value: string) {
    setQ(value);
    if (!value.trim()) { setResults([]); setDishResults([]); }
  }

  function changeSearchKind(next: SearchKind) {
    setSearchKind(next);
    setQ("");
    setResults([]);
    setDishResults([]);
  }

  function changeFoodType(nextType: FoodType) {
    setFoodType(nextType);
    setResults([]);
  }

  function clearSearchFilters() {
    setQ("");
    setFoodType("");
    setSourceFilter("");
    setGroupFilter("");
    setDishCategory("");
    setDishAge("");
    setDishDisease("");
    setResults([]);
    setDishResults([]);
  }

  function pickFood(food: FoodResult) {
    let meal = work?.meal;
    let dish = work?.dish;
    if (work === null) {
      meal = UNASSIGNED_MEAL;
      dish = UNASSIGNED_DISH;
      setWork({ meal, dish });
    }
    const nutrients: Record<string, number | null> = {};
    for (const field of CORE_CALC_FIELDS) {
      const value = food[field.key];
      nutrients[field.key] = typeof value === "number" ? value : null;
    }
    const classify = {
      foodGroup: typeof food.foodGroup === "string" ? food.foodGroup : null,
      proteinOrigin: typeof food.proteinOrigin === "string" ? food.proteinOrigin : null,
      giLevel: typeof food.giLevel === "number" ? food.giLevel : null,
      purinLevel: typeof food.purinLevel === "number" ? food.purinLevel : null,
      cholesterolLevel: typeof food.cholesterolLevel === "number" ? food.cholesterolLevel : null,
    };
    const nextRow = makeRow(
        meal!,
        dish!,
        {
          id: food.id,
          name: food.name,
          nutrients,
          classify,
          wastePercent: typeof food.wastePercent === "number" ? food.wastePercent : null,
        },
        mode
      );
    setRows((previous) => insertRowsIntoDish(previous, meal!, dish!, [nextRow]));
    setQ("");
    setResults([]);
  }

  function pickDish(dish: DishResult) {
    const meal = work?.meal ?? tree[0]?.meal ?? `Bữa ${tree.length + 1}`;
    const eligible = dish.ingredients.filter((ingredient) => ingredient.food);
    if (!eligible.length) { window.alert("Món này chưa liên kết được nguyên liệu nào với dữ liệu thực phẩm để tính dinh dưỡng."); return; }
    const dishName = dish.name;
    const newRows = eligible.map((ingredient) => {
      const food = ingredient.food!;
      const nutrients: Record<string, number | null> = {};
      for (const field of CORE_CALC_FIELDS) nutrients[field.key] = typeof food[field.key] === "number" ? food[field.key] as number : null;
      const classify = { foodGroup: typeof food.foodGroup === "string" ? food.foodGroup : null, proteinOrigin: typeof food.proteinOrigin === "string" ? food.proteinOrigin : null, giLevel: typeof food.giLevel === "number" ? food.giLevel : null, purinLevel: typeof food.purinLevel === "number" ? food.purinLevel : null, cholesterolLevel: typeof food.cholesterolLevel === "number" ? food.cholesterolLevel : null };
      const cleanGrams = typeof ingredient.quantityG === "number" && ingredient.quantityG > 0 ? ingredient.quantityG : 100;
      const wastePercent = typeof food.wastePercent === "number" ? food.wastePercent : null;
      const row = makeRow(meal, dishName, { id: food.id, name: food.name, nutrients, classify, wastePercent }, mode);
      return { ...row, grams: cleanGrams, inputGrams: cleanGrams, inputBasis: "edible" as const, conversionFactor: 1, note: `Từ công thức: ${dish.name}` };
    });
    setRows((previous) => insertRowsIntoDish(previous, meal, dishName, newRows));
    setWork({ meal, dish: dishName });
    setQ(""); setDishResults([]);
    const skipped = dish.ingredients.length - eligible.length;
    if (skipped) window.alert(`Đã thêm ${eligible.length} nguyên liệu có dữ liệu. ${skipped} nguyên liệu chưa liên kết dữ liệu thực phẩm nên không được đưa vào phép tính.`);
  }

  async function addManualFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    const proposal = {
      id: `local-${Date.now()}`,
      name,
      source: "Tự nhập — chỉ trong khẩu phần này",
      foodType: manualType,
      energyKcal: toInputNumber(manualEnergy),
      proteinG: toInputNumber(manualProtein),
      lipidG: toInputNumber(manualLipid),
      glucidG: toInputNumber(manualGlucid),
    };
    // Luôn thêm bản tạm vào phiếu trước, không chờ quy trình kiểm duyệt.
    pickFood(proposal);
    setManualName("");
    setManualEnergy("");
    setManualProtein("");
    setManualLipid("");
    setManualGlucid("");
    if (!submitManualForReview) { setManualMessage("Đã thêm thực phẩm tạm vào khẩu phần này. Bản này chưa gửi kiểm duyệt."); return; }
    if (!manualDescription.trim()) { setManualMessage("Đã thêm ngay vào khẩu phần. Chưa gửi kiểm duyệt vì thiếu mô tả/nguồn để đối chiếu."); return; }
    setManualMessage("Đã thêm ngay vào khẩu phần. Đang gửi bản nháp để kiểm duyệt...");
    try {
      const response = await fetch("/api/food-submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, foodType: manualType, description: manualDescription, sourceNote: manualSourceNote, energyKcal: proposal.energyKcal, proteinG: proposal.proteinG, lipidG: proposal.lipidG, glucidG: proposal.glucidG }) });
      const data = await response.json() as { error?: string };
      setManualMessage(response.ok ? "Đã thêm ngay vào khẩu phần và gửi bản nháp để kiểm duyệt." : `Đã thêm ngay vào khẩu phần. Chưa gửi kiểm duyệt: ${data.error ?? "cần đăng nhập"}`);
      if (response.ok) { setManualDescription(""); setManualSourceNote(""); }
    } catch { setManualMessage("Đã thêm ngay vào khẩu phần. Chưa gửi được bản nháp kiểm duyệt."); }
  }

  function addAiItems(items: AiRationItem[]) {
    const newRows = items.flatMap((item) => {
      const food = item.food;
      const meal = item.meal || work?.meal || UNASSIGNED_MEAL;
      const dish = item.dishName || work?.dish || UNASSIGNED_DISH;
      // Chưa khớp thực phẩm vẫn thêm dòng vào bảng (giữ đúng tên AI ghi nhận
      // được) để không mất cấu trúc bữa/món đã nhập — chỉ là chưa có
      // nutrients/classify nên KHÔNG tính vào tổng dinh dưỡng cho tới khi
      // người dùng tự chọn đúng thực phẩm ở bảng khẩu phần.
      if (!food) {
        const row = makeRow(meal, dish, null, mode);
        const grams = item.edibleGrams || row.grams;
        return [{ ...row, foodName: item.foodName, grams, inputGrams: grams, inputBasis: "edible" as const, note: `AI chưa khớp CSDL, cần chọn lại thực phẩm.${item.note ? ` ${item.note}` : ""}` }];
      }
      const nutrients: Record<string, number | null> = {};
      for (const field of CORE_CALC_FIELDS) nutrients[field.key] = typeof food[field.key] === "number" ? food[field.key] as number : null;
      const classify = {
        foodGroup: typeof food.foodGroup === "string" ? food.foodGroup : null,
        proteinOrigin: typeof food.proteinOrigin === "string" ? food.proteinOrigin : null,
        giLevel: typeof food.giLevel === "number" ? food.giLevel : null,
        purinLevel: typeof food.purinLevel === "number" ? food.purinLevel : null,
        cholesterolLevel: typeof food.cholesterolLevel === "number" ? food.cholesterolLevel : null,
      };
      const row = makeRow(meal, dish, { id: food.id, name: food.name, nutrients, classify, wastePercent: typeof food.wastePercent === "number" ? food.wastePercent : null }, mode);
      const grams = item.edibleGrams || row.grams;
      return [{ ...row, grams, inputGrams: grams, inputBasis: "edible" as const, note: item.note ? `AI: ${item.note}` : "AI: đã kiểm tra khớp CSDL" }];
    });
    if (!newRows.length) return;
    setRows((previous) => newRows.reduce((current, row) => insertRowsIntoDish(current, row.meal, row.dish, [row]), previous));
    const last = items[items.length - 1];
    if (last) setWork({ meal: last.meal || work?.meal || UNASSIGNED_MEAL, dish: last.dishName || work?.dish || UNASSIGNED_DISH });
    setShouldScrollToMealPlan(true);
  }

  const normalizedMedicationQuery = q.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filteredDbMedRefs = dbMedRefs.filter((item) => {
    if (!normalizedMedicationQuery) return false;
    const searchable = `${item.name} ${item.category ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return searchable.includes(normalizedMedicationQuery);
  }).slice(0, 20);

  function activateMedicationSearch(meal = "") {
    setMedTargetMeal(meal || work?.meal || tree[0]?.meal || "");
    setMedTiming("after");
    setMedDose("");
    setMedDoseUnit("viên");
    setMedNote("");
    changeSearchKind("medication");
  }

  function pickMedication(ref: { id: string; name: string; category: string | null }) {
    if (!medTargetMeal) {
      window.alert("Hãy chọn một bữa để đặt mốc thuốc/TPBS.");
      return;
    }
    setMedRows((previous) => [...previous, makeMedicationRow(medTargetMeal, ref.name, medTiming, medDose.trim(), medDoseUnit.trim(), medNote.trim())]);
    setQ("");
    setMedDose("");
    setMedNote("");
  }

  function deleteMedication(uid: string) {
    setMedRows((previous) => previous.filter((row) => row.uid !== uid));
  }

  function updateMedication(uid: string, patch: Partial<Pick<MedicationRow, "dose" | "doseUnit" | "note">>) {
    setMedRows((previous) => previous.map((row) => row.uid === uid ? { ...row, ...patch } : row));
  }

  return (
    <section className="flex min-h-screen flex-col gap-2 pb-36" aria-label="Nhập khẩu phần" aria-busy={!hydrated}>
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Nhập khẩu phần</h1>
        <p className="mt-1 text-sm text-neutral-500">Lập bữa ăn, món ăn và thực phẩm trước khi phân tích.</p>
      </div>

      <ModeSelector mode={mode} disabled={!hydrated} onChange={changeMode} />

      <AiRationInput onConfirm={addAiItems} />

      <div className="flex flex-wrap gap-2">
        <button disabled={!hydrated} onClick={addMeal} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
          {hydrated ? "+ Thêm bữa ăn" : "Đang tải..."}
        </button>
        <button type="button" onClick={() => setShowManualForm((current) => !current)} className="rounded-md border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">＋ Thực phẩm mới</button>
        <button type="button" onClick={addQuickDish} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50">＋ Món / Đồ ăn nhanh</button>
      </div>
      {showManualForm && <form onSubmit={addManualFood} className="rounded-md border-2 border-[#5c7d74] bg-[#edf8f1] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-semibold text-neutral-900">Thực phẩm mới: dùng ngay &amp; gửi kiểm duyệt</h3><p className="text-sm text-neutral-900">Bấm thêm là dòng tạm xuất hiện ngay trong khẩu phần. Gửi kiểm duyệt là một việc riêng, không làm chậm công việc hiện tại.</p></div><button type="button" onClick={() => setShowManualForm(false)} className="px-2 text-sm text-neutral-800">✕</button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-neutral-950">Tên thực phẩm<input required value={manualName} onChange={(event) => setManualName(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Loại thực phẩm<select value={manualType} onChange={(event) => setManualType(event.target.value as FoodType)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5"><option value="TS">Tươi sống</option><option value="CB">Chế biến</option><option value="MA">Món ăn</option></select></label><label className="text-sm font-semibold text-neutral-950">Năng lượng /100g (kcal)<input type="number" min={0} value={manualEnergy} onChange={(event) => setManualEnergy(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Đạm /100g (g)<input type="number" min={0} step="any" value={manualProtein} onChange={(event) => setManualProtein(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Béo /100g (g)<input type="number" min={0} step="any" value={manualLipid} onChange={(event) => setManualLipid(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Đường bột /100g (g)<input type="number" min={0} step="any" value={manualGlucid} onChange={(event) => setManualGlucid(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label></div>
        <label className="mt-4 flex items-start gap-2 rounded border border-[#a77b10] bg-[#fff8df] p-3 text-sm font-semibold text-neutral-950"><input type="checkbox" checked={submitManualForReview} onChange={(event) => setSubmitManualForReview(event.target.checked)} className="mt-1" />Đồng thời gửi bản nháp để quản trị viên kiểm duyệt dùng chung</label>
        {submitManualForReview && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-neutral-950 sm:col-span-2">Mô tả / căn cứ đề xuất<textarea value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} placeholder="Ví dụ: sản phẩm nào, phần ăn, thông tin nhãn..." className="mt-1 min-h-20 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950 sm:col-span-2">Nguồn tham khảo<textarea value={manualSourceNote} onChange={(event) => setManualSourceNote(event.target.value)} placeholder="Nhãn sản phẩm, tài liệu hoặc đường dẫn để đối chiếu..." className="mt-1 min-h-16 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label></div>}
        <button className="mt-4 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0d2e29]">Thêm ngay vào khẩu phần</button>{manualMessage && <p className="mt-2 text-sm font-semibold text-neutral-950">{manualMessage}</p>}
      </form>}

      <div ref={mealPlanRef} tabIndex={-1} className="scroll-mt-6 outline-none">
      {tree.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">Chưa có bữa ăn nào. Bấm “+ Thêm bữa ăn” để bắt đầu.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {tree.map((meal) => (
            <MealBlock
              key={meal.meal}
              node={meal}
              mode={mode}
              work={work}
              medications={medRows.filter((med) => med.meal === meal.meal)}
              onSelectDish={(dish) => setWork({ meal: meal.meal, dish })}
              onRenameMeal={(name) => renameMeal(meal.meal, name)}
              onDeleteMeal={() => deleteMeal(meal.meal)}
              onAddDish={() => addDish(meal.meal)}
              onAddMedication={() => activateMedicationSearch(meal.meal)}
              onRenameDish={(oldDish, name) => renameDish(meal.meal, oldDish, name)}
              onDeleteDish={(dish) => deleteDish(meal.meal, dish)}
              onDeleteFoodRow={deleteFoodRow}
              onUpdateQuantity={updateQuantity}
              onUpdateNote={updateNote}
              onUpdateMedication={updateMedication}
              onDeleteMedication={deleteMedication}
            />
          ))}
        </div>
      )}
      </div>

      {/* Ô tìm kiếm ghim cố định dưới màn hình — theo yêu cầu người dùng, tránh
          phải cuộn lên xuống liên tục để thêm thực phẩm khi danh sách bữa/món
          đã dài. Bộ lọc gộp gọn, ẩn mặc định (bấm "Bộ lọc" mới hiện); danh sách
          gợi ý mở NGƯỢC LÊN TRÊN (bottom-full) vì thanh này neo ở đáy màn hình.
          Portal thẳng ra document.body: .clinical-panel (Calculator.tsx) có
          animation kết thúc bằng transform: translateY(0) giữ nguyên
          (animation-fill-mode: both) — dù là identity transform, nó vẫn tạo
          containing block mới cho position:fixed, khiến thanh này bị "nhốt"
          trong khung thay vì ghim theo viewport nếu không portal ra ngoài. */}
      {portalReady && createPortal(
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
        <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-neutral-300 bg-white px-3 py-2 shadow-xl">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
            <span>{searchKind === "medication" ? <>Đang đặt thuốc / TPBS tại: <b className="text-violet-800">{medTargetMeal || "chưa chọn bữa"}</b></> : work ? <>Đang thêm vào: <b className="text-emerald-700">{work.meal} › {work.dish}</b></> : "Chưa chọn món — thực phẩm sẽ vào mục Chưa phân bữa."}</span>
            <div className="flex items-center gap-2">
              {(foodType || sourceFilter || groupFilter || dishCategory || dishAge || dishDisease || q) && <button type="button" onClick={clearSearchFilters} className="font-semibold text-[#123c36] underline underline-offset-2">Xóa lọc</button>}
              {searchKind !== "medication" && <button type="button" onClick={() => setFiltersOpen((current) => !current)} className="font-semibold text-[#123c36] underline underline-offset-2">{filtersOpen ? "Ẩn bộ lọc ▲" : "Bộ lọc ▾"}</button>}
            </div>
          </div>
          {filtersOpen && <div className="mb-2 rounded-md border border-neutral-200 bg-neutral-50 p-2">
            {searchKind === "food" && <>
              <div className="flex flex-wrap items-center gap-1.5" aria-label="Lọc loại thực phẩm">
                {FOOD_TYPE_FILTERS.map((filter) => (
                  <button key={filter.value || "all"} type="button" aria-pressed={foodType === filter.value} onClick={() => changeFoodType(filter.value)} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${foodType === filter.value ? "border-emerald-700 bg-emerald-700 text-white" : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"}`}>
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-medium text-neutral-800">Nguồn dữ liệu
                  <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                    <option value="">Tất cả nguồn</option>
                    {filterOptions.sources.map((source) => <option key={source} value={source}>{source}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-neutral-800">Nhóm thực phẩm
                  <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                    <option value="">Tất cả nhóm</option>
                    {filterOptions.groups.map((group) => <option key={group} value={group}>{group}</option>)}
                  </select>
                </label>
              </div>
            </>}
            {searchKind === "dish" && <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-xs font-medium text-neutral-800">Nhóm món gốc<select value={dishCategory} onChange={(event) => setDishCategory(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"><option value="">Tất cả nhóm</option>{dishFilterOptions.categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs font-medium text-neutral-800">Nhóm tuổi<select value={dishAge} onChange={(event) => setDishAge(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"><option value="">Tất cả nhóm tuổi</option>{dishFilterOptions.ageGroups.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs font-medium text-neutral-800">Chế độ bệnh lý<select value={dishDisease} onChange={(event) => setDishDisease(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"><option value="">Không giới hạn</option>{dishFilterOptions.diseaseGroups.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>}
          </div>}
          {searchKind === "medication" && <div className="mb-2 rounded-md border border-violet-200 bg-violet-50 p-2">
            <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Cách hiển thị thuốc hoặc thực phẩm bổ sung">
              <button type="button" onClick={() => setMedTiming("after")} aria-pressed={medTiming !== "standalone"} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${medTiming !== "standalone" ? "border-violet-700 bg-violet-700 text-white" : "border-violet-300 bg-white text-violet-950"}`}>Gắn theo bữa ăn</button>
              <button type="button" onClick={() => setMedTiming("standalone")} aria-pressed={medTiming === "standalone"} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${medTiming === "standalone" ? "border-violet-700 bg-violet-700 text-white" : "border-violet-300 bg-white text-violet-950"}`}>Mốc thuốc riêng</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-violet-950">{medTiming === "standalone" ? "Đặt sau mốc bữa" : "Gắn theo bữa"}
                <select value={medTargetMeal} onChange={(event) => setMedTargetMeal(event.target.value)} className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-900">
                  <option value="">Chọn bữa…</option>
                  {tree.map((meal) => <option key={meal.meal} value={meal.meal}>{meal.meal}</option>)}
                </select>
              </label>
              {medTiming === "standalone" ? <div className="rounded-md border border-violet-200 bg-white px-2 py-1.5 text-xs leading-5 text-violet-950"><b>Mốc riêng không kèm bữa:</b> hiển thị thành một thẻ riêng ngay sau bữa đã chọn, không lẫn vào danh sách món ăn.</div> : <label className="text-xs font-semibold text-violet-950">Vị trí trong bữa
                <select value={medTiming} onChange={(event) => setMedTiming(event.target.value as "before" | "after")} className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-900">
                  <option value="before">Trước bữa (nằm trên món)</option>
                  <option value="after">Sau bữa (nằm dưới món)</option>
                </select>
              </label>}
              <label className="text-xs font-semibold text-violet-950">Liều lượng
                <input value={medDose} onChange={(event) => setMedDose(event.target.value)} placeholder="VD: 1; 0,5; 500" className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-900" />
              </label>
              <label className="text-xs font-semibold text-violet-950">Đơn vị liều
                <input value={medDoseUnit} onChange={(event) => setMedDoseUnit(event.target.value)} list="medication-dose-units" placeholder="VD: viên, ml, mg" className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-900" />
                <datalist id="medication-dose-units"><option value="viên" /><option value="gói" /><option value="ống" /><option value="ml" /><option value="mg" /><option value="g" /><option value="giọt" /><option value="muỗng" /></datalist>
              </label>
              <label className="text-xs font-semibold text-violet-950 sm:col-span-2">Ghi chú bác sĩ / dinh dưỡng viên <span className="font-normal">(giờ dùng, cách dùng, dặn dò…)</span>
                <input value={medNote} onChange={(event) => setMedNote(event.target.value)} placeholder={medTiming === "standalone" ? "VD: 15:00, uống cách bữa trưa 2 giờ…" : "VD: uống với nước, theo đơn…"} className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-900" />
              </label>
            </div>
          </div>}
          <div className="flex items-center gap-1.5">
            <div className="flex shrink-0 gap-1" role="tablist" aria-label="Nguồn thêm vào khẩu phần">
              <button type="button" role="tab" aria-selected={searchKind === "food"} onClick={() => changeSearchKind("food")} className={`rounded-md px-2.5 py-2 text-xs font-semibold ${searchKind === "food" ? "bg-[#123c36] text-white" : "border border-neutral-300 bg-white text-neutral-900"}`}>Thực phẩm</button>
              <button type="button" role="tab" aria-selected={searchKind === "dish"} onClick={() => changeSearchKind("dish")} className={`rounded-md px-2.5 py-2 text-xs font-semibold ${searchKind === "dish" ? "bg-[#123c36] text-white" : "border border-neutral-300 bg-white text-neutral-900"}`}>Món ăn</button>
              <button type="button" role="tab" aria-selected={searchKind === "medication"} onClick={() => activateMedicationSearch()} className={`rounded-md px-2.5 py-2 text-xs font-semibold ${searchKind === "medication" ? "bg-violet-700 text-white" : "border border-violet-300 bg-white text-violet-950"}`}>💊 Thuốc / TPBS</button>
            </div>
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="food-search">{searchKind === "food" ? "Tìm thực phẩm" : searchKind === "dish" ? "Tìm món ăn" : "Tìm thuốc hoặc thực phẩm bổ sung"}</label>
              <input id="food-search" disabled={!hydrated} type="text" value={q} onChange={(event) => updateSearch(event.target.value)} placeholder={searchKind === "food" ? "VD: cá chép, sữa chua; gõ không dấu được" : searchKind === "dish" ? "VD: bún riêu, cháo thịt; gõ không dấu được" : "VD: metformin, vitamin D; gõ không dấu được"} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:cursor-wait disabled:bg-neutral-50" />
              {searchKind === "food" && q.trim().length >= 1 && (
                <div className="absolute inset-x-0 bottom-full z-10 mb-1 max-h-72 overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
                  {searching && <div className="px-3 py-2 text-sm text-neutral-400">Đang tìm...</div>}
                  {!searching && results.length === 0 && <div className="px-3 py-2 text-sm text-neutral-400">Không có kết quả.</div>}
                  {results.map((food) => {
                    const meta = typeMeta(food.foodType);
                    return (
                    <button key={food.id} onClick={() => pickFood(food)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50">
                      {food.imageUrl ? <img src={food.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" loading="lazy" /> : <span className="h-8 w-8 shrink-0" />}
                      <span className="flex-1">{food.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}>{meta.label}</span>
                      <span className="shrink-0 text-xs text-neutral-400">{food.source} · {typeof food.energyKcal === "number" ? `${food.energyKcal} kcal/100g` : "—"}</span>
                    </button>
                    );
                  })}
                </div>
              )}
              {searchKind === "dish" && q.trim().length >= 1 && <div className="absolute inset-x-0 bottom-full z-10 mb-1 max-h-80 overflow-auto rounded-md border border-neutral-300 bg-white shadow-lg">
                {searching && <div className="px-3 py-2 text-sm text-neutral-700">Đang tìm...</div>}
                {!searching && dishResults.length === 0 && <div className="px-3 py-2 text-sm text-neutral-700">Không có món phù hợp.</div>}
                {dishResults.map((dish) => <button key={dish.id} type="button" onClick={() => pickDish(dish)} className="flex w-full items-start gap-2 border-b border-neutral-200 px-3 py-3 text-left last:border-0 hover:bg-emerald-50">{dish.imageSourceId ? <img src={`/api/dish-images/rni/${dish.imageSourceId}`} alt="" className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" /> : <span className="h-10 w-10 shrink-0" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-neutral-950">{dish.name}</span><span className="text-xs text-neutral-800">{dish.ingredients.length} nguyên liệu {dish.totalWeightG ? `· ${dish.totalWeightG}g` : ""}</span></div><div className="mt-1 flex flex-wrap gap-1 text-xs text-neutral-800">{dish.categoryRaw && <span className="rounded bg-neutral-100 px-1.5 py-0.5">{dish.categoryRaw}</span>}{dish.ageGroup && <span className="rounded bg-sky-50 px-1.5 py-0.5">{dish.ageGroup}</span>}{dish.diseaseDiet && <span className="rounded bg-rose-50 px-1.5 py-0.5">{dish.diseaseDiet}</span>}</div><p className="mt-1 text-xs text-neutral-800">Bấm để thêm các nguyên liệu đã liên kết dữ liệu vào một món mới trong bữa đang chọn.</p></div></button>)}
              </div>}
              {searchKind === "medication" && q.trim().length >= 1 && <div className="absolute inset-x-0 bottom-full z-10 mb-1 max-h-80 overflow-auto rounded-md border border-violet-300 bg-white shadow-lg">
                {filteredDbMedRefs.length === 0 && <div className="px-3 py-3 text-sm text-neutral-700">Không có thuốc / TPBS phù hợp trong danh mục đã nhập.</div>}
                {filteredDbMedRefs.map((item) => <button key={item.id} type="button" onClick={() => pickMedication(item)} className="flex w-full items-center gap-3 border-b border-violet-100 px-3 py-2.5 text-left last:border-0 hover:bg-violet-50">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-md border border-violet-100 object-contain" loading="lazy" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-xl" aria-hidden="true">💊</span>}
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-neutral-950">{item.name}</span>{item.category && <span className="mt-0.5 block text-xs text-violet-900">{item.category}</span>}</span>
                  <span className="shrink-0 rounded border border-violet-300 px-2 py-1 text-xs font-semibold text-violet-900">Thêm</span>
                </button>)}
                {filteredDbMedRefs.length === 20 && <p className="border-t border-violet-100 px-3 py-2 text-xs text-violet-900">20 kết quả đầu — gõ thêm để thu hẹp.</p>}
              </div>}
            </div>
          </div>
        </div>
      </div>,
      document.body)}
    </section>
  );
}

function ModeSelector({ mode, disabled, onChange }: { mode: RationMode; disabled: boolean; onChange: (mode: RationMode) => void }) {
  const isRecall = mode === "recall24h";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-800">Chế độ nhập</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button disabled={disabled} onClick={() => onChange("recall24h")} aria-pressed={isRecall} className={`rounded-md border p-3 text-left text-sm disabled:cursor-wait disabled:opacity-60 ${isRecall ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-neutral-200 hover:border-emerald-300"}`}>
          <span className="block font-semibold">Khẩu phần 24 giờ</span>
          <span className="mt-1 block text-xs text-neutral-700">Nhập lượng đã ăn + hệ số đổi về sống sạch.</span>
        </button>
        <button disabled={disabled} onClick={() => onChange("menu")} aria-pressed={!isRecall} className={`rounded-md border p-3 text-left text-sm disabled:cursor-wait disabled:opacity-60 ${!isRecall ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-neutral-200 hover:border-emerald-300"}`}>
          <span className="block font-semibold">Lập thực đơn</span>
          <span className="mt-1 block text-xs text-neutral-700">Nhập trực tiếp lượng sống sạch.</span>
        </button>
      </div>
    </div>
  );
}

function EditableTitle({ value, onCommit, className, placeholder }: { value: string; onCommit: (value: string) => void; className?: string; placeholder?: string }) {
  const [text, setText] = useState(value);
  return <input value={text} placeholder={placeholder} onChange={(event) => setText(event.target.value)} onBlur={() => { if (text.trim()) onCommit(text.trim()); else setText(value); }} className={className} />;
}

function MealBlock({ node, mode, work, medications, onSelectDish, onRenameMeal, onDeleteMeal, onAddDish, onAddMedication, onRenameDish, onDeleteDish, onDeleteFoodRow, onUpdateQuantity, onUpdateNote, onUpdateMedication, onDeleteMedication }: {
  node: MealNode; mode: RationMode; work: { meal: string; dish: string } | null; medications: MedicationRow[]; onSelectDish: (dish: string) => void; onRenameMeal: (name: string) => void; onDeleteMeal: () => void; onAddDish: () => void; onAddMedication: () => void; onRenameDish: (oldDish: string, name: string) => void; onDeleteDish: (dish: string) => void; onDeleteFoodRow: (uid: string) => void; onUpdateQuantity: (uid: string, field: "inputGrams" | "conversionFactor", value: number) => void; onUpdateNote: (uid: string, note: string) => void; onUpdateMedication: (uid: string, patch: Partial<Pick<MedicationRow, "dose" | "doseUnit" | "note">>) => void; onDeleteMedication: (uid: string) => void;
}) {
  const beforeMeal = medications.filter((med) => med.timing === "before");
  const afterMeal = medications.filter((med) => med.timing === "after");
  const standalone = medications.filter((med) => med.timing === "standalone");
  const unspecified = medications.filter((med) => med.timing === "unspecified");
  return <section className="overflow-hidden rounded-lg border-2 border-[#52786d] bg-white shadow-sm">
    <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 bg-[#0c5f4d] px-3 py-2.5 text-white">
      <span className="text-xs font-semibold tracking-[0.12em] text-[#d5ebaf]">BỮA ĂN</span>
      <EditableTitle value={node.meal} onCommit={onRenameMeal} className="min-w-0 rounded border border-white/30 bg-white px-2 py-1 text-base font-semibold text-neutral-950 placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#d5ebaf]" />
      <div className="flex shrink-0 items-center gap-2"><button onClick={onAddMedication} className="rounded-md border border-violet-200 bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-800">💊 Thuốc</button><button onClick={onAddDish} className="rounded-md border border-[#d5ebaf] bg-[#15745e] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1a846c]">＋ Món</button><button onClick={onDeleteMeal} className="rounded-md px-2 py-1.5 text-sm text-white hover:bg-[#0a4c3d]" title="Xóa bữa">✕</button></div>
    </div>
    <MedicationInMeal title="💊 Thuốc / TPBS dùng trước bữa" medications={beforeMeal} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} />
    {node.dishes.length === 0 ? <div className="px-4 py-4 text-sm text-neutral-900">Chưa có món. Bấm “＋ Món” để bắt đầu nhập.</div> : <div className="divide-y-2 divide-[#8ba39b]">{node.dishes.map((dish) => <DishBlock key={dish.dish} node={dish} mode={mode} isWork={work?.meal === node.meal && work.dish === dish.dish} onSelect={() => onSelectDish(dish.dish)} onRename={(name) => onRenameDish(dish.dish, name)} onDelete={() => onDeleteDish(dish.dish)} onDeleteFoodRow={onDeleteFoodRow} onUpdateQuantity={onUpdateQuantity} onUpdateNote={onUpdateNote} />)}</div>}
    <MedicationInMeal title="💊 Thuốc / TPBS dùng sau bữa" medications={afterMeal} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} />
    <MedicationInMeal title="💊 Mốc thuốc / TPBS riêng — không kèm bữa" medications={standalone} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} standalone />
    <MedicationInMeal title="💊 Thuốc / TPBS cần xác định vị trí" medications={unspecified} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} warning />
  </section>;
}

function MedicationInMeal({ title, medications, onUpdate, onDelete, warning = false, standalone = false }: { title: string; medications: MedicationRow[]; onUpdate: (uid: string, patch: Partial<Pick<MedicationRow, "dose" | "doseUnit" | "note">>) => void; onDelete: (uid: string) => void; warning?: boolean; standalone?: boolean }) {
  if (!medications.length) return null;
  return <div className={`divide-y border-y-2 ${warning ? "border-amber-300 divide-amber-200 bg-amber-50" : standalone ? "border-violet-500 divide-violet-200 bg-white" : "border-violet-300 divide-violet-200 bg-violet-50"}`}>
    <div className={`px-3 py-2 text-xs font-bold tracking-wide ${warning ? "text-amber-900" : "text-violet-900"}`}>{title}{standalone && <span className="ml-2 font-normal">(đặt sau mốc bữa này trong trình tự ngày)</span>}</div>
    {medications.map((med) => <div key={med.uid} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(220px,1fr)_100px_110px_minmax(220px,1fr)_auto] sm:items-center">
      <p className="font-semibold text-violet-950">{med.name}</p>
      <label className="text-xs font-semibold text-violet-950"><span className="sm:sr-only">Liều lượng</span><input value={med.dose} onChange={(event) => onUpdate(med.uid, { dose: event.target.value })} placeholder="Liều" aria-label={`Liều lượng ${med.name}`} className="w-full rounded border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-950" /></label>
      <label className="text-xs font-semibold text-violet-950"><span className="sm:sr-only">Đơn vị</span><input value={med.doseUnit} onChange={(event) => onUpdate(med.uid, { doseUnit: event.target.value })} placeholder="Đơn vị" aria-label={`Đơn vị liều ${med.name}`} className="w-full rounded border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-950" /></label>
      <label className="text-xs font-semibold text-violet-950"><span className="sm:sr-only">Ghi chú</span><input value={med.note} onChange={(event) => onUpdate(med.uid, { note: event.target.value })} placeholder="Giờ dùng, cách dùng, dặn dò…" aria-label={`Ghi chú ${med.name}`} className="w-full rounded border border-violet-300 bg-white px-2 py-1.5 text-sm text-neutral-950" /></label>
      <button onClick={() => onDelete(med.uid)} className="shrink-0 rounded px-2 py-1 text-violet-800 hover:bg-violet-100" title="Xóa thuốc">✕</button>
    </div>)}
  </div>;
}

function DishBlock({ node, mode, isWork, onSelect, onRename, onDelete, onDeleteFoodRow, onUpdateQuantity, onUpdateNote }: {
  node: DishNode; mode: RationMode; isWork: boolean; onSelect: () => void; onRename: (name: string) => void; onDelete: () => void; onDeleteFoodRow: (uid: string) => void; onUpdateQuantity: (uid: string, field: "inputGrams" | "conversionFactor", value: number) => void; onUpdateNote: (uid: string, note: string) => void;
}) {
  return <div>
    <div className={`grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 ${isWork ? "bg-[#dceee1]" : "bg-[#eef4f1]"}`}>
      <button onClick={onSelect} className={`rounded px-2 py-1 text-xs font-semibold ${isWork ? "bg-[#123c36] text-white" : "border border-[#52786d] bg-white text-[#123c36]"}`}>{isWork ? "ĐANG NHẬP" : "CHỌN MÓN"}</button>
      <EditableTitle value={node.dish} onCommit={onRename} placeholder="Tên món" className="min-w-0 rounded border border-[#8ba39b] bg-white px-2 py-1 text-base font-semibold text-neutral-950 placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#123c36]" />
      <button onClick={onDelete} className="rounded px-2 py-1 text-sm text-[#6d1f1f] hover:bg-[#fff0f0]" title="Xóa món">✕</button>
    </div>
    {node.rows.length === 0 ? <div className="border-t border-[#8ba39b] px-4 py-3 text-sm text-neutral-900">Chưa có thực phẩm. Chọn món này rồi tìm ở ô phía trên.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[920px] table-fixed border-collapse text-sm"><colgroup><col className="w-[42%]"/><col className="w-[15%]"/><col className="w-[11%]"/><col className="w-[13%]"/><col className="w-[15%]"/><col className="w-[4%]"/></colgroup><thead className="text-left"><tr><th className="px-3 py-2.5 font-semibold">Thực phẩm</th>{mode === "recall24h" ? <><th className="px-2 py-2.5 text-right font-semibold">Đã ăn</th><th className="px-2 py-2.5 text-right font-semibold">Hệ số về sống sạch</th><th className="px-2 py-2.5 text-right font-semibold">Sống sạch</th></> : <><th className="px-2 py-2.5 text-right font-semibold">Sống sạch</th><th className="px-2 py-2.5 text-right font-semibold">Mua / xuất kho</th><th className="px-2 py-2.5 text-right font-semibold">Thải bỏ</th></>}<th className="px-2 py-2.5 font-semibold">Ghi chú</th><th className="px-2 py-2.5" /></tr></thead><tbody>{node.rows.map((row) => <FoodRow key={row.uid} row={row} mode={mode} onDelete={() => onDeleteFoodRow(row.uid)} onUpdateQuantity={onUpdateQuantity} onUpdateNote={onUpdateNote} />)}</tbody></table></div>}
  </div>;
}

function FoodRow({ row, mode, onDelete, onUpdateQuantity, onUpdateNote }: { row: Row; mode: RationMode; onDelete: () => void; onUpdateQuantity: (uid: string, field: "inputGrams" | "conversionFactor", value: number) => void; onUpdateNote: (uid: string, note: string) => void }) {
  const basis = basisForMode(mode);
  const quantity = calculateQuantity({ grams: row.inputGrams, basis: row.inputBasis, conversionFactor: row.conversionFactor, wastePercent: row.wastePercent });
  const inputClass = "w-full rounded border border-[#8ba39b] bg-white px-2 py-1.5 text-right tabular-nums";
  const value = row.inputBasis === basis ? row.inputGrams : row.grams;
  const wasteLabel = isValidWastePercent(row.wastePercent) ? `Tỷ lệ thải bỏ: ${row.wastePercent}%` : "Chưa có tỷ lệ thải bỏ · quy đổi mặc định 1:1";

  return <tr className="align-top bg-white hover:bg-[#f7fbf8]">
    <td className="px-3 py-3"><div className="break-words font-semibold text-neutral-950">{row.foodName}</div><div className="mt-1 text-xs text-neutral-900">{wasteLabel}</div></td>
    {mode === "recall24h" ? <>
      <td className="px-2 py-2"><div className="flex items-center gap-1"><input aria-label={`Lượng đã ăn ${row.foodName}`} type="number" min={0} value={value} onChange={(event) => onUpdateQuantity(row.uid, "inputGrams", toInputNumber(event.target.value))} className={inputClass} /><span className="shrink-0 text-xs">g</span></div></td>
      <td className="px-2 py-2"><input aria-label={`Hệ số quy đổi ${row.foodName}`} type="number" min={0} step="any" value={row.conversionFactor} onChange={(event) => onUpdateQuantity(row.uid, "conversionFactor", toInputNumber(event.target.value))} className={inputClass} /></td>
      <td className="px-2 py-3 text-right font-semibold tabular-nums text-neutral-950">{quantity.edibleGrams === null ? "—" : `${round(quantity.edibleGrams)} g`}</td>
    </> : <>
      <td className="px-2 py-2"><div className="flex items-center gap-1"><input aria-label={`Lượng sống sạch ${row.foodName}`} type="number" min={0} value={value} onChange={(event) => onUpdateQuantity(row.uid, "inputGrams", toInputNumber(event.target.value))} className={inputClass} /><span className="shrink-0 text-xs">g</span></div></td>
      <td className="px-2 py-3 text-right font-semibold tabular-nums text-neutral-950">{quantity.rawGrams === null ? "—" : `${round(quantity.rawGrams)} g`}</td>
      <td className="px-2 py-3 text-right text-sm text-neutral-900">{isValidWastePercent(row.wastePercent) ? `${row.wastePercent}%` : "1:1 mặc định"}</td>
    </>}
    <td className="px-2 py-2"><input aria-label={`Ghi chú ${row.foodName}`} value={row.note} onChange={(event) => onUpdateNote(row.uid, event.target.value)} className="w-full rounded border border-[#8ba39b] bg-white px-2 py-1.5 text-sm" /></td>
    <td className="px-2 py-2 text-center"><button onClick={onDelete} className="rounded px-2 py-1.5 text-[#6d1f1f] hover:bg-[#fff0f0]" title="Xóa thực phẩm">✕</button></td>
  </tr>;
}

function round(value: number) { return Math.round(value * 10) / 10; }
