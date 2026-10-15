import type { MenuInput } from "@/lib/nutrition-chat/contracts";
import type { NutritionMedicationLine, NutritionReportMeta } from "@/lib/nutrition-chat/workbook-report";
import type { MenuDay } from "./multi-day";
import type { Profile } from "./PersonalProfile";
import type { RationMode } from "./types";

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
        foodId: row.foodId, quantity: raw ? row.inputGrams * factor : row.inputGrams, unit: "g" as const, servings: 1,
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

export async function downloadNutritionExcel(days: MenuDay[], profile: Profile | null, options: { mode?: RationMode; meta?: NutritionReportMeta; medications?: NutritionMedicationLine[] } = {}) {
  const input = webNutritionReportInput(days, profile, options.mode);
  const missing = days.flatMap(day => day.rows.filter(row => !row.foodId && row.dish).map(row => `${day.label} / ${row.meal} / ${row.dish}`));
  const meta = { ...options.meta, menuNote: [options.meta?.menuNote, missing.length ? `Món chưa nhập thực phẩm: ${[...new Set(missing)].join("; ")}` : ""].filter(Boolean).join(". ") };
  const response = await fetch("/api/nutrition-report/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, meta, medications: options.medications ?? [] }) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.message === "string" ? error.message : "Chưa xuất được Excel. Vui lòng thử lại.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = "bao-cao-dinh-duong.xlsx"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
