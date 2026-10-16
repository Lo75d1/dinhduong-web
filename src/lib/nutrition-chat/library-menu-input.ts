import type { CustomFoodInput, MenuInput, MenuRowInput, ResolvedMenu } from "./contracts";

/** The library API already checks ownership and stamps food IDs with revision.
 * Keep that snapshot intact when handing it to the shared calculator editor. */
export function libraryMenuInput(kind?: "food" | "dish", item?: { content: CustomFoodInput | MenuInput; preview?: ResolvedMenu }) {
  let rows: MenuRowInput[] = [];
  let names: Record<string, string> = {};
  if (kind === "dish" && item) {
    const recipe = item.content as MenuInput;
    rows = structuredClone(recipe.days[0].rows);
    names = Object.fromEntries(item.preview?.days[0].rows.map(row => [row.id, row.food.name]) ?? []);
  } else if (kind === "food" && item) {
    const food = structuredClone(item.content as CustomFoodInput);
    rows = [{ id: "personal-food", meal: "Bữa mới", dish: food.name, customFood: food, quantity: food.basis === "portion" ? food.portionAmount ?? null : 100, unit: food.basis === "100ml" ? "ml" : food.basis === "portion" ? food.portionUnit ?? "g" : "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Thực phẩm từ thư viện cá nhân" } }];
    names = { "personal-food": food.name };
  }
  const input: MenuInput = { title: "Thực đơn mới", mode: "menu", comparison: { mode: "none" }, days: [{ id: "day-1", date: "", label: "Ngày 1", rows }] };
  return { input, names };
}
