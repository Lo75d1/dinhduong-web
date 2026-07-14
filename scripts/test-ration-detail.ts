import assert from "node:assert/strict";
import { aggregateIngredients, buildDetailRows } from "../src/app/tinh-khau-phan/ration-detail";
import type { Row } from "../src/app/tinh-khau-phan/types";

const base = {
  meal: "Trưa", dish: "Cơm", foodId: "rice", foodName: "Gạo", inputBasis: "edible" as const,
  conversionFactor: 1, wastePercent: 50, note: "", classify: { foodGroup: null, proteinOrigin: null, giLevel: null, purinLevel: null, cholesterolLevel: null },
  nutrients: { energyKcal: 100, proteinG: 2, lipidG: 1, glucidG: 20 },
};
const rows: Row[] = [
  { ...base, uid: "one", grams: 100, inputGrams: 100 },
  { ...base, uid: "two", grams: 50, inputGrams: 50 },
];
const details = buildDetailRows(rows);
assert.equal(details[0].energyKcal, 100);
assert.equal(details[1].rawGrams, 100);
const total = aggregateIngredients(details)[0];
assert.equal(total.edibleGrams, 150);
assert.equal(total.rawGrams, 300);
console.log("Ration detail checks passed.");
