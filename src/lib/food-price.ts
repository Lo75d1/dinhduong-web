// Giá tham khảo của thực phẩm — hằng số + kiểm tra + quy đổi ra VND/gram.
// NGUYÊN TẮC: giá CHỈ tham khảo (không phải số liệu chính thống như dinh dưỡng),
// luôn kèm nguồn/vùng/ngày; không suy diễn giá thiếu → thiếu thì trả null.

export const PRICE_REGIONS = ["Bắc", "Trung", "Nam"] as const;
export type PriceRegion = (typeof PRICE_REGIONS)[number];

export const PRICE_BASES = ["per_kg", "per_100g", "per_piece", "per_pack"] as const;
export type PriceBasis = (typeof PRICE_BASES)[number];

export const PRICE_BASIS_LABEL: Record<PriceBasis, string> = {
  per_kg: "theo kg",
  per_100g: "theo 100 g",
  per_piece: "theo cái / quả",
  per_pack: "theo gói / hộp",
};

export const PRICE_REGION_LABEL: Record<PriceRegion, string> = {
  Bắc: "Miền Bắc",
  Trung: "Miền Trung",
  Nam: "Miền Nam",
};

export type FoodPriceInput = {
  region: string | null;
  amountVnd: number;
  basis: string;
  packG: number | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  asOfDate: string | null; // ISO date, hoặc null
};

export function isPriceBasis(value: unknown): value is PriceBasis {
  return typeof value === "string" && (PRICE_BASES as readonly string[]).includes(value);
}

export function isPriceRegion(value: unknown): value is PriceRegion {
  return typeof value === "string" && (PRICE_REGIONS as readonly string[]).includes(value);
}

/** basis theo đơn vị đếm (cái/gói) cần biết khối lượng 1 đơn vị mới quy đổi được. */
export function basisNeedsPackWeight(basis: string): boolean {
  return basis === "per_piece" || basis === "per_pack";
}

/**
 * VND cho mỗi gram KHỐI LƯỢNG MUA (chưa trừ thải bỏ). Trả null nếu không đủ dữ
 * liệu để quy đổi (vd tính theo cái/gói mà thiếu packG). KHÔNG đoán.
 */
export function vndPerPurchasedGram(price: {
  amountVnd: number;
  basis: string;
  packG: number | null;
}): number | null {
  const { amountVnd, basis, packG } = price;
  if (!Number.isFinite(amountVnd) || amountVnd < 0) return null;
  switch (basis) {
    case "per_kg":
      return amountVnd / 1000;
    case "per_100g":
      return amountVnd / 100;
    case "per_piece":
    case "per_pack":
      return typeof packG === "number" && packG > 0 ? amountVnd / packG : null;
    default:
      return null;
  }
}

/**
 * Chi phí (VND) cho `edibleGrams` gram phần ĂN ĐƯỢC. Giá tính trên khối lượng
 * MUA nên phải cộng lại phần thải bỏ: muaGram = ănĐượcGram / (1 - waste/100).
 * Trả null nếu không quy đổi được — không cộng thiếu thành số giả.
 */
export function costForEdibleGrams(
  price: { amountVnd: number; basis: string; packG: number | null },
  edibleGrams: number,
  wastePercent: number | null
): number | null {
  const perPurchased = vndPerPurchasedGram(price);
  if (perPurchased === null || !Number.isFinite(edibleGrams) || edibleGrams < 0) return null;
  const waste = typeof wastePercent === "number" && wastePercent > 0 && wastePercent < 100 ? wastePercent : 0;
  const purchasedGrams = edibleGrams / (1 - waste / 100);
  return perPurchased * purchasedGrams;
}

const VND = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function formatVnd(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : VND.format(Math.round(value));
}
