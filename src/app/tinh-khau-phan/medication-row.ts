// Thuốc/TPBS được gắn vào MỘT bữa cụ thể, ở vị trí trước hoặc sau các món ăn.
// Chúng không phải thực phẩm và hoàn toàn không tham gia phép tính dinh dưỡng.
import { genId } from "./types";

export type MedicationTiming = "before" | "after" | "standalone" | "unspecified";

export type MedicationRow = {
  uid: string;
  meal: string;
  name: string;
  timing: MedicationTiming;
  dose: string;
  doseUnit: string;
  note: string;
};

type LegacyMedicationRow = Partial<MedicationRow> & {
  meals?: unknown;
  timing?: "kem" | "khong-kem" | MedicationTiming | "";
};

const LS_KEY = "khauphan_meds_v1";

export function medicationTimingLabel(timing: MedicationTiming) {
  if (timing === "before") return "Dùng trước bữa";
  if (timing === "after") return "Dùng sau bữa";
  if (timing === "standalone") return "Mốc riêng, không kèm bữa";
  return "Cần xác định vị trí";
}

export function loadMedicationRows(): MedicationRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyMedicationRow[];
    if (!Array.isArray(parsed)) return [];

    // Bản cũ cho phép một thuốc gắn nhiều bữa và chỉ ghi "kèm/không kèm".
    // Tách thành từng dòng theo bữa nhưng không tự suy đoán trước hay sau bữa.
    return parsed.flatMap((item) => {
      const meals = Array.isArray(item.meals)
        ? item.meals.filter((meal): meal is string => typeof meal === "string" && meal.trim().length > 0)
        : typeof item.meal === "string" && item.meal.trim() ? [item.meal] : [];
      const timing: MedicationTiming = item.timing === "before" || item.timing === "after" || item.timing === "standalone" || item.timing === "unspecified" ? item.timing : "unspecified";
      return meals.map((meal, index) => ({
        uid: index === 0 && typeof item.uid === "string" && item.uid ? item.uid : genId(),
        meal,
        name: typeof item.name === "string" ? item.name : "",
        timing,
        dose: typeof item.dose === "string" ? item.dose : "",
        doseUnit: typeof item.doseUnit === "string" ? item.doseUnit : "",
        note: typeof item.note === "string" ? item.note : "",
      }));
    }).filter((item) => item.name.trim());
  } catch {
    return [];
  }
}

export function saveMedicationRows(rows: MedicationRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    // localStorage đầy hoặc bị chặn — không chặn việc nhập khẩu phần.
  }
}

export function makeMedicationRow(meal: string, name: string, timing: MedicationTiming, dose: string, doseUnit: string, note: string): MedicationRow {
  return { uid: genId(), meal, name, timing, dose, doseUnit, note };
}
