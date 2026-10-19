import type { MenuInput, MenuRowInput } from "@/lib/nutrition-chat/contracts";
import type { NutritionMedicationLine, NutritionReportMeta } from "@/lib/nutrition-chat/workbook-report";
import type { MenuDay } from "./multi-day";
import type { Profile } from "./PersonalProfile";
import type { RationMode, Row } from "./types";
import type { NutritionReportContext } from "@/lib/nutrition-chat/workbook-context";

export function webReportDietCode(multiDay: boolean): string | undefined {
  try { return window.localStorage.getItem(multiDay ? "khauphan_menu_dietcode_v1" : "khauphan_dietcode_v1") || undefined; } catch { return undefined; }
}

export function webRowFoodSource(row: Pick<Row, "foodId" | "foodName" | "nutrients" | "wastePercent">): Pick<MenuRowInput, "foodId" | "customFood"> {
  if (!row.foodId.startsWith("local-")) return { foodId: row.foodId };
  return { customFood: { id: row.foodId, name: row.foodName, source: { kind: "user", label: "Số liệu do người dùng tự nhập trên website", confirmed: true }, basis: "100g", wastePercent: row.wastePercent, nutrients: { ...row.nutrients } } };
}

export function selectNutritionDay(input: MenuInput, dayId: string): MenuInput {
  const day = input.days.find(item => item.id === dayId);
  if (!day) throw new Error("Ngày đã chọn không còn trong thực đơn. Chọn lại ngày muốn xuất.");
  return structuredClone({ ...input, days: [day] });
}

export function webNutritionReportInput(days: MenuDay[], profile: Profile | null, mode: RationMode = "menu"): MenuInput {
  const usableProfile = profile && /^\d+(?:[.,]\d+)?$/.test(profile.age);
  return {
    title: mode === "recall24h" ? "Khẩu phần 24 giờ" : days.length === 1 ? "Thực đơn một ngày" : `Thực đơn ${days.length} ngày`,
    mode,
    days: days.map((day, dayIndex) => ({ id: `web-day-${dayIndex + 1}`, label: day.label || `Ngày ${dayIndex + 1}`, date: day.date || "", rows: day.rows.filter(row => row.foodId).map((row, index) => {
      const factor = row.conversionFactor > 0 ? row.conversionFactor : 1;
      const raw = row.inputBasis === "raw";
      return {
        id: `web-row-${dayIndex + 1}-${index + 1}`, meal: row.meal || "Chưa đặt tên bữa", dish: row.dish || row.foodName,
        ...webRowFoodSource(row), quantity: raw ? row.inputGrams * factor : row.inputGrams, unit: "g" as const, servings: 1,
        basis: raw ? "raw" as const : factor !== 1 ? "cooked" as const : "edible" as const,
        ...(factor !== 1 && !raw ? { conversionFactor: factor, conversionSource: "Hệ số do người dùng nhập trên website" } : {}),
        recipeSource: { kind: "user" as const, label: "Thực đơn do người dùng nhập trên website" },
        ...(row.note || factor !== 1 ? { note: [row.note, factor !== 1 ? `Lượng nhập trên web: ${row.inputGrams} g; hệ số: ${factor}.${raw ? " Cột lượng trong Excel đã nhân hệ số trước khi trừ thải bỏ." : ""}` : ""].filter(Boolean).join(" ") } : {}),
      };
    }) })),
    comparison: { mode: usableProfile ? "profile" : "none" },
    ...(usableProfile ? { profile: { ...profile, age: (profile.age ?? "").replace(",", "."), height: (profile.height ?? "").replace(",", "."), weight: (profile.weight ?? "").replace(",", "."), pregnancyWeek: (profile.pregnancyWeek ?? "").replace(",", "."), prePregnancyWeight: (profile.prePregnancyWeight ?? "").replace(",", ".") } } : {}),
  };
}

export type NutritionExcelDownloadOptions = { mode?: RationMode; meta?: NutritionReportMeta; medications?: NutritionMedicationLine[]; saveToAccount?: boolean; reportContext?: NutritionReportContext };

export function nutritionExcelFilename(input: MenuInput) {
  const scope = input.days.length === 1 ? [input.days[0].label, input.days[0].date].filter(Boolean).join("-") : `${input.days.length}-ngay`;
  const safe = scope.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "ngay";
  return `${input.mode === "menu" ? "thuc-don" : "khau-phan"}-${safe}.xlsx`;
}

export async function downloadNutritionExcel(days: MenuDay[], profile: Profile | null, options: NutritionExcelDownloadOptions = {}) {
  const input = webNutritionReportInput(days, profile, options.mode);
  const missing = days.flatMap(day => day.rows.filter(row => !row.foodId && row.dish).map(row => `${day.label} / ${row.meal} / ${row.dish}`));
  const meta = { ...options.meta, menuNote: [options.meta?.menuNote, missing.length ? `Món chưa nhập thực phẩm: ${[...new Set(missing)].join("; ")}` : ""].filter(Boolean).join(". ") };
  const reportContext = options.reportContext ?? { dietCodeId: webReportDietCode(false) };
  return downloadNutritionInputExcel(input, { ...options, meta, reportContext });
}

/** Keep linked menu IDs, source metadata, units and servings when exporting a day. */
export async function downloadNutritionInputExcel(input: MenuInput, options: NutritionExcelDownloadOptions = {}) {
  const meta = options.meta ?? {};
  const reportContext = options.reportContext ?? {};
  const response = await fetch("/api/nutrition-report/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, meta, medications: options.medications ?? [], saveToAccount: options.saveToAccount === true, reportContext }) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.message === "string" ? error.message : "Chưa xuất được Excel. Vui lòng thử lại.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = nutritionExcelFilename(input); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const saved = response.headers.get("X-Nutrition-Saved-Url");
  if (!saved) return null;
  const savedUrl = new URL(saved, window.location.origin);
  if (savedUrl.origin !== window.location.origin || !/^\/ket-noi-ai\/ban-luu\/[A-Za-z0-9_-]{1,100}$/.test(savedUrl.pathname) || savedUrl.search || savedUrl.hash) throw new Error("Đã tải file nhưng link bản lưu chưa hợp lệ. Mở mục Thực đơn đã lưu trong tài khoản.");
  return savedUrl.href;
}
