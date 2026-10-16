import { EMPTY_CLASSIFY } from "@/lib/food-classify";
import { savedCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";
import { genId, type Row } from "./types";

export type SavedRationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  conversationRevision: number;
  openUrl?: string;
  patient: { id: string; name: string } | null;
  _count: { items: number };
};
export type LegacySavedItem = {
  foodId: string | null;
  meal: string;
  dish: string;
  foodName: string;
  edibleGrams: unknown;
  inputGrams: unknown;
  inputBasis: string;
  conversionFactor: unknown;
  wastePercent: unknown;
  note: string | null;
  nutrientsJson: Record<string, number | null> | null;
  classifyJson: Record<string, string | number | null> | null;
};
export type LegacySavedRation = { conversationRevision?: number; items: LegacySavedItem[]; profileJson?: unknown };
type RationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export class SavedRationLoadError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
const num = (value: unknown, fallback = 0) => {
  if (value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

/** A typed multi-day snapshot must stay in the normalized calculator, never Row[]. */
export function normalizedRationOpenUrl(item: Pick<SavedRationSummary, "id" | "conversationRevision">) {
  return item.conversationRevision > 0 ? savedCalculatorUrl(item.id) : null;
}

/** Accept only this record's known route, including the old guard during a rolling update. */
export function rationConflictOpenUrl(status: number, payload: unknown, id: string) {
  if (status !== 409 || !payload || typeof payload !== "object") return null;
  const openUrl = (payload as { openUrl?: unknown }).openUrl;
  const target = savedCalculatorUrl(id);
  return openUrl === target || openUrl === `/ket-noi-ai/ban-luu/${id}` ? target : null;
}

export function legacyRationRows(ration: LegacySavedRation): Row[] {
  if ((ration.conversationRevision ?? 0) > 0 || !Array.isArray(ration.items)) throw new Error("Bản này cần được mở bằng đường dẫn thực đơn đầy đủ.");
  return ration.items.map(item => {
    const waste = item.wastePercent == null ? null : num(item.wastePercent, NaN);
    const factor = num(item.conversionFactor, 1);
    return {
      uid: genId(), meal: item.meal || "(Chưa phân bữa)", dish: item.dish || "(Chưa phân món)",
      foodId: item.foodId || "", foodName: item.foodName || "", grams: num(item.edibleGrams),
      inputGrams: num(item.inputGrams, num(item.edibleGrams)), inputBasis: item.inputBasis === "raw" ? "raw" : "edible",
      conversionFactor: factor > 0 ? factor : 1, wastePercent: waste != null && Number.isFinite(waste) ? waste : null,
      note: item.note || "", nutrients: item.nutrientsJson ?? {}, classify: { ...EMPTY_CLASSIFY, ...(item.classifyJson ?? {}) } as Row["classify"],
    };
  });
}

/** Restore all related state together; absent profile must clear the previous patient. */
export function loadLegacyRationIntoStorage(ration: LegacySavedRation, storage: RationStorage) {
  const rows = legacyRationRows(ration);
  const changes: [string, string | null][] = [
    ["khauphan_rows_v1", JSON.stringify(rows)],
    ["khauphan_mode_v1", rows.some(row => row.inputBasis === "raw") ? "menu" : "recall24h"],
    ["khauphan_profile_v1", ration.profileJson && typeof ration.profileJson === "object" && !Array.isArray(ration.profileJson) ? JSON.stringify(ration.profileJson) : null],
    ["khauphan_pagemode_v1", "single"],
  ];
  const before = changes.map(([key]) => [key, storage.getItem(key)] as const);
  try {
    for (const [key, value] of changes) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
  } catch {
    for (const [key, value] of before) {
      try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* Best effort if the browser blocks storage entirely. */ }
    }
    throw new Error("Trình duyệt chưa cho lưu bản mở lại. Kiểm tra dung lượng hoặc quyền lưu của trình duyệt rồi thử lại.");
  }
  return rows;
}

/** Shared by the legacy deep link and the calculator's saved-menu picker. */
export async function restoreLegacyRationFromServer(id: string, storage: RationStorage, request: typeof fetch = fetch, signal?: AbortSignal) {
  savedCalculatorUrl(id); // Validate before creating an endpoint URL.
  const response = await request(`/api/rations/${encodeURIComponent(id)}`, { cache: "no-store", signal });
  const data = await response.json();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const redirectUrl = rationConflictOpenUrl(response.status, data, id);
  if (redirectUrl) return { kind: "normalized" as const, openUrl: redirectUrl };
  if (!response.ok) throw new SavedRationLoadError(typeof data.error === "string" ? data.error : "Không thể mở thực đơn.", response.status);
  if (!data.ration) throw new SavedRationLoadError("Chưa đọc được dữ liệu thực đơn.", 502);
  loadLegacyRationIntoStorage(data.ration, storage);
  return { kind: "legacy" as const, openUrl: "/tinh-khau-phan" };
}
