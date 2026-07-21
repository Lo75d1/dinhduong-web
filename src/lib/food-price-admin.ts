// Helper phía server cho API biên tập giá tham khảo (dùng chung 2 route
// prices/route.ts và prices/[priceId]/route.ts). Tách khỏi route.ts để không
// export ngoài HTTP handler.
import { basisNeedsPackWeight, isPriceBasis, isPriceRegion } from "@/lib/food-price";

export const priceSelect = {
  id: true, region: true, amountVnd: true, basis: true, packG: true,
  source: true, sourceUrl: true, note: true, asOfDate: true, createdAt: true, updatedAt: true,
} as const;

export type ParsedPrice = {
  region: string | null;
  amountVnd: number;
  basis: string;
  packG: number | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  asOfDate: Date | null;
};

// Đọc + kiểm tra 1 payload giá. Trả { error } nếu không hợp lệ; không đoán dữ liệu.
export function parsePrice(
  values: Record<string, unknown> | undefined
): { data: ParsedPrice } | { error: string } {
  const v = values ?? {};
  const amount = typeof v.amountVnd === "number" ? v.amountVnd : Number(v.amountVnd);
  if (!Number.isFinite(amount) || amount < 0) return { error: "Giá (VND) không hợp lệ." };
  if (!isPriceBasis(v.basis)) return { error: "Đơn vị tính giá không hợp lệ." };
  const region = v.region === "" || v.region == null ? null : isPriceRegion(v.region) ? v.region : undefined;
  if (region === undefined) return { error: "Vùng miền không hợp lệ." };
  let packG: number | null = null;
  if (v.packG !== "" && v.packG != null) {
    const p = typeof v.packG === "number" ? v.packG : Number(v.packG);
    packG = Number.isFinite(p) && p > 0 ? p : null;
  }
  if (basisNeedsPackWeight(v.basis) && packG === null)
    return { error: "Giá theo cái/gói phải nhập khối lượng 1 đơn vị (g)." };
  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
  let asOfDate: Date | null = null;
  if (typeof v.asOfDate === "string" && v.asOfDate.trim()) {
    const d = new Date(v.asOfDate);
    asOfDate = Number.isNaN(d.getTime()) ? null : d;
  }
  return {
    data: {
      region, amountVnd: amount, basis: v.basis, packG,
      source: text(v.source, 200), sourceUrl: text(v.sourceUrl, 2000),
      note: text(v.note, 500), asOfDate,
    },
  };
}
