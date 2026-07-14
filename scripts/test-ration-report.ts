import assert from "node:assert/strict";
import { buildReportLines } from "../src/app/tinh-khau-phan/ration-detail";
import type { Row } from "../src/app/tinh-khau-phan/types";

const common = {
  meal: "Trưa", dish: "Canh", foodId: "food", foodName: "Rau", inputGrams: 100, inputBasis: "edible" as const,
  conversionFactor: 1, wastePercent: 0, note: "", classify: { foodGroup: null, proteinOrigin: null, giLevel: null, purinLevel: null, cholesterolLevel: null },
  nutrients: { energyKcal: 20, proteinG: 2 },
};
const rows: Row[] = [{ ...common, uid: "a", grams: 100 }, { ...common, uid: "b", foodName: "Cà rốt", grams: 50, inputGrams: 50 }];
const fields = [{ key: "energyKcal", label: "Năng lượng", unit: "kcal" }, { key: "proteinG", label: "Đạm", unit: "g" }];
const lines = buildReportLines(rows, fields, {});
assert.deepEqual(lines.map((line) => line.kind), ["food", "food", "dish", "meal", "day"]);
assert.equal(lines.at(-1)?.values.energyKcal.total, 30);
assert.equal(lines.at(-1)?.values.proteinG.total, 3);
console.log("Ration report checks passed.");
