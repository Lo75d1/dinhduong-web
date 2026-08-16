import assert from "node:assert/strict";
import { buildKitchenShoppingList } from "../src/lib/kitchen-menu-snapshot";

const result = buildKitchenShoppingList("m1", "lunch", [{ id: "i1", dietTypeId: "regular", dishName: "Cá kho", snapshotJson: { dishes: [{ dish: "Cá kho", foods: [{ foodId: "fish", foodName: "Cá lóc", gramsPerServing: 80, wastePercent: 20 }, { foodId: "salt", foodName: "Muối", gramsPerServing: 2, wastePercent: null }] }] } }], [{ mealTypeId: "lunch", dietTypeId: "regular", quantity: 10 }, { mealTypeId: "lunch", dietTypeId: "regular", quantity: 5 }, { mealTypeId: "lunch", dietTypeId: "diabetic", quantity: 2 }]);
assert.equal(result.items.find((item) => item.foodId === "fish")?.edibleGrams, 1200);
assert.equal(result.items.find((item) => item.foodId === "fish")?.rawGrams, 1500);
assert.equal(result.items.find((item) => item.foodId === "salt")?.rawGrams, null);
assert.ok(result.incomplete.some((item) => item.reason.includes("chưa có thực đơn")));
assert.ok(result.incomplete.some((item) => item.reason.includes("thải bỏ")));
console.log("PASS kitchen menu snapshot × suất toàn viện");
