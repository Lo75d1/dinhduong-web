import assert from "node:assert/strict";
import { buildMealLabelGroups, expandMealLabels } from "../src/lib/meal-labels";

const orders = [
  { id: "a", status: "SUBMITTED", department: { name: "Khoa Nội" }, mealType: { name: "Bữa trưa" }, items: [
    { id: "a1", quantity: 2, dietType: { name: "Cơm thường" } },
    { id: "a2", quantity: 3, dietType: { name: "ĐTĐ" } },
  ] },
  { id: "b", status: "LOCKED", department: { name: "Khoa Ngoại" }, mealType: { name: "Bữa trưa" }, items: [
    { id: "b1", quantity: 4, dietType: { name: "Cơm thường" } },
  ] },
  { id: "c", status: "CANCELLED", department: { name: "Khoa Cũ" }, mealType: { name: "Bữa trưa" }, items: [
    { id: "c1", quantity: 99, dietType: { name: "Không in" } },
  ] },
];

const groups = buildMealLabelGroups(orders);
assert.deepEqual(groups.map((group) => group.quantity), [2, 3, 4]);
const labels = expandMealLabels(groups);
assert.equal(labels.length, 9);
assert.equal(labels[0].department, "Khoa Nội");
assert.equal(labels[8].department, "Khoa Ngoại");
console.log("Meal label aggregation tests passed.");
