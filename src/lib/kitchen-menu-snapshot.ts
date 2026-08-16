export type SnapshotFood = {
  foodId: string;
  foodName: string;
  gramsPerServing: number;
  wastePercent: number | null;
};

export type KitchenMenuSnapshot = {
  dishes: Array<{ dish: string; foods: SnapshotFood[] }>;
};

export type SnapshotMenuItem = {
  id: string;
  dietTypeId: string;
  dishName: string;
  snapshotJson: unknown;
};

export type MealQuantity = { mealTypeId: string; dietTypeId: string; quantity: number };

export function parseKitchenMenuSnapshot(value: unknown): KitchenMenuSnapshot | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { dishes?: unknown }).dishes)) return null;
  const dishes = (value as { dishes: unknown[] }).dishes.map((rawDish) => {
    if (!rawDish || typeof rawDish !== "object") return null;
    const dish = typeof (rawDish as { dish?: unknown }).dish === "string" ? (rawDish as { dish: string }).dish.trim() : "";
    const rawFoods = (rawDish as { foods?: unknown }).foods;
    if (!dish || !Array.isArray(rawFoods)) return null;
    const foods = rawFoods.map((rawFood) => {
      if (!rawFood || typeof rawFood !== "object") return null;
      const food = rawFood as Record<string, unknown>;
      const grams = Number(food.gramsPerServing);
      const waste = food.wastePercent == null ? null : Number(food.wastePercent);
      if (typeof food.foodId !== "string" || !food.foodId || typeof food.foodName !== "string" || !food.foodName.trim() || !Number.isFinite(grams) || grams <= 0) return null;
      return { foodId: food.foodId, foodName: food.foodName.trim(), gramsPerServing: grams, wastePercent: waste != null && Number.isFinite(waste) && waste >= 0 && waste < 100 ? waste : null };
    }).filter((food): food is SnapshotFood => food !== null);
    return { dish, foods };
  }).filter((dish): dish is KitchenMenuSnapshot["dishes"][number] => dish !== null);
  return dishes.length ? { dishes } : null;
}

export function buildKitchenShoppingList(
  menuId: string,
  mealTypeId: string,
  menuItems: SnapshotMenuItem[],
  quantities: MealQuantity[],
) {
  const servingsByDiet = new Map<string, number>();
  for (const row of quantities) {
    if (row.mealTypeId !== mealTypeId || !Number.isFinite(row.quantity) || row.quantity <= 0) continue;
    servingsByDiet.set(row.dietTypeId, (servingsByDiet.get(row.dietTypeId) ?? 0) + row.quantity);
  }
  const aggregate = new Map<string, { foodId: string; foodName: string; edibleGrams: number; rawGrams: number | null; wastePercent: number | null }>();
  const incomplete: Array<{ menuItemId: string; dishName: string; reason: string }> = [];
  for (const item of menuItems) {
    const servings = servingsByDiet.get(item.dietTypeId) ?? 0;
    if (!servings) continue;
    const snapshot = parseKitchenMenuSnapshot(item.snapshotJson);
    if (!snapshot) {
      incomplete.push({ menuItemId: item.id, dishName: item.dishName, reason: "Chế độ ăn chưa có bản chụp thực phẩm hợp lệ." });
      continue;
    }
    for (const dish of snapshot.dishes) {
      if (!dish.foods.length) incomplete.push({ menuItemId: item.id, dishName: dish.dish, reason: "Món chưa có thực phẩm/gram hợp lệ; không tính số mua." });
      for (const food of dish.foods) {
      const edible = food.gramsPerServing * servings;
      const current = aggregate.get(food.foodId) ?? { foodId: food.foodId, foodName: food.foodName, edibleGrams: 0, rawGrams: food.wastePercent == null ? null : 0, wastePercent: food.wastePercent };
      current.edibleGrams += edible;
      if (current.rawGrams != null && food.wastePercent != null) current.rawGrams += edible / (1 - food.wastePercent / 100);
      else current.rawGrams = null;
      aggregate.set(food.foodId, current);
      if (food.wastePercent == null) incomplete.push({ menuItemId: item.id, dishName: dish.dish, reason: `Thực phẩm “${food.foodName}” thiếu tỷ lệ thải bỏ; số mua để “—”.` });
      }
    }
  }
  const approvedDietIds = new Set(menuItems.map((item) => item.dietTypeId));
  for (const [dietTypeId, servings] of servingsByDiet) if (servings > 0 && !approvedDietIds.has(dietTypeId)) incomplete.push({ menuItemId: "", dishName: "Chế độ chưa duyệt", reason: "Có suất đã chốt nhưng chưa có thực đơn được duyệt; không tính số mua." });
  return { menuId, servingsByDiet: Object.fromEntries(servingsByDiet), items: [...aggregate.values()].sort((a, b) => b.edibleGrams - a.edibleGrams), incomplete };
}
