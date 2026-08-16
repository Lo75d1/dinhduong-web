import assert from "node:assert/strict";
import { buildKitchenShoppingList } from "../src/lib/kitchen-shopping";

const result = buildKitchenShoppingList("menu-1", "lunch", [{
  id: "item-1",
  dietTypeId: "normal",
  dishId: "dish-1",
  dishName: "Cá kho",
  servingWeightG: 200,
  dish: {
    totalWeightG: 400,
    ingredients: [
      { foodNameRaw: "Cá", quantityG: 300, food: { id: "fish", name: "Cá tươi", wastePercent: 20 } },
      { foodNameRaw: "Nước mắm", quantityG: 20, food: { id: "sauce", name: "Nước mắm", wastePercent: 0 } },
    ],
  },
}], [
  { mealTypeId: "lunch", dietTypeId: "normal", quantity: 10 },
  { mealTypeId: "lunch", dietTypeId: "normal", quantity: 5 },
  { mealTypeId: "dinner", dietTypeId: "normal", quantity: 99 },
]);

assert.equal(result.servingsByDiet.normal, 15);
assert.equal(result.items.find((item) => item.foodId === "fish")?.edibleGrams, 2250);
assert.equal(result.items.find((item) => item.foodId === "fish")?.rawGrams, 2812.5);
assert.equal(result.items.find((item) => item.foodId === "sauce")?.edibleGrams, 150);
assert.deepEqual(result.incomplete, []);

const incomplete = buildKitchenShoppingList("menu-2", "lunch", [{
  id: "item-2", dietTypeId: "normal", dishId: null, dishName: "Món cũ", servingWeightG: null, dish: null,
}], [{ mealTypeId: "lunch", dietTypeId: "normal", quantity: 1 }]);
assert.equal(incomplete.items.length, 0);
assert.equal(incomplete.incomplete.length, 1);

console.log("Kitchen shopping list tests passed.");
