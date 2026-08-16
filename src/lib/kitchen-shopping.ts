export type StructuredMenuItem = {
  id: string;
  dietTypeId: string;
  dishId: string | null;
  dishName: string;
  servingWeightG: number | null;
  dish: null | {
    totalWeightG: number | null;
    ingredients: Array<{
      foodNameRaw: string;
      quantityG: number | null;
      food: null | { id: string; name: string; wastePercent: number | null };
    }>;
  };
};

export type MealQuantity = { mealTypeId: string; dietTypeId: string; quantity: number };

export function buildKitchenShoppingList(
  menuId: string,
  mealTypeId: string,
  menuItems: StructuredMenuItem[],
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
    if (servings === 0) continue;
    if (!item.dishId || !item.dish) {
      incomplete.push({ menuItemId: item.id, dishName: item.dishName, reason: "Món chưa liên kết kho công thức." });
      continue;
    }
    if (!item.servingWeightG || item.servingWeightG <= 0 || !item.dish.totalWeightG || item.dish.totalWeightG <= 0) {
      incomplete.push({ menuItemId: item.id, dishName: item.dishName, reason: "Thiếu gram mỗi suất hoặc tổng khối lượng công thức." });
      continue;
    }
    const scale = item.servingWeightG / item.dish.totalWeightG;
    for (const ingredient of item.dish.ingredients) {
      if (!ingredient.food || !ingredient.quantityG || ingredient.quantityG <= 0) {
        incomplete.push({ menuItemId: item.id, dishName: item.dishName, reason: `Nguyên liệu “${ingredient.foodNameRaw}” chưa đủ liên kết/định lượng.` });
        continue;
      }
      const edible = ingredient.quantityG * scale * servings;
      const waste = typeof ingredient.food.wastePercent === "number" && ingredient.food.wastePercent >= 0 && ingredient.food.wastePercent < 100
        ? ingredient.food.wastePercent
        : null;
      const current = aggregate.get(ingredient.food.id) ?? {
        foodId: ingredient.food.id,
        foodName: ingredient.food.name,
        edibleGrams: 0,
        rawGrams: waste == null ? null : 0,
        wastePercent: waste,
      };
      current.edibleGrams += edible;
      if (current.rawGrams != null && waste != null) current.rawGrams += edible / (1 - waste / 100);
      else current.rawGrams = null;
      aggregate.set(ingredient.food.id, current);
    }
  }

  return {
    menuId,
    servingsByDiet: Object.fromEntries(servingsByDiet),
    items: [...aggregate.values()].sort((a, b) => b.edibleGrams - a.edibleGrams),
    incomplete,
  };
}
