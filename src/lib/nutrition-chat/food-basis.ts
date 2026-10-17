import type { NutritionFood } from "./contracts";

export const VDD_BASIS_NOTICE = "Món VDD nguyên món chưa xác minh số liệu ứng với 100 g hay một phần; đơn vị g không xác nhận mẫu số dinh dưỡng. Không nhân theo gram hoặc coi là một suất. Tra công thức RNI tương ứng và trình nguyên liệu/lượng để người dùng duyệt; nếu không có, làm rõ công thức có nguồn hoặc giữ phần này chưa tính.";

/** This catalogue has no verified reference weight for VDD prepared dishes.
 * Missing ingredients and missing nutrient denominator are separate facts.
 * Do not turn the calculator's historic /100 convention into source evidence.
 */
export function nutritionFoodBasis(food: Pick<NutritionFood, "source" | "foodType" | "unit">): NonNullable<NutritionFood["nutrientBasis"]> {
  if (food.source.kind === "catalog" && food.source.label === "VDD" && food.foodType === "MA") {
    return { status: "unverified", amount: null, unit: food.unit, note: VDD_BASIS_NOTICE };
  }
  return { status: "per100", amount: 100, unit: food.unit, note: `Các giá trị nutrients theo 100 ${food.unit} của nguồn đang dùng, không phải một suất ăn. Lượng thực ăn và số suất phải được xác nhận riêng; trạng thái sống/chín không suy từ mẫu số này.` };
}
