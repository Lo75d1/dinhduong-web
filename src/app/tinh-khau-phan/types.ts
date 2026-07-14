// Cấu trúc nhập liệu: Bữa ăn → Món ăn → Thực phẩm (mirror gg script cũ)
// rows phẳng + gom cây lúc render — tránh cập nhật state lồng sâu.

import { EMPTY_CLASSIFY, type Classify } from "@/lib/food-classify";
import { basisForMode, calculateQuantity, type QuantityBasis, type RationMode } from "./quantity";

export type { QuantityBasis, RationMode } from "./quantity";

export type Row = {
  uid: string;
  meal: string;
  dish: string;
  foodId: string; // rỗng nếu là dòng "món trống, chưa có thực phẩm"
  foodName: string;
  // Khối lượng ăn được chuẩn hóa (g), luôn là đầu vào cho phép tính dinh dưỡng.
  grams: number;
  // Dữ liệu người dùng đã nhập, phục vụ hai chế độ khẩu phần/thực đơn.
  inputGrams: number;
  inputBasis: QuantityBasis;
  conversionFactor: number;
  // Snapshot tỷ lệ thải bỏ lúc chọn thực phẩm; null nghĩa là chưa có dữ liệu quy đổi.
  wastePercent: number | null;
  note: string;
  // snapshot dinh dưỡng/100g lúc thêm (CORE_CALC_FIELDS) — tránh phải gọi lại API để tính tổng
  nutrients: Record<string, number | null>;
  // snapshot phân loại (foodGroup/proteinOrigin/giLevel/purinLevel/cholesterolLevel) — dùng
  // cho các biểu đồ "nhóm C", độ phủ thấp (xem README-data.md mục 10)
  classify: Classify;
};

export type DishNode = { dish: string; rows: Row[] };
export type MealNode = { meal: string; dishes: DishNode[] };

const LS_KEY = "khauphan_rows_v1";
const MODE_LS_KEY = "khauphan_mode_v1";

export function loadRationMode(): RationMode {
  if (typeof window === "undefined") return "recall24h";
  try {
    return window.localStorage.getItem(MODE_LS_KEY) === "menu" ? "menu" : "recall24h";
  } catch {
    return "recall24h";
  }
}

export function saveRationMode(mode: RationMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_LS_KEY, mode);
  } catch {
    // localStorage đầy hoặc bị chặn — không chặn UI
  }
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function makeRow(
  meal: string,
  dish: string,
  food?: {
    id: string;
    name: string;
    nutrients?: Record<string, number | null>;
    classify?: Classify;
    wastePercent?: number | null;
  } | null,
  mode: RationMode = "recall24h"
): Row {
  const inputBasis = basisForMode(mode);
  const wastePercent =
    typeof food?.wastePercent === "number" && Number.isFinite(food.wastePercent) ? food.wastePercent : null;
  const quantity = calculateQuantity({ grams: 100, basis: inputBasis, wastePercent });
  return {
    uid: genId(),
    meal,
    dish,
    foodId: food ? food.id : "",
    foodName: food ? food.name : "",
    grams: quantity.edibleGrams ?? (food ? 0 : 100),
    inputGrams: 100,
    inputBasis,
    conversionFactor: 1,
    wastePercent,
    note: "",
    nutrients: food?.nutrients ?? {},
    classify: food?.classify ?? EMPTY_CLASSIFY,
  };
}

export function loadRows(): Row[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Row[];
    // Rows cũ chỉ có `grams`; xem chúng như lượng ăn được để giữ nguyên kết quả cũ.
    return parsed.map((r) => ({
      ...r,
      inputGrams: typeof r.inputGrams === "number" ? r.inputGrams : r.grams,
      inputBasis: r.inputBasis === "raw" ? "raw" : "edible",
      conversionFactor: typeof r.conversionFactor === "number" && r.conversionFactor > 0 ? r.conversionFactor : 1,
      wastePercent: typeof r.wastePercent === "number" ? r.wastePercent : null,
      classify: r.classify ?? EMPTY_CLASSIFY,
    }));
  } catch {
    return [];
  }
}

export function saveRows(rows: Row[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    // localStorage đầy hoặc bị chặn — bỏ qua, không chặn UI
  }
}

function normalizeMealName(value: string) {
  return value.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
}

/** Thứ tự đọc khẩu phần chuẩn: sáng → phụ sáng → trưa → phụ chiều → tối → phụ tối. */
export function mealOrder(value: string): number {
  const name = normalizeMealName(value);
  if (name.includes("phu sang")) return 20;
  if (name.includes("sang")) return 10;
  if (name.includes("phu chieu")) return 40;
  if (name.includes("trua")) return 30;
  if (name.includes("phu toi")) return 60;
  if (name.includes("toi")) return 50;
  return 100;
}

// Gom rows phẳng thành cây Bữa > Món > dòng thực phẩm, sau đó sắp bữa theo thứ tự lâm sàng.
export function buildTree(rows: Row[]): MealNode[] {
  const tree: MealNode[] = [];
  for (const r of rows) {
    let m = tree.find((x) => x.meal === r.meal);
    if (!m) {
      m = { meal: r.meal, dishes: [] };
      tree.push(m);
    }
    let d = m.dishes.find((x) => x.dish === r.dish);
    if (!d) {
      d = { dish: r.dish, rows: [] };
      m.dishes.push(d);
    }
    if (r.foodId) d.rows.push(r);
  }
  return tree.sort((a, b) => mealOrder(a.meal) - mealOrder(b.meal));
}
