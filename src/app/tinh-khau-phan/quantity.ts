/**
 * Quy đổi khối lượng cho hai chế độ nhập khẩu phần.
 *
 * Chất dinh dưỡng trong CSDL luôn tính trên 100 g phần ăn được, vì vậy
 * `edibleGrams` là giá trị chuẩn dùng cho mọi phép tính dinh dưỡng.
 */

export type RationMode = "recall24h" | "menu";
export type QuantityBasis = "edible" | "raw";

export type QuantityInput = {
  grams: number;
  basis: QuantityBasis;
  conversionFactor?: number | null;
  wastePercent?: number | null;
};

export type QuantityResult = {
  inputGrams: number;
  conversionFactor: number;
  wastePercent: number | null;
  edibleGrams: number | null;
  rawGrams: number | null;
  conversionAvailable: boolean;
};

export function basisForMode(mode: RationMode): QuantityBasis {
  return mode === "recall24h" ? "edible" : "raw";
}

export function isValidWastePercent(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 100;
}

function nonNegative(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function validFactor(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * `grams` là lượng người dùng nhập; `conversionFactor` đổi lượng đó về gram.
 * Nếu thiếu tỷ lệ thải bỏ, giữ trạng thái thiếu dữ liệu (`wastePercent: null`)
 * nhưng dùng quy đổi thao tác mặc định 1:1. Nhờ đó người dùng vẫn nhập được
 * khẩu phần; báo cáo/UI sẽ ghi rõ đây không phải tỷ lệ thải bỏ đã xác minh.
 */
export function calculateQuantity(input: QuantityInput): QuantityResult {
  const conversionFactor = validFactor(input.conversionFactor);
  const inputGrams = nonNegative(input.grams);
  const convertedGrams = inputGrams * conversionFactor;
  const wastePercent = isValidWastePercent(input.wastePercent) ? input.wastePercent : null;
  const effectiveWastePercent = wastePercent ?? 0;

  if (input.basis === "edible") {
    return {
      inputGrams,
      conversionFactor,
      wastePercent,
      edibleGrams: convertedGrams,
      rawGrams: convertedGrams / (1 - effectiveWastePercent / 100),
      conversionAvailable: true,
    };
  }

  return {
    inputGrams,
    conversionFactor,
    wastePercent,
    edibleGrams: convertedGrams * (1 - effectiveWastePercent / 100),
    rawGrams: convertedGrams,
    conversionAvailable: true,
  };
}
