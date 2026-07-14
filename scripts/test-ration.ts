import assert from "node:assert/strict";
import { basisForMode, calculateQuantity } from "../src/app/tinh-khau-phan/quantity";

function equal(actual: number | null, expected: number | null, message: string) {
  assert.equal(actual, expected, message);
}

assert.equal(basisForMode("recall24h"), "edible");
assert.equal(basisForMode("menu"), "raw");

const fromEdible = calculateQuantity({ grams: 100, basis: "edible", wastePercent: 50 });
equal(fromEdible.edibleGrams, 100, "100 g ăn được phải giữ nguyên");
equal(fromEdible.rawGrams, 200, "50% thải bỏ: 100 g ăn được tương ứng 200 g nguyên liệu");

const fromRaw = calculateQuantity({ grams: 200, basis: "raw", wastePercent: 50 });
equal(fromRaw.rawGrams, 200, "200 g nguyên liệu phải giữ nguyên");
equal(fromRaw.edibleGrams, 100, "50% thải bỏ: 200 g nguyên liệu còn 100 g ăn được");

const withFactor = calculateQuantity({ grams: 2, basis: "edible", conversionFactor: 75, wastePercent: 0 });
equal(withFactor.edibleGrams, 150, "hệ số quy đổi phải áp dụng trước khi tính");
equal(withFactor.rawGrams, 150, "0% thải bỏ không làm thay đổi khối lượng");

const missingWaste = calculateQuantity({ grams: 100, basis: "raw", wastePercent: null });
equal(missingWaste.edibleGrams, null, "thiếu tỷ lệ thải bỏ không được suy đoán phần ăn được");
assert.equal(missingWaste.conversionAvailable, false);

const invalidWaste = calculateQuantity({ grams: 100, basis: "edible", wastePercent: 100 });
equal(invalidWaste.rawGrams, null, "100% thải bỏ là dữ liệu không hợp lệ để quy đổi");

console.log("Quantity conversion checks passed.");
