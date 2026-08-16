// Chế độ "Thực đơn nhiều ngày" (phục vụ bếp): nhiều ngày, mỗi ngày là một khẩu
// phần độc lập (tái dùng đúng cấu trúc `Row` của chế độ một ngày). Mỗi bữa trong
// ngày là một khối riêng để bếp can thiệp lẻ. Lưu localStorage trước; đồng bộ
// server để sau (CSDL đang kẹt drift, xem PROJECT_STATUS.md).

import { EMPTY_CLASSIFY } from "@/lib/food-classify";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { buildTree, genId, makeRow, mealOrder, type MealNode, type RationMode, type Row } from "./types";

export type MenuDay = {
  id: string;
  label: string; // "Ngày 1", có thể đổi tên
  date: string; // yyyy-mm-dd hoặc "" nếu chưa gán lịch
  dietTypeId?: string; // KitchenDietType; rỗng với dữ liệu localStorage cũ
  rows: Row[];
};

const LS_KEY = "khauphan_menu_days_v1";

function normalizeRow(raw: Partial<Row>): Row {
  const grams = typeof raw.grams === "number" ? raw.grams : 0;
  return {
    uid: typeof raw.uid === "string" && raw.uid ? raw.uid : genId(),
    meal: typeof raw.meal === "string" ? raw.meal : "(Chưa phân bữa)",
    dish: typeof raw.dish === "string" ? raw.dish : "(Chưa phân món)",
    foodId: typeof raw.foodId === "string" ? raw.foodId : "",
    foodName: typeof raw.foodName === "string" ? raw.foodName : "",
    grams,
    inputGrams: typeof raw.inputGrams === "number" ? raw.inputGrams : grams,
    inputBasis: raw.inputBasis === "raw" ? "raw" : "edible",
    conversionFactor:
      typeof raw.conversionFactor === "number" && raw.conversionFactor > 0 ? raw.conversionFactor : 1,
    wastePercent: typeof raw.wastePercent === "number" ? raw.wastePercent : null,
    note: typeof raw.note === "string" ? raw.note : "",
    nutrients: raw.nutrients && typeof raw.nutrients === "object" ? raw.nutrients : {},
    classify: raw.classify ?? EMPTY_CLASSIFY,
  };
}

export function loadMenuDays(): MenuDay[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((day) => day && typeof day === "object")
      .map((day, index) => ({
        id: typeof day.id === "string" && day.id ? day.id : genId(),
        label: typeof day.label === "string" && day.label.trim() ? day.label : `Ngày ${index + 1}`,
        date: typeof day.date === "string" ? day.date : "",
        dietTypeId: typeof day.dietTypeId === "string" ? day.dietTypeId : "",
        rows: Array.isArray(day.rows) ? day.rows.map(normalizeRow) : [],
      }));
  } catch {
    return [];
  }
}

export function saveMenuDays(days: MenuDay[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(days));
  } catch {
    // localStorage đầy hoặc bị chặn — không chặn UI
  }
}

export function makeEmptyDay(index: number): MenuDay {
  return { id: genId(), label: `Ngày ${index + 1}`, date: "", dietTypeId: "", rows: [] };
}

// Nhân bản một ngày: cấp uid mới cho mọi dòng để không đụng dữ liệu ngày gốc.
export function duplicateDay(day: MenuDay, index: number): MenuDay {
  return {
    id: genId(),
    label: `Ngày ${index + 1}`,
    date: "",
    dietTypeId: day.dietTypeId,
    rows: day.rows.map((row) => ({ ...row, uid: genId() })),
  };
}

// Đổi tên bữa (và các dòng thuộc bữa đó) trong một ngày.
export function renameMealInRows(rows: Row[], oldName: string, newName: string): Row[] {
  const name = newName.trim();
  if (!name || name === oldName) return rows;
  return rows.map((row) => (row.meal === oldName ? { ...row, meal: name } : row));
}

// Nhân đôi một bữa trong ngày: sao chép toàn bộ dòng của bữa sang tên bữa mới.
export function duplicateMealInRows(rows: Row[], meal: string): Row[] {
  const mealRows = rows.filter((row) => row.meal === meal);
  if (!mealRows.length) return rows;
  const existing = new Set(rows.map((row) => row.meal));
  let copyName = `${meal} (bản sao)`;
  let n = 2;
  while (existing.has(copyName)) copyName = `${meal} (bản sao ${n++})`;
  const copies = mealRows.map((row) => ({ ...row, uid: genId(), meal: copyName }));
  return [...rows, ...copies];
}

// Xóa một món (mọi dòng của meal+dish) trong ngày.
export function deleteDishInRows(rows: Row[], meal: string, dish: string): Row[] {
  return rows.filter((r) => !(r.meal === meal && r.dish === dish));
}

// Nhân đôi một món trong bữa: sao chép mọi dòng sang tên món mới (cấp uid mới).
export function duplicateDishInRows(rows: Row[], meal: string, dish: string): Row[] {
  const dishRows = rows.filter((r) => r.meal === meal && r.dish === dish);
  if (!dishRows.length) return rows;
  const existing = new Set(rows.filter((r) => r.meal === meal).map((r) => r.dish));
  let name = `${dish} (bản sao)`;
  let n = 2;
  while (existing.has(name)) name = `${dish} (bản sao ${n++})`;
  const copies = dishRows.map((r) => ({ ...r, uid: genId(), dish: name }));
  let lastIndex = -1;
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].meal === meal && rows[i].dish === dish) { lastIndex = i; break; }
  return lastIndex < 0 ? [...rows, ...copies] : [...rows.slice(0, lastIndex + 1), ...copies, ...rows.slice(lastIndex + 1)];
}

// ---- Tính kcal / dinh dưỡng ----

export function rowKcal(row: Row): number {
  const e = row.nutrients?.energyKcal;
  return typeof e === "number" && Number.isFinite(e) ? ((row.grams || 0) * e) / 100 : 0;
}

export function dayKcal(day: MenuDay): number {
  return day.rows.reduce((sum, row) => sum + (row.foodId ? rowKcal(row) : 0), 0);
}

export function mealNodeKcal(meal: MealNode): number {
  return meal.dishes.reduce(
    (sum, dish) => sum + dish.rows.reduce((s, row) => s + rowKcal(row), 0),
    0
  );
}

// Cây bữa → món của một ngày, đã sắp theo thứ tự lâm sàng (dùng lại buildTree).
export function dayMeals(day: MenuDay): MealNode[] {
  return buildTree(day.rows);
}

// Board nhiều ngày phải giữ đúng thứ tự người dùng đã xếp. buildTree() cố ý
// sắp theo thứ tự lâm sàng cho chế độ một ngày nên không dùng nó ở sortable board.
export function dayMealsOrdered(day: MenuDay): MealNode[] {
  const order: string[] = [];
  const map = new Map<string, MealNode>();
  for (const row of day.rows) {
    if (!map.has(row.meal)) {
      map.set(row.meal, { meal: row.meal, dishes: [] });
      order.push(row.meal);
    }
    const meal = map.get(row.meal)!;
    let dish = meal.dishes.find((item) => item.dish === row.dish);
    if (!dish) {
      dish = { dish: row.dish, rows: [] };
      meal.dishes.push(dish);
    }
    if (row.foodId) dish.rows.push(row);
  }
  return order.map((meal) => map.get(meal)!);
}

// Di chuyển nguyên một nhóm bữa trong rows, giữ nguyên thứ tự món/thực phẩm bên
// trong. Đây là nguồn thứ tự duy nhất nên sau khi lưu localStorage kéo-thả vẫn dính.
export function reorderMealsInRows(rows: Row[], activeMeal: string, overMeal: string): Row[] {
  if (activeMeal === overMeal) return rows;
  const order = dayMealsOrdered({ id: "", label: "", date: "", rows }).map((item) => item.meal);
  const from = order.indexOf(activeMeal);
  const to = order.indexOf(overMeal);
  if (from < 0 || to < 0) return rows;
  const nextOrder = [...order];
  const [moved] = nextOrder.splice(from, 1);
  nextOrder.splice(to, 0, moved);
  const groups = new Map<string, Row[]>();
  for (const row of rows) groups.set(row.meal, [...(groups.get(row.meal) ?? []), row]);
  return nextOrder.flatMap((meal) => groups.get(meal) ?? []);
}

// Chuyển nguyên một MÓN (mọi dòng của meal+dish) từ ngày này sang ngày khác,
// giữ nguyên tên bữa/món (gộp vào bữa cùng tên nếu ngày đích đã có). Giữ uid.
export function moveDishToDay(
  days: MenuDay[],
  srcDayId: string,
  meal: string,
  dish: string,
  dstDayId: string
): MenuDay[] {
  if (srcDayId === dstDayId) return days;
  const src = days.find((d) => d.id === srcDayId);
  const dst = days.find((d) => d.id === dstDayId);
  if (!src || !dst) return days;
  const moving = src.rows.filter((r) => r.meal === meal && r.dish === dish);
  if (!moving.length) return days;
  return days.map((d) => {
    if (d.id === srcDayId) return { ...d, rows: d.rows.filter((r) => !(r.meal === meal && r.dish === dish)) };
    if (d.id === dstDayId) return { ...d, rows: [...d.rows, ...moving.map((r) => ({ ...r }))] };
    return d;
  });
}

// ---- Thêm bữa / món / thực phẩm trực tiếp lên board (Phase 2) ----

export const UNASSIGNED_DISH = "(Chưa phân món)";

export type MenuFoodResult = { id: string; name: string; wastePercent?: number | null } & Record<
  string,
  number | null | string
>;
export type MenuDishIngredient = { quantityG: number | null; food: MenuFoodResult | null };

function extractNutrients(food: MenuFoodResult): Record<string, number | null> {
  const n: Record<string, number | null> = {};
  for (const field of CORE_CALC_FIELDS) {
    const v = food[field.key];
    n[field.key] = typeof v === "number" ? v : null;
  }
  return n;
}

function extractClassify(food: MenuFoodResult) {
  return {
    foodGroup: typeof food.foodGroup === "string" ? food.foodGroup : null,
    proteinOrigin: typeof food.proteinOrigin === "string" ? food.proteinOrigin : null,
    giLevel: typeof food.giLevel === "number" ? food.giLevel : null,
    purinLevel: typeof food.purinLevel === "number" ? food.purinLevel : null,
    cholesterolLevel: typeof food.cholesterolLevel === "number" ? food.cholesterolLevel : null,
  };
}

// Chèn dòng ngay sau nhóm meal+dish hiện có (giữ dòng cùng món liền nhau).
function insertIntoDish(rows: Row[], meal: string, dish: string, newRows: Row[]): Row[] {
  let lastIndex = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].meal === meal && rows[i].dish === dish) { lastIndex = i; break; }
  }
  if (lastIndex < 0) return [...rows, ...newRows];
  return [...rows.slice(0, lastIndex + 1), ...newRows, ...rows.slice(lastIndex + 1)];
}

// Thêm một bữa trống (dòng giữ chỗ, chưa có thực phẩm).
export function addEmptyMeal(rows: Row[], label: string): Row[] {
  return [...rows, makeRow(label, UNASSIGNED_DISH, null, "menu")];
}

// Thêm một món trống vào bữa (dòng giữ chỗ).
export function addEmptyDish(rows: Row[], meal: string, dishName: string): Row[] {
  return [...rows, makeRow(meal, dishName, null, "menu")];
}

// Thêm một thực phẩm vào đúng bữa/món; cộng dồn nếu đã có cùng thực phẩm.
export function addFoodToDish(
  rows: Row[],
  meal: string,
  dish: string,
  food: MenuFoodResult,
  mode: RationMode = "menu"
): Row[] {
  const existing = rows.find((r) => r.meal === meal && r.dish === dish && r.foodId === food.id);
  if (existing) {
    const nextInput = (existing.inputGrams || 0) + 100;
    return rows.map((r) => (r.uid === existing.uid ? { ...r, inputGrams: nextInput, grams: nextInput } : r));
  }
  const row = makeRow(
    meal,
    dish,
    {
      id: food.id,
      name: food.name,
      nutrients: extractNutrients(food),
      classify: extractClassify(food),
      wastePercent: typeof food.wastePercent === "number" ? food.wastePercent : null,
    },
    mode
  );
  const inserted = insertIntoDish(rows, meal, dish, [row]);
  // Dọn dòng giữ chỗ rỗng của đúng món này.
  return inserted.filter((r) => !(r.meal === meal && r.dish === dish && !r.foodId));
}

// Thêm cả một món (công thức RNI) vào bữa: bung các nguyên liệu có dữ liệu thành dòng.
export function addDishRecipe(
  rows: Row[],
  meal: string,
  dishName: string,
  ingredients: MenuDishIngredient[],
  mode: RationMode = "menu"
): { rows: Row[]; added: number; skipped: number } {
  const eligible = ingredients.filter((ing) => ing.food);
  if (!eligible.length) return { rows, added: 0, skipped: ingredients.length };
  const newRows = eligible.map((ing) => {
    const food = ing.food!;
    const cleanGrams = typeof ing.quantityG === "number" && ing.quantityG > 0 ? ing.quantityG : 100;
    const row = makeRow(
      meal,
      dishName,
      {
        id: food.id,
        name: food.name,
        nutrients: extractNutrients(food),
        classify: extractClassify(food),
        wastePercent: typeof food.wastePercent === "number" ? food.wastePercent : null,
      },
      mode
    );
    return { ...row, grams: cleanGrams, inputGrams: cleanGrams, inputBasis: "edible" as const, conversionFactor: 1, note: `Từ công thức: ${dishName}` };
  });
  const inserted = insertIntoDish(rows, meal, dishName, newRows).filter(
    (r) => !(r.meal === meal && r.dish === UNASSIGNED_DISH && !r.foodId)
  );
  return { rows: inserted, added: eligible.length, skipped: ingredients.length - eligible.length };
}

export { mealOrder };
