// Chế độ "Thực đơn nhiều ngày" (phục vụ bếp): nhiều ngày, mỗi ngày là một khẩu
// phần độc lập (tái dùng đúng cấu trúc `Row` của chế độ một ngày). Mỗi bữa trong
// ngày là một khối riêng để bếp can thiệp lẻ. Lưu localStorage trước; đồng bộ
// server để sau (CSDL đang kẹt drift, xem PROJECT_STATUS.md).

import { EMPTY_CLASSIFY } from "@/lib/food-classify";
import { buildTree, genId, mealOrder, type MealNode, type Row } from "./types";

export type MenuDay = {
  id: string;
  label: string; // "Ngày 1", có thể đổi tên
  date: string; // yyyy-mm-dd hoặc "" nếu chưa gán lịch
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
  return { id: genId(), label: `Ngày ${index + 1}`, date: "", rows: [] };
}

// Nhân bản một ngày: cấp uid mới cho mọi dòng để không đụng dữ liệu ngày gốc.
export function duplicateDay(day: MenuDay, index: number): MenuDay {
  return {
    id: genId(),
    label: `Ngày ${index + 1}`,
    date: "",
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

export { mealOrder };
