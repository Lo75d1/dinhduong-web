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
 * Nếu thiếu hoặc không hợp lệ tỷ lệ thải bỏ, không suy đoán khối lượng ở đầu
 * còn lại. Điều này tránh biến một giá trị thiếu dữ liệu thành 0% thải bỏ.
 */
export function calculateQuantity(input: QuantityInput): QuantityResult {
  const conversionFactor = validFactor(input.conversionFactor);
  const inputGrams = nonNegative(input.grams);
  const convertedGrams = inputGrams * conversionFactor;
  const wastePercent = isValidWastePercent(input.wastePercent) ? input.wastePercent : null;

  if (input.basis === "edible") {
    return {
      inputGrams,
      conversionFactor,
      wastePercent,
      edibleGrams: convertedGrams,
      rawGrams: wastePercent === null ? null : convertedGrams / (1 - wastePercent / 100),
      conversionAvailable: wastePercent !== null,
    };
  }

  return {
    inputGrams,
    conversionFactor,
    wastePercent,
    edibleGrams: wastePercent === null ? null : convertedGrams * (1 - wastePercent / 100),
    rawGrams: convertedGrams,
    conversionAvailable: wastePercent !== null,
  };
}
