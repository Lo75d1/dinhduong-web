"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import AiRationInput, { type AiRationItem } from "./AiRationInput";
import Modal from "./Modal";
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

// Calo là chỉ số người dùng cần nắm nhanh nhất — tính ngay trên cây bữa/món.
function dishKcal(dish: DishNode): number {
  return dish.rows.reduce((sum, row) => {
    const e = row.nutrients?.energyKcal;
    return sum + (typeof e === "number" && Number.isFinite(e) ? ((row.grams || 0) * e) / 100 : 0);
  }, 0);
}

function mealKcal(meal: MealNode): number {
  return meal.dishes.reduce((sum, dish) => sum + dishKcal(dish), 0);
}

function fmtKcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

export default function MealInput({ onRowsChange, onModeChange, profileSlot, analysisSlot, savedMenuSlot }: { onRowsChange?: (rows: Row[]) => void; onModeChange?: (mode: RationMode) => void; profileSlot?: ReactNode; analysisSlot?: ReactNode; savedMenuSlot?: ReactNode }) {
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
  const [dishTargetMeal, setDishTargetMeal] = useState("");
  const [filterOptions, setFilterOptions] = useState<{ sources: string[]; groups: string[] }>({ sources: [], groups: [] });
  const [dishFilterOptions, setDishFilterOptions] = useState<{ categories: string[]; ageGroups: string[]; diseaseGroups: string[] }>({ categories: [], ageGroups: [], diseaseGroups: [] });
  const [results, setResults] = useState<FoodResult[]>([]);
  const [dishResults, setDishResults] = useState<DishResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const [medModalOpen, setMedModalOpen] = useState(false);
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
    // Không tạo sẵn "Món 1" trống: dùng bể "(Chưa phân món)" làm chỗ thêm nhanh.
    // Thêm một món ăn qua ô tìm sẽ tự tạo dish riêng (và dọn bể rỗng này).
    const dishName = UNASSIGNED_DISH;
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

  // Di chuyển bữa lên/xuống: sắp lại thứ tự các nhóm row theo bữa (buildTree giữ
  // nguyên thứ tự này khi các bữa cùng mức mealOrder — vd "Bữa 1/2/3").
  function moveMeal(meal: string, direction: "up" | "down") {
    const order = tree.map((item) => item.meal);
    const idx = order.indexOf(meal);
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= order.length) return;
    const nextOrder = [...order];
    [nextOrder[idx], nextOrder[swap]] = [nextOrder[swap], nextOrder[idx]];
    setRows((previous) => {
      const groups = new Map<string, Row[]>();
      for (const row of previous) {
        const arr = groups.get(row.meal) ?? [];
        arr.push(row);
        groups.set(row.meal, arr);
      }
      const result: Row[] = [];
      for (const name of nextOrder) result.push(...(groups.get(name) ?? []));
      for (const [name, rows] of groups) if (!nextOrder.includes(name)) result.push(...rows);
      return result;
    });
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
    if (next === "dish") setDishTargetMeal(work?.meal ?? tree[0]?.meal ?? "");
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
    const meal = (dishTargetMeal && tree.some((item) => item.meal === dishTargetMeal))
      ? dishTargetMeal
      : (work?.meal ?? tree[0]?.meal ?? `Bữa ${tree.length + 1}`);
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
    setRows((previous) => {
      const inserted = insertRowsIntoDish(previous, meal, dishName, newRows);
      // Món ăn tạo dish riêng theo tên món → dọn bể "(Chưa phân món)" rỗng của bữa này.
      return inserted.filter((row) => !(row.meal === meal && row.dish === UNASSIGNED_DISH && !row.foodId));
    });
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

  // Thuốc/TPBS giờ có popup riêng (kiểu 2 khung như bữa/món/thực phẩm): chọn thuốc
  // ở bên trái, thả/bấm vào vị trí (trước · riêng · sau) của từng bữa ở bên phải.
  function activateMedicationSearch(meal = "") {
    setMedTargetMeal(meal || work?.meal || tree[0]?.meal || "");
    setMedModalOpen(true);
  }

  function placeMedication(meal: string, timing: MedicationTiming, name: string, dose: string, doseUnit: string, note: string) {
    setMedRows((previous) => [...previous, makeMedicationRow(meal, name, timing, dose.trim(), doseUnit.trim(), note.trim())]);
  }

  function pickMedication(ref: { id: string; name: string; category: string | null }) {
    if (!medTargetMeal) { window.alert("Hãy chọn một bữa để đặt mốc thuốc/TPBS."); return; }
    setMedRows((previous) => [...previous, makeMedicationRow(medTargetMeal, ref.name, medTiming, medDose.trim(), medDoseUnit.trim(), medNote.trim())]);
    setQ(""); setMedDose(""); setMedNote("");
  }

  function deleteMedication(uid: string) {
    setMedRows((previous) => previous.filter((row) => row.uid !== uid));
  }

  function updateMedication(uid: string, patch: Partial<Pick<MedicationRow, "dose" | "doseUnit" | "note">>) {
    setMedRows((previous) => previous.map((row) => row.uid === uid ? { ...row, ...patch } : row));
  }

  const [aiOpen, setAiOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"tree" | "detail">("tree");
  const selMeal = work?.meal ?? tree[0]?.meal ?? "";
  const selMealIndex = tree.findIndex((meal) => meal.meal === selMeal);
  const selMealNode = selMealIndex >= 0 ? tree[selMealIndex] : undefined;
  const selDish = work?.dish ?? selMealNode?.dishes[0]?.dish ?? "";
  const selDishNode = selMealNode?.dishes.find((dish) => dish.dish === selDish);

  return (
    <section className="flex flex-col gap-2 pb-2 lg:min-h-0 lg:flex-1" aria-label="Nhập khẩu phần" aria-busy={!hydrated}>
      <div className="flex flex-wrap items-center gap-2">
        <ModeSelector mode={mode} disabled={!hydrated} onChange={changeMode} />
        {profileSlot}
        {savedMenuSlot}
        <button type="button" onClick={addQuickDish} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50">＋ Món / Đồ ăn nhanh</button>
        <button type="button" onClick={() => setShowManualForm((current) => !current)} className="rounded-md border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">＋ Thực phẩm mới</button>
      </div>
      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="AI hỗ trợ nhập liệu"><AiRationInput embedded onConfirm={(items) => { addAiItems(items); setAiOpen(false); }} /></Modal>
      {showManualForm && <form onSubmit={addManualFood} className="rounded-md border-2 border-[#5c7d74] bg-[#edf8f1] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-semibold text-neutral-900">Thực phẩm mới: dùng ngay &amp; gửi kiểm duyệt</h3><p className="text-sm text-neutral-900">Bấm thêm là dòng tạm xuất hiện ngay trong khẩu phần. Gửi kiểm duyệt là một việc riêng, không làm chậm công việc hiện tại.</p></div><button type="button" onClick={() => setShowManualForm(false)} className="px-2 text-sm text-neutral-800">✕</button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-neutral-950">Tên thực phẩm<input required value={manualName} onChange={(event) => setManualName(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Loại thực phẩm<select value={manualType} onChange={(event) => setManualType(event.target.value as FoodType)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5"><option value="TS">Tươi sống</option><option value="CB">Chế biến</option><option value="MA">Món ăn</option></select></label><label className="text-sm font-semibold text-neutral-950">Năng lượng /100g (kcal)<input type="number" min={0} value={manualEnergy} onChange={(event) => setManualEnergy(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Đạm /100g (g)<input type="number" min={0} step="any" value={manualProtein} onChange={(event) => setManualProtein(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Béo /100g (g)<input type="number" min={0} step="any" value={manualLipid} onChange={(event) => setManualLipid(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950">Đường bột /100g (g)<input type="number" min={0} step="any" value={manualGlucid} onChange={(event) => setManualGlucid(event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label></div>
        <label className="mt-4 flex items-start gap-2 rounded border border-[#a77b10] bg-[#fff8df] p-3 text-sm font-semibold text-neutral-950"><input type="checkbox" checked={submitManualForReview} onChange={(event) => setSubmitManualForReview(event.target.checked)} className="mt-1" />Đồng thời gửi bản nháp để quản trị viên kiểm duyệt dùng chung</label>
        {submitManualForReview && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-neutral-950 sm:col-span-2">Mô tả / căn cứ đề xuất<textarea value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} placeholder="Ví dụ: sản phẩm nào, phần ăn, thông tin nhãn..." className="mt-1 min-h-20 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label><label className="text-sm font-semibold text-neutral-950 sm:col-span-2">Nguồn tham khảo<textarea value={manualSourceNote} onChange={(event) => setManualSourceNote(event.target.value)} placeholder="Nhãn sản phẩm, tài liệu hoặc đường dẫn để đối chiếu..." className="mt-1 min-h-16 w-full rounded border border-neutral-500 bg-white px-2 py-1.5" /></label></div>}
        <button className="mt-4 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0d2e29]">Thêm ngay vào khẩu phần</button>{manualMessage && <p className="mt-2 text-sm font-semibold text-neutral-950">{manualMessage}</p>}
      </form>}

      <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-3 lg:min-h-0 lg:flex-1">
        <div className={`flex-col gap-2 ${mobilePane === "detail" ? "hidden" : "flex"} lg:flex lg:min-h-0 lg:overflow-y-auto lg:pr-1`}>
      <div ref={mealPlanRef} tabIndex={-1} className="scroll-mt-6 outline-none">
      {tree.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">Chưa có bữa ăn nào. Bấm “+ Thêm bữa ăn” để bắt đầu.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {tree.map((meal, index) => (
            <div key={meal.meal} className={`overflow-hidden rounded-lg border ${meal.meal === selMeal ? "border-[#123c36]" : "border-neutral-300"}`}>
              <div className="flex items-center gap-0.5 bg-[#eef4f1] px-1.5 py-1 text-[#0c5f4d]">
                <span className="shrink-0 text-[15px]" aria-hidden="true">🍱</span>
                <EditableTitle value={meal.meal} onCommit={(name) => renameMeal(meal.meal, name)} className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-semibold text-[#0c5f4d] focus:bg-white focus:outline-none" />
                <span className="shrink-0 rounded bg-[#123c36] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white" title="Tổng năng lượng của bữa">{fmtKcal(mealKcal(meal))}</span>
                <button type="button" onClick={() => moveMeal(meal.meal, "up")} disabled={index === 0} title="Chuyển bữa lên" className="shrink-0 rounded px-1 text-xs hover:bg-white/70 disabled:opacity-30">▲</button>
                <button type="button" onClick={() => moveMeal(meal.meal, "down")} disabled={index === tree.length - 1} title="Chuyển bữa xuống" className="shrink-0 rounded px-1 text-xs hover:bg-white/70 disabled:opacity-30">▼</button>
                <button type="button" onClick={() => addDish(meal.meal)} title="Thêm món" className="shrink-0 rounded px-1 text-sm font-bold hover:bg-white/70">＋</button>
                <button type="button" onClick={() => activateMedicationSearch(meal.meal)} title="Thuốc / TPBS" className="shrink-0 rounded px-1 text-sm hover:bg-white/70">💊</button>
                <button type="button" onClick={() => deleteMeal(meal.meal)} title="Xóa bữa" className="shrink-0 rounded px-1 text-sm text-[#8a2323] hover:bg-white/70">✕</button>
              </div>
              {meal.dishes.length === 0 ? <p className="bg-white px-2 py-1.5 pl-8 text-xs text-neutral-500">Chưa có món — bấm ＋ hoặc dùng thanh dưới.</p> : <div className="bg-white">{meal.dishes.map((dish) => { const active = work?.meal === meal.meal && work.dish === dish.dish; return <button key={dish.dish} type="button" onClick={() => { setWork({ meal: meal.meal, dish: dish.dish }); setMobilePane("detail"); }} className={`flex w-full items-center gap-1.5 border-t border-neutral-200 px-2 py-1.5 pl-8 text-left text-sm ${active ? "bg-[#dceee1] font-semibold text-[#123c36] ring-1 ring-inset ring-[#123c36]/30" : "text-neutral-800 hover:bg-neutral-50"}`}><span className="shrink-0 text-[14px]" aria-hidden="true">🍽️</span><span className="min-w-0 flex-1 truncate">{dish.dish}</span><span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-900" title="Năng lượng của món">{Math.round(dishKcal(dish))} kcal</span></button>; })}</div>}
              <MealMedications meds={medRows.filter((med) => med.meal === meal.meal)} onUpdate={updateMedication} onDelete={deleteMedication} />
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={addMeal} disabled={!hydrated} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-emerald-600 bg-emerald-50/70 px-3 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60">＋ Thêm bữa ăn mới</button>
      </div>
        </div>
        <div className={`min-w-0 ${mobilePane === "tree" ? "hidden" : "block"} lg:block lg:min-h-0 lg:overflow-y-auto`}>
          <button type="button" onClick={() => setMobilePane("tree")} className="mb-3 inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-[#123c36] lg:hidden">‹ Danh sách bữa / món</button>
          {selMealNode && selDishNode ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-600">🍱 <b className="text-[#0c5f4d]">{selMealNode.meal}</b> › 🍽️ <b className="text-[#123c36]">{selDishNode.dish}</b></p>
              <div className="overflow-hidden rounded-lg border border-[#7f948d] bg-white shadow-sm">
                <DishBlock key={selDishNode.dish} node={selDishNode} mode={mode} isWork={true} onSelect={() => setWork({ meal: selMealNode.meal, dish: selDishNode.dish })} onRename={(name) => renameDish(selMealNode.meal, selDishNode.dish, name)} onDelete={() => deleteDish(selMealNode.meal, selDishNode.dish)} onDeleteFoodRow={deleteFoodRow} onUpdateQuantity={updateQuantity} onUpdateNote={updateNote} />
              </div>
              {medRows.some((med) => med.meal === selMealNode.meal) && <p className="text-xs text-neutral-500">💊 Thuốc / TPBS của bữa <b>{selMealNode.meal}</b> hiển thị ở cây bên trái (mức bữa).</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">Chọn một món 🍽️ ở cây bên trái để mở và nhập thực phẩm.</div>
          )}
        </div>
      </div>

      {/* Ô tìm kiếm ghim cố định dưới màn hình — theo yêu cầu người dùng, tránh
          phải cuộn lên xuống liên tục để thêm thực phẩm khi danh sách bữa/món
          đã dài. Bộ lọc gộp gọn, ẩn mặc định (bấm "Bộ lọc" mới hiện); danh sách
          gợi ý mở NGƯỢC LÊN TRÊN (bottom-full) để không che phần dưới. Thanh này
          được GẮN TRONG LUỒNG ở đáy khu nhập (ngay trên nút "Sang kết quả") thay
          vì cố định đè lên nội dung — nhờ vậy hai khung cây/chi tiết co lại vừa
          đủ và không bao giờ bị thanh tìm kiếm che mất. */}
      <div className="mt-1 shrink-0">
        <div className="relative w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 shadow-md">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
            <span>{searchKind === "medication" ? <>Đang đặt thuốc / TPBS tại: <b className="text-violet-800">{medTargetMeal || "chưa chọn bữa"}</b></> : searchKind === "dish" ? (dishTargetMeal ? <>Đang thêm món vào bữa: <b className="text-emerald-700">{dishTargetMeal}</b></> : "Món ăn sẽ được thêm vào một bữa mới.") : (work ? <>Đang thêm vào: <b className="text-emerald-700">{work.meal} › {work.dish}</b></> : "Chưa chọn món — thực phẩm sẽ vào mục Chưa phân bữa.")}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={addMeal} title="Thêm bữa ăn" className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 lg:hidden">+ Bữa</button>
              {(foodType || sourceFilter || groupFilter || dishCategory || dishAge || dishDisease || q) && <button type="button" onClick={clearSearchFilters} className="font-semibold text-[#123c36] underline underline-offset-2">Xóa lọc</button>}
            </div>
          </div>
          {searchKind === "dish" && <div className="mb-2 flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-neutral-700">Thêm món vào bữa:</span>
            <select value={dishTargetMeal} onChange={(event) => setDishTargetMeal(event.target.value)} className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
              {tree.length === 0 ? <option value="">— Sẽ tạo bữa mới —</option> : tree.map((meal) => <option key={meal.meal} value={meal.meal}>{meal.meal}</option>)}
            </select>
          </div>}
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
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setFiltersOpen((current) => !current)} title="Bộ lọc tìm kiếm" className={`shrink-0 rounded-md border px-2.5 py-2 text-xs font-semibold ${filtersOpen ? "border-[#123c36] bg-[#123c36] text-white" : "border-neutral-300 bg-white text-[#123c36]"}`}>⚙ Bộ lọc</button>
            <div className="flex shrink-0 flex-wrap gap-1" role="tablist" aria-label="Nguồn thêm vào khẩu phần">
              <button type="button" role="tab" aria-selected={searchKind === "food"} onClick={() => changeSearchKind("food")} className={`rounded-md px-2.5 py-2 text-xs font-semibold ${searchKind === "food" ? "bg-[#123c36] text-white" : "border border-neutral-300 bg-white text-neutral-900"}`}>Thực phẩm</button>
              <button type="button" role="tab" aria-selected={searchKind === "dish"} onClick={() => changeSearchKind("dish")} className={`rounded-md px-2.5 py-2 text-xs font-semibold ${searchKind === "dish" ? "bg-[#123c36] text-white" : "border border-neutral-300 bg-white text-neutral-900"}`}>Món ăn</button>
            </div>
            <div className="w-full min-w-0 sm:flex-1">
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
                {filteredDbMedRefs.map((item) => <button key={item.id} type="button" onClick={() => pickMedication(item)} className="flex w-full items-center gap-3 border-b border-violet-100 px-3 py-1.5 text-left last:border-0 hover:bg-violet-50">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-md border border-violet-100 object-contain" loading="lazy" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-xl" aria-hidden="true">💊</span>}
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-neutral-950">{item.name}</span>{item.category && <span className="mt-0.5 block text-xs text-violet-900">{item.category}</span>}</span>
                  <span className="shrink-0 rounded border border-violet-300 px-2 py-1 text-xs font-semibold text-violet-900">Thêm</span>
                </button>)}
                {filteredDbMedRefs.length === 20 && <p className="border-t border-violet-100 px-3 py-2 text-xs text-violet-900">20 kết quả đầu — gõ thêm để thu hẹp.</p>}
              </div>}
            </div>
            <button type="button" onClick={() => activateMedicationSearch()} title="Thêm thuốc / TPBS theo bữa (mở bảng riêng)" className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-violet-500 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100">💊 Thuốc</button>
            <button type="button" onClick={() => setAiOpen(true)} title="AI: dán mô tả khẩu phần để tự tách bữa / món / thực phẩm" className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-[#73540d] bg-[#fffdf6] px-3 py-2 text-xs font-semibold text-[#694d00] hover:bg-[#fff6db]">✨ AI</button>
            {analysisSlot}
          </div>
        </div>
      </div>
      <MedicationModal open={medModalOpen} onClose={() => setMedModalOpen(false)} meals={tree.map((m) => m.meal)} initialMeal={medTargetMeal} medRefs={dbMedRefs} placed={medRows} onPlace={placeMedication} onDelete={deleteMedication} />
    </section>
  );
}

function ModeSelector({ mode, disabled, onChange }: { mode: RationMode; disabled: boolean; onChange: (mode: RationMode) => void }) {
  const isRecall = mode === "recall24h";
  // Gọn thành segmented control 1 hàng để chừa tối đa chiều dọc cho 2 khung cây/chi tiết.
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-neutral-300 bg-white p-0.5" role="group" aria-label="Chế độ nhập khẩu phần">
      <button disabled={disabled} onClick={() => onChange("recall24h")} aria-pressed={isRecall} title="Khẩu phần 24 giờ: nhập lượng đã ăn + hệ số đổi về sống sạch" className={`rounded px-2.5 py-1.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${isRecall ? "bg-emerald-700 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>
        Khẩu phần 24h
      </button>
      <button disabled={disabled} onClick={() => onChange("menu")} aria-pressed={!isRecall} title="Lập thực đơn: nhập trực tiếp lượng sống sạch" className={`rounded px-2.5 py-1.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${!isRecall ? "bg-emerald-700 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>
        Lập thực đơn
      </button>
    </div>
  );
}

function EditableTitle({ value, onCommit, className, placeholder }: { value: string; onCommit: (value: string) => void; className?: string; placeholder?: string }) {
  const [text, setText] = useState(value);
  return <input value={text} placeholder={placeholder} onChange={(event) => setText(event.target.value)} onBlur={() => { if (text.trim()) onCommit(text.trim()); else setText(value); }} className={className} />;
}

function MealBlock({ node, canMoveUp, canMoveDown, onMoveUp, onMoveDown, mode, work, medications, onSelectDish, onRenameMeal, onDeleteMeal, onAddDish, onAddMedication, onRenameDish, onDeleteDish, onDeleteFoodRow, onUpdateQuantity, onUpdateNote, onUpdateMedication, onDeleteMedication }: {
  node: MealNode; canMoveUp: boolean; canMoveDown: boolean; onMoveUp: () => void; onMoveDown: () => void; mode: RationMode; work: { meal: string; dish: string } | null; medications: MedicationRow[]; onSelectDish: (dish: string) => void; onRenameMeal: (name: string) => void; onDeleteMeal: () => void; onAddDish: () => void; onAddMedication: () => void; onRenameDish: (oldDish: string, name: string) => void; onDeleteDish: (dish: string) => void; onDeleteFoodRow: (uid: string) => void; onUpdateQuantity: (uid: string, field: "inputGrams" | "conversionFactor", value: number) => void; onUpdateNote: (uid: string, note: string) => void; onUpdateMedication: (uid: string, patch: Partial<Pick<MedicationRow, "dose" | "doseUnit" | "note">>) => void; onDeleteMedication: (uid: string) => void;
}) {
  const beforeMeal = medications.filter((med) => med.timing === "before");
  const afterMeal = medications.filter((med) => med.timing === "after");
  const standalone = medications.filter((med) => med.timing === "standalone");
  const unspecified = medications.filter((med) => med.timing === "unspecified");
  return <section className="overflow-hidden rounded-lg border-2 border-[#52786d] bg-white shadow-sm">
    <div className="flex flex-wrap items-center gap-2 bg-[#0c5f4d] px-3 py-2 text-white sm:flex-nowrap sm:gap-3">
      <span className="text-xs font-semibold tracking-[0.12em] text-[#d5ebaf]">BỮA ĂN</span>
      <EditableTitle value={node.meal} onCommit={onRenameMeal} className="min-w-0 flex-1 rounded border border-white/30 bg-white px-2 py-1 text-base font-semibold text-neutral-950 placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#d5ebaf]" />
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto"><button onClick={onMoveUp} disabled={!canMoveUp} title="Chuyển bữa lên" aria-label="Chuyển bữa lên" className="rounded-md px-2 py-1.5 text-sm font-semibold text-white hover:bg-[#0a4c3d] disabled:opacity-30 disabled:hover:bg-transparent">↑</button><button onClick={onMoveDown} disabled={!canMoveDown} title="Chuyển bữa xuống" aria-label="Chuyển bữa xuống" className="rounded-md px-2 py-1.5 text-sm font-semibold text-white hover:bg-[#0a4c3d] disabled:opacity-30 disabled:hover:bg-transparent">↓</button><button onClick={onAddMedication} className="rounded-md border border-violet-200 bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-800">💊 Thuốc</button><button onClick={onAddDish} className="rounded-md border border-[#d5ebaf] bg-[#15745e] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1a846c]">＋ Món</button><button onClick={onDeleteMeal} className="rounded-md px-2 py-1.5 text-sm text-white hover:bg-[#0a4c3d]" title="Xóa bữa">✕</button></div>
    </div>
    <MedicationInMeal title="💊 Thuốc / TPBS dùng trước bữa" medications={beforeMeal} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} />
    {node.dishes.length === 0 ? <div className="px-4 py-4 text-sm text-neutral-900">Chưa có món. Bấm “＋ Món” để bắt đầu nhập.</div> : <div className="divide-y-2 divide-[#8ba39b]">{node.dishes.map((dish) => <DishBlock key={dish.dish} node={dish} mode={mode} isWork={work?.meal === node.meal && work.dish === dish.dish} onSelect={() => onSelectDish(dish.dish)} onRename={(name) => onRenameDish(dish.dish, name)} onDelete={() => onDeleteDish(dish.dish)} onDeleteFoodRow={onDeleteFoodRow} onUpdateQuantity={onUpdateQuantity} onUpdateNote={onUpdateNote} />)}</div>}
    <MedicationInMeal title="💊 Thuốc / TPBS dùng sau bữa" medications={afterMeal} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} />
    <MedicationInMeal title="💊 Mốc thuốc / TPBS riêng — không kèm bữa" medications={standalone} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} standalone />
    <MedicationInMeal title="💊 Thuốc / TPBS cần xác định vị trí" medications={unspecified} onUpdate={onUpdateMedication} onDelete={onDeleteMedication} warning />
  </section>;
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

// Popup Thuốc/TPBS — bố cục 2 khung như bữa/món/thực phẩm: bên trái chọn thuốc,
// bên phải kéo-thả (hoặc bấm) vào đúng vị trí trước · riêng · sau của từng bữa.
const MED_SLOTS: { timing: MedicationTiming; label: string; hint: string }[] = [
  { timing: "before", label: "Trước bữa", hint: "uống trước khi ăn" },
  { timing: "standalone", label: "Mốc riêng", hint: "cố định, không kèm bữa" },
  { timing: "after", label: "Sau bữa", hint: "uống sau khi ăn" },
];

function MedicationModal({ open, onClose, meals, initialMeal, medRefs, placed, onPlace, onDelete }: {
  open: boolean; onClose: () => void; meals: string[]; initialMeal: string;
  medRefs: { id: string; name: string; category: string | null; imageUrl?: string | null }[];
  placed: MedicationRow[];
  onPlace: (meal: string, timing: MedicationTiming, name: string, dose: string, doseUnit: string, note: string) => void;
  onDelete: (uid: string) => void;
}) {
  const [q, setQ] = useState("");
  const [held, setHeld] = useState<string | null>(null);
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("viên");
  const [note, setNote] = useState("");

  const nq = normalizeText(q.trim());
  const results = nq ? medRefs.filter((m) => normalizeText(m.name).includes(nq)).slice(0, 25) : medRefs.slice(0, 25);

  function place(meal: string, timing: MedicationTiming) {
    if (!held) { window.alert("Hãy chọn một thuốc / TPBS ở khung bên trái trước."); return; }
    onPlace(meal, timing, held, dose, doseUnit, note);
  }

  return (
    <Modal open={open} onClose={onClose} title="💊 Thuốc / TPBS theo bữa ăn" maxWidth="max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* KHUNG TRÁI: chọn thuốc + liều */}
        <div className="flex flex-col gap-2 rounded-lg border border-violet-300 bg-violet-50/40 p-3">
          <p className="text-sm font-semibold text-violet-900">1 · Chọn thuốc / TPBS</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm: metformin, vitamin D… (gõ không dấu được)" className="w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm" />
          <div className="max-h-48 overflow-auto rounded-md border border-violet-200 bg-white">
            {results.length === 0 ? <p className="px-3 py-3 text-sm text-neutral-600">Không có thuốc / TPBS phù hợp trong danh mục.</p> : results.map((m) => (
              <button key={m.id} type="button" onClick={() => setHeld(m.name)} className={`flex w-full items-center gap-2 border-b border-violet-100 px-3 py-1.5 text-left text-sm last:border-0 ${held === m.name ? "bg-violet-200 font-semibold text-violet-950" : "hover:bg-violet-50"}`}>
                <span aria-hidden="true">💊</span><span className="min-w-0 flex-1 truncate">{m.name}</span>{m.category && <span className="shrink-0 text-xs text-violet-700">{m.category}</span>}
              </button>
            ))}
          </div>
          {held ? (
            <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", held)} className="cursor-grab rounded-md border-2 border-violet-500 bg-white px-2 py-1.5 text-sm font-semibold text-violet-900 active:cursor-grabbing" title="Kéo thả sang vị trí bữa bên phải">
              🖐️ Đang cầm: {held} <span className="font-normal text-neutral-600">— kéo sang phải hoặc bấm ô vị trí</span>
            </div>
          ) : <p className="text-xs text-neutral-600">Bấm chọn một thuốc để bắt đầu.</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-violet-950">Liều<input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="VD: 1; 500" className="mt-0.5 w-full rounded border border-violet-300 bg-white px-2 py-1 text-sm" /></label>
            <label className="text-xs font-semibold text-violet-950">Đơn vị<input value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} placeholder="viên, ml…" className="mt-0.5 w-full rounded border border-violet-300 bg-white px-2 py-1 text-sm" /></label>
          </div>
          <label className="text-xs font-semibold text-violet-950">Ghi chú<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="giờ dùng, cách dùng…" className="mt-0.5 w-full rounded border border-violet-300 bg-white px-2 py-1 text-sm" /></label>
        </div>

        {/* KHUNG PHẢI: các bữa + 3 vị trí */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-violet-900">2 · Kéo thả (hoặc bấm) vào vị trí của bữa</p>
          {meals.length === 0 ? <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-sm text-neutral-500">Chưa có bữa ăn nào. Thêm bữa trước rồi mở lại bảng này.</p> : (
            <div className="flex flex-col gap-2">
              {meals.map((meal) => (
                <div key={meal} className={`rounded-lg border p-2 ${meal === initialMeal ? "border-violet-500 bg-violet-50/50" : "border-neutral-300 bg-white"}`}>
                  <p className="mb-1 text-sm font-semibold text-[#123c36]">🍱 {meal}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {MED_SLOTS.map((slot) => {
                      const here = placed.filter((p) => p.meal === meal && p.timing === slot.timing);
                      return (
                        <div key={slot.timing} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); place(meal, slot.timing); }} onClick={() => place(meal, slot.timing)} className="cursor-pointer rounded-md border-2 border-dashed border-violet-300 bg-violet-50/40 p-2 hover:border-violet-500 hover:bg-violet-50">
                          <p className="text-xs font-bold text-violet-900">{slot.label}</p>
                          <p className="text-[11px] text-neutral-600">{slot.hint}</p>
                          {here.map((med) => (
                            <div key={med.uid} className="mt-1 flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-xs">
                              <span className="min-w-0 flex-1 truncate font-semibold text-violet-950">💊 {med.name}{med.dose ? ` · ${med.dose}${med.doseUnit || ""}` : ""}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(med.uid); }} className="shrink-0 text-violet-700 hover:text-violet-900" title="Xóa">✕</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-neutral-600">Thuốc / TPBS chỉ để theo dõi trình tự dùng theo bữa — không tính vào dinh dưỡng khẩu phần.</p>
        </div>
      </div>
    </Modal>
  );
}

// Thuốc/TPBS hiển thị ngay ở MỨC BỮA trong cây (không phải trong món): nhóm theo
// vị trí Trước · Mốc riêng (độc lập, có chấm nhấp nháy) · Sau · Cần xác định.
const MED_GROUPS: { timing: MedicationTiming; label: string; icon: string; cls: string; standalone?: boolean; warn?: boolean }[] = [
  { timing: "before", label: "Trước bữa", icon: "↑", cls: "border-violet-300 bg-violet-50 text-violet-950" },
  { timing: "standalone", label: "Mốc riêng · độc lập", icon: "◆", cls: "border-dashed border-violet-400 bg-white text-violet-950", standalone: true },
  { timing: "after", label: "Sau bữa", icon: "↓", cls: "border-violet-300 bg-violet-50 text-violet-950" },
  { timing: "unspecified", label: "Cần xác định vị trí", icon: "?", cls: "border-amber-400 bg-amber-50 text-amber-950", warn: true },
];

function MealMedications({ meds, onUpdate, onDelete }: { meds: MedicationRow[]; onUpdate: (uid: string, patch: Partial<Pick<MedicationRow, "dose" | "doseUnit" | "note">>) => void; onDelete: (uid: string) => void }) {
  if (!meds.length) return null;
  return <div className="border-t border-violet-200 bg-[#faf8ff] px-2 py-1.5">
    {MED_GROUPS.map((group) => {
      const list = meds.filter((med) => med.timing === group.timing);
      if (!list.length) return null;
      return <div key={group.timing} className="mb-1.5 last:mb-0">
        <div className={`mb-0.5 flex items-center gap-1 text-[11px] font-bold ${group.warn ? "text-amber-800" : "text-violet-800"}`}>
          {group.standalone && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" aria-hidden="true" />}
          <span>💊 {group.icon} {group.label}</span>
        </div>
        <div className="flex flex-col gap-1">
          {list.map((med) => <div key={med.uid} className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs ${group.cls}`}>
            <span className="min-w-0 flex-1 truncate font-semibold">{med.name}</span>
            <input value={med.dose} onChange={(event) => onUpdate(med.uid, { dose: event.target.value })} placeholder="liều" aria-label={`Liều ${med.name}`} className="w-11 shrink-0 rounded border border-violet-200 bg-white px-1 text-right text-[11px] text-neutral-900" />
            {med.doseUnit && <span className="shrink-0 text-[10px] opacity-80">{med.doseUnit}</span>}
            <button type="button" onClick={() => onDelete(med.uid)} className="shrink-0 px-0.5 hover:opacity-70" title="Xóa thuốc">✕</button>
          </div>)}
        </div>
      </div>;
    })}
  </div>;
}

function MedicationInMeal({ title, medications, onUpdate, onDelete, warning = false, standalone = false }: { title: string; medications: MedicationRow[]; onUpdate: (uid: string, patch: Partial<Pick<MedicationRow, "dose" | "doseUnit" | "note">>) => void; onDelete: (uid: string) => void; warning?: boolean; standalone?: boolean }) {
  if (!medications.length) return null;
  return <div className={`divide-y border-y-2 ${warning ? "border-amber-300 divide-amber-200 bg-amber-50" : standalone ? "border-violet-500 divide-violet-200 bg-white" : "border-violet-300 divide-violet-200 bg-violet-50"}`}>
    <div className={`px-3 py-2 text-xs font-bold tracking-wide ${warning ? "text-amber-900" : "text-violet-900"}`}>{title}{standalone && <span className="ml-2 font-normal">(đặt sau mốc bữa này trong trình tự ngày)</span>}</div>
    {medications.map((med) => <div key={med.uid} className="grid gap-2 px-3 py-1.5 sm:grid-cols-[minmax(220px,1fr)_100px_110px_minmax(220px,1fr)_auto] sm:items-center">
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
  const [open, setOpen] = useState(isWork);
  return <div>
    <div className={`flex items-center gap-1.5 border-l-4 border-[#52786d] px-2 py-1.5 ${isWork ? "bg-[#dceee1]" : "bg-[#eef4f1]"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Thu gọn món" : "Mở món"} className="shrink-0 rounded px-1 text-sm font-bold text-[#0c5f4d] hover:bg-white/60">{open ? "▾" : "▸"}</button>
      <span className="shrink-0 text-base" aria-hidden="true">🍽️</span>
      <EditableTitle value={node.dish} onCommit={onRename} placeholder="Tên món" className="min-w-0 flex-1 rounded border border-[#8ba39b] bg-white px-2 py-0.5 text-sm font-semibold text-neutral-950 placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#123c36]" />
      <button onClick={onDelete} className="shrink-0 rounded px-2 py-1 text-sm text-[#6d1f1f] hover:bg-[#fff0f0]" title="Xóa món">✕</button>
    </div>
    {node.rows.length === 0 ? <div className="border-t border-[#8ba39b] px-4 py-3 text-sm text-neutral-900">Chưa có thực phẩm. Chọn món này rồi tìm ở ô phía dưới.</div> : open ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] table-fixed border-collapse text-sm [&_th]:border [&_th]:border-[#cbd8d1] [&_th]:bg-[#eef4f1] [&_td]:border [&_td]:border-[#e0e8e3]"><colgroup><col className="w-[44%]"/><col className="w-[13%]"/><col className="w-[12%]"/><col className="w-[12%]"/><col className="w-[15%]"/><col className="w-[4%]"/></colgroup><thead className="text-left"><tr><th className="px-2 py-1 font-semibold">Thực phẩm</th>{mode === "recall24h" ? <><th className="px-1 py-1 text-right font-semibold">Đã ăn</th><th className="px-1 py-1 text-right font-semibold">Hệ số</th><th className="px-1 py-1 text-right font-semibold">Sống sạch</th></> : <><th className="px-1 py-1 text-right font-semibold">Sống sạch</th><th className="px-1 py-1 text-right font-semibold">Mua/kho</th><th className="px-1 py-1 text-right font-semibold">Thải bỏ</th></>}<th className="px-2 py-1 font-semibold">Ghi chú</th><th className="px-1 py-1" /></tr></thead><tbody>{node.rows.map((row) => <FoodRow key={row.uid} row={row} mode={mode} onDelete={() => onDeleteFoodRow(row.uid)} onUpdateQuantity={onUpdateQuantity} onUpdateNote={onUpdateNote} />)}</tbody></table></div> : <button type="button" onClick={() => { setOpen(true); onSelect(); }} className="w-full border-t border-[#8ba39b] px-4 py-2.5 text-left text-sm font-medium text-[#123c36] hover:bg-[#f0f6f2]">🍽️ {node.rows.length} thực phẩm — bấm để mở</button>}
  </div>;
}

function FoodRow({ row, mode, onDelete, onUpdateQuantity, onUpdateNote }: { row: Row; mode: RationMode; onDelete: () => void; onUpdateQuantity: (uid: string, field: "inputGrams" | "conversionFactor", value: number) => void; onUpdateNote: (uid: string, note: string) => void }) {
  const basis = basisForMode(mode);
  const quantity = calculateQuantity({ grams: row.inputGrams, basis: row.inputBasis, conversionFactor: row.conversionFactor, wastePercent: row.wastePercent });
  const inputClass = "w-16 rounded border border-[#8ba39b] bg-white px-1.5 py-1 text-right tabular-nums";
  const value = row.inputBasis === basis ? row.inputGrams : row.grams;
  const wasteLabel = isValidWastePercent(row.wastePercent) ? `Tỷ lệ thải bỏ: ${row.wastePercent}%` : "Chưa có tỷ lệ thải bỏ · quy đổi mặc định 1:1";

  return <tr className="align-top bg-white transition-colors hover:bg-[#f7fbf8] focus-within:bg-[#e7f4ec]">
    <td className="px-2 py-1"><div className="break-words font-semibold text-neutral-950">{row.foodName}</div><div className="text-xs text-neutral-700">{wasteLabel}</div></td>
    {mode === "recall24h" ? <>
      <td className="px-1 py-1"><div className="flex items-center justify-end gap-1"><input aria-label={`Lượng đã ăn ${row.foodName}`} type="number" min={0} value={value} onChange={(event) => onUpdateQuantity(row.uid, "inputGrams", toInputNumber(event.target.value))} className={inputClass} /><span className="shrink-0 text-xs">g</span></div></td>
      <td className="px-1 py-1"><div className="flex justify-end"><input aria-label={`Hệ số quy đổi ${row.foodName}`} type="number" min={0} step="any" value={row.conversionFactor} onChange={(event) => onUpdateQuantity(row.uid, "conversionFactor", toInputNumber(event.target.value))} className={inputClass} /></div></td>
      <td className="px-1 py-1 text-right font-semibold tabular-nums text-neutral-950">{quantity.edibleGrams === null ? "—" : `${round(quantity.edibleGrams)} g`}</td>
    </> : <>
      <td className="px-1 py-1"><div className="flex items-center justify-end gap-1"><input aria-label={`Lượng sống sạch ${row.foodName}`} type="number" min={0} value={value} onChange={(event) => onUpdateQuantity(row.uid, "inputGrams", toInputNumber(event.target.value))} className={inputClass} /><span className="shrink-0 text-xs">g</span></div></td>
      <td className="px-1 py-1 text-right font-semibold tabular-nums text-neutral-950">{quantity.rawGrams === null ? "—" : `${round(quantity.rawGrams)} g`}</td>
      <td className="px-1 py-1 text-right text-sm text-neutral-900">{isValidWastePercent(row.wastePercent) ? `${row.wastePercent}%` : "1:1 mặc định"}</td>
    </>}
    <td className="px-2 py-1"><textarea aria-label={`Ghi chú ${row.foodName}`} rows={2} value={row.note} onChange={(event) => onUpdateNote(row.uid, event.target.value)} placeholder="Ghi chú…" className="w-full resize-y rounded border border-[#8ba39b] bg-white px-2 py-1 text-sm leading-snug" /></td>
    <td className="px-1 py-1 text-center"><button onClick={onDelete} className="rounded px-1.5 py-1 text-[#6d1f1f] hover:bg-[#fff0f0]" title="Xóa thực phẩm">✕</button></td>
  </tr>;
}

function round(value: number) { return Math.round(value * 10) / 10; }
