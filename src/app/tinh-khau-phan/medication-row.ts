// Dòng thuốc/TPBS trong khẩu phần — tách hoàn toàn khỏi Row (thực phẩm) để
// KHÔNG lẫn vào tính dinh dưỡng (thuốc không có nutrients/kcal). Chỉ hiển thị
// theo từng bữa ăn để bác sĩ/người nhập hình dung lịch uống thuốc kèm/không
// kèm bữa ăn, giống cách Nhà thuốc Long Châu mô tả cách dùng trên trang sản phẩm.
import { genId } from "./types";

export type MedicationTiming = "kem" | "khong-kem" | "";

export type MedicationRow = {
  uid: string;
  meals: string[]; // tên các bữa áp dụng — một thuốc có thể uống vào nhiều bữa
  name: string;
  timing: MedicationTiming;
  note: string; // ghi chú đơn thuốc: liều dùng, cách dùng, lưu ý...
};

const LS_KEY = "khauphan_meds_v1";

export function loadMedicationRows(): MedicationRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MedicationRow[];
    return parsed.map((m) => ({
      uid: m.uid,
      meals: Array.isArray(m.meals) ? m.meals : [],
      name: m.name ?? "",
      timing: m.timing === "kem" || m.timing === "khong-kem" ? m.timing : "",
      note: m.note ?? "",
    }));
  } catch {
    return [];
  }
}

export function saveMedicationRows(rows: MedicationRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    // localStorage đầy hoặc bị chặn — bỏ qua, không chặn UI
  }
}

export function makeMedicationRow(meals: string[], name: string, timing: MedicationTiming, note: string): MedicationRow {
  return { uid: genId(), meals, name, timing, note };
}
