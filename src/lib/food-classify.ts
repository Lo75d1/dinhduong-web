// Phân loại thực phẩm (foodGroup/proteinOrigin/giLevel/purinLevel/cholesterolLevel)
// dùng cho các biểu đồ "nhóm C" (độ phủ dữ liệu thấp — xem README-data.md mục 10).
// Palette categorical CVD-safe theo skill dataviz (references/palette.md), thứ tự cố định.
import { normalizeVi } from "./normalize";

export type Classify = {
  foodGroup: string | null;
  proteinOrigin: string | null;
  giLevel: number | null;
  purinLevel: number | null;
  cholesterolLevel: number | null;
};

export const CLASSIFY_SELECT_KEYS = [
  "foodGroup",
  "proteinOrigin",
  "giLevel",
  "purinLevel",
  "cholesterolLevel",
] as const;

export const EMPTY_CLASSIFY: Classify = {
  foodGroup: null,
  proteinOrigin: null,
  giLevel: null,
  purinLevel: null,
  cholesterolLevel: null,
};

// 8 slot categorical, thứ tự cố định — không cycle, không sinh hue mới cho mục thứ 9.
export const CATEGORICAL = {
  blue: "#2a78d6",
  aqua: "#1baf7a",
  yellow: "#eda100",
  green: "#008300",
  violet: "#4a3aa7",
  red: "#e34948",
  magenta: "#e87ba4",
  orange: "#eb6834",
} as const;

// Bucket "chưa phân loại/chưa phân nhóm" luôn dùng xám trung tính — không phải 1 category thật.
export const UNCLASSIFIED_COLOR = "#898781";

// Trạng thái mức độ (0-3): dùng status palette, không phải categorical — có ý nghĩa "nặng/nhẹ".
export const LEVEL_COLORS: Record<number, string> = {
  0: "#0ca30c", // good
  1: "#fab219", // warning
  2: "#ec835a", // serious
  3: "#d03b3b", // critical
};

// Thứ tự cố định các nhóm chuẩn VDD (xem scripts/seed-foods.ts NHOM_MAP + MONAN_GROUP_MAP,
// README-data.md mục 13) — chỉ 8 nhóm đầu có slot màu riêng, nhóm còn lại (nếu đủ lớn) gộp
// vào "Khác" giống RationCharts. "Món ăn hỗn hợp" xếp cao vì là nhóm lớn nhất (món ăn nhiều
// nguyên liệu không thể xếp 1 nhóm duy nhất — KHÁC "Chưa phân nhóm" (xám, nghĩa là thiếu dữ
// liệu, không phải "đã biết nhưng không xếp được").
export const FOOD_GROUP_ORDER: string[] = [
  "Nhóm lương thực",
  "Nhóm thịt các loại, cá và hải sản",
  "Món ăn hỗn hợp",
  "Nhóm rau củ quả khác",
  "Nhóm bánh kẹo, đồ ngọt",
  "Nhóm trứng và các sản phẩm từ trứng",
  "Nhóm sữa và các chế phẩm từ sữa",
  "Nhóm nước giải khát",
  "Nhóm hạt các loại",
  "Nhóm dầu ăn, mỡ các loại",
  "Gia vị",
];

// "Hỗn hợp" = món ăn có nhiều nguồn đạm (vd "Cơm sườn"), KHÁC "Chưa phân loại" (thiếu dữ
// liệu) — xem README-data.md mục 15, cùng nguyên tắc với "Món ăn hỗn hợp" của foodGroup.
export const PROTEIN_ORIGIN_ORDER: string[] = [
  "Thịt đỏ",
  "Thịt trắng",
  "Hỗn hợp",
  "Trứng sữa",
  "Thực vật",
  "Chế biến",
];

export const LIPID_ORIGIN_ORDER = ["Dầu / thực vật", "Mỡ / động vật"] as const;

const UNCLASSIFIED_GROUP = "Chưa phân nhóm";
const UNCLASSIFIED_ORIGIN = "Chưa phân loại";

export function foodGroupColor(name: string): string {
  const idx = FOOD_GROUP_ORDER.indexOf(name);
  const slots = Object.values(CATEGORICAL);
  return idx >= 0 && idx < slots.length ? slots[idx] : slots[slots.length - 1];
}

export function proteinOriginColor(name: string): string {
  const idx = PROTEIN_ORIGIN_ORDER.indexOf(name);
  const slots = Object.values(CATEGORICAL);
  return idx >= 0 ? slots[idx] : slots[slots.length - 1];
}

// Từ khóa suy luận nguồn gốc lipid theo TÊN món (không có trường gốc trong CSDL — 0% —
// mirror heuristic của app cũ getLipidOrigin, chỉ dùng để nhóm hiển thị, không suy ra số đo).
const PLANT_FAT_KW = ["dau an", "dau dua", "dau me", "dau nanh", "dau phong", "dau oliu", "bo thuc vat"];
const ANIMAL_FAT_KW = ["mo ", "mo lon", "bo ", "pho mai", "thit", "ca ", "trung", "hai san", "tom", "cua", "muc"];

export function guessLipidOrigin(name: string, foodGroup: string | null): string {
  const n = normalizeVi(name);
  const g = normalizeVi(foodGroup ?? "");
  if (PLANT_FAT_KW.some((kw) => n.includes(kw)) || g.includes("dau an") || g.includes("hat")) {
    return "Dầu / thực vật";
  }
  if (
    ANIMAL_FAT_KW.some((kw) => n.includes(kw)) ||
    g.includes("thit") ||
    g.includes("hai san") ||
    g.includes("trung") ||
    g.includes("sua")
  ) {
    return "Mỡ / động vật";
  }
  return UNCLASSIFIED_ORIGIN;
}

// Gộp nhóm thành top-K theo độ lớn + "Khác" + "Chưa phân loại/nhóm" riêng (không gộp chung
// với Khác vì khác ý nghĩa: Khác = nhóm thật nhưng nhỏ, Chưa phân loại = thiếu dữ liệu).
export function bucketTopK(
  entries: { key: string; value: number }[],
  k: number,
  unclassifiedLabel: string = UNCLASSIFIED_GROUP
): { key: string; value: number }[] {
  const known = entries.filter((e) => e.key !== unclassifiedLabel).sort((a, b) => b.value - a.value);
  const unclassified = entries.filter((e) => e.key === unclassifiedLabel);
  let top = known.slice(0, k);
  const rest = known.slice(k);
  if (rest.length > 0) {
    top = [...top, { key: "Khác", value: rest.reduce((s, e) => s + e.value, 0) }];
  }
  return [...top, ...unclassified];
}

export function bucketColor(key: string, kind: "foodGroup" | "proteinOrigin" | "lipidOrigin"): string {
  if (key === UNCLASSIFIED_GROUP || key === UNCLASSIFIED_ORIGIN) return UNCLASSIFIED_COLOR;
  if (key === "Khác") return UNCLASSIFIED_COLOR;
  if (kind === "foodGroup") return foodGroupColor(key);
  if (kind === "proteinOrigin") return proteinOriginColor(key);
  const idx = LIPID_ORIGIN_ORDER.indexOf(key as (typeof LIPID_ORIGIN_ORDER)[number]);
  return idx >= 0 ? Object.values(CATEGORICAL)[idx] : UNCLASSIFIED_COLOR;
}

// Trung bình mức độ (0-3) có trọng số theo gram, + % gram thực sự có số liệu (không suy diễn
// phần thiếu — coveragePct thấp phải hiển thị rõ, xem README-data.md mục 10).
export function weightedLevelStat(
  rows: { grams: number; level: number | null }[]
): { avg: number | null; coveragePct: number } {
  const totalGrams = rows.reduce((s, r) => s + r.grams, 0);
  const knownGrams = rows.filter((r) => r.level !== null).reduce((s, r) => s + r.grams, 0);
  if (totalGrams <= 0 || knownGrams <= 0) return { avg: null, coveragePct: 0 };
  const weightedSum = rows.reduce((s, r) => s + (r.level ?? 0) * (r.level !== null ? r.grams : 0), 0);
  return { avg: weightedSum / knownGrams, coveragePct: (knownGrams / totalGrams) * 100 };
}

export { UNCLASSIFIED_GROUP, UNCLASSIFIED_ORIGIN };
