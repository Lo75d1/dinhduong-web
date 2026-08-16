export type MealLabelGroup = {
  key: string;
  department: string;
  mealType: string;
  dietType: string;
  quantity: number;
};

type MealLabelOrder = {
  id: string;
  status: string;
  department: { name: string };
  mealType: { name: string };
  items: Array<{ id: string; quantity: number; dietType: { name: string } }>;
};

export function buildMealLabelGroups(orders: MealLabelOrder[]) {
  return orders
    .filter((order) => ["SUBMITTED", "LOCKED"].includes(order.status))
    .flatMap((order) => order.items.flatMap((item) => {
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      return [{
        key: `${order.id}-${item.id}`,
        department: order.department.name,
        mealType: order.mealType.name,
        dietType: item.dietType.name,
        quantity,
      }];
    }));
}

export function expandMealLabels(groups: MealLabelGroup[]) {
  return groups.flatMap((group) =>
    Array.from({ length: group.quantity }, (_, index) => ({ ...group, index })),
  );
}
