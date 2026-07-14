import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import type { Prisma } from "../src/generated/prisma/client.js";

/**
 * Read-only audit for the reference data. It deliberately contains no create,
 * update, delete, or seed operation.
 */
async function main() {
  const foodCount = (where: Prisma.FoodWhereInput) =>
    prisma.food.count({ where });

  const [
    foodAnyMacroMissing,
    foodEnergyMissing,
    foodAllMacroMissing,
    foodInvalid,
    dishWithoutIngredients,
    ingredientFoodMissing,
    ingredientQtyMissing,
    ingredientEnergyMissing,
    dishWeightMissing,
    recommendations,
    dietCodes,
    aliases,
    aliasesUnverified,
  ] = await Promise.all([
    foodCount({ OR: [{ energyKcal: null }, { proteinG: null }, { lipidG: null }, { glucidG: null }] }),
    foodCount({ energyKcal: null }),
    foodCount({ energyKcal: null, proteinG: null, lipidG: null, glucidG: null }),
    foodCount({ OR: [{ energyKcal: { lt: 0 } }, { proteinG: { lt: 0 } }, { lipidG: { lt: 0 } }, { glucidG: { lt: 0 } }] }),
    prisma.dish.count({ where: { ingredients: { none: {} } } }),
    prisma.dishIngredient.count({ where: { foodId: null } }),
    prisma.dishIngredient.count({ where: { quantityG: null } }),
    prisma.dishIngredient.count({ where: { energyKcalRaw: null } }),
    prisma.dish.count({ where: { totalWeightG: null } }),
    prisma.nutritionRecommendation.count(),
    prisma.dietCode.count(),
    prisma.foodAlias.count(),
    prisma.foodAlias.count({ where: { verified: false } }),
  ]);

  console.log("=== Completeness ===");
  console.table({
    "Food thiếu ít nhất 1 macro": foodAnyMacroMissing,
    "Food thiếu năng lượng": foodEnergyMissing,
    "Food thiếu toàn bộ macro": foodAllMacroMissing,
    "Food có macro âm": foodInvalid,
    "Món không có nguyên liệu": dishWithoutIngredients,
    "Nguyên liệu chưa liên kết Food": ingredientFoodMissing,
    "Nguyên liệu thiếu khối lượng": ingredientQtyMissing,
    "Nguyên liệu thiếu kcal/100g": ingredientEnergyMissing,
    "Món thiếu tổng khối lượng": dishWeightMissing,
  });

  console.log("\n=== Reference tables ===");
  console.table({
    "Khuyến nghị dinh dưỡng": recommendations,
    "Mã chế độ ăn": dietCodes,
    "Tên gọi khác": aliases,
    "Tên gọi khác chưa kiểm duyệt": aliasesUnverified,
  });

  console.log("\n=== Food group coverage ===");
  console.table(await prisma.food.groupBy({ by: ["foodGroup"], _count: true, orderBy: { _count: { foodGroup: "desc" } } }));
  console.log("\n=== Food type coverage ===");
  console.table(await prisma.food.groupBy({ by: ["foodType"], _count: true, orderBy: { _count: { foodType: "desc" } } }));
  console.log("\n=== Dish disease labels ===");
  console.table(await prisma.dish.groupBy({ by: ["diseaseDiet"], _count: true, orderBy: { _count: { diseaseDiet: "desc" } } }));
  console.log("\n=== Recommendation genders ===");
  console.table(await prisma.nutritionRecommendation.groupBy({ by: ["gender"], _count: true }));

  const macroMissingWhere = { OR: [{ energyKcal: null }, { proteinG: null }, { lipidG: null }, { glucidG: null }] };
  console.log("\n=== Food thiếu macro, theo nguồn ===");
  console.table(await prisma.food.groupBy({ by: ["source"], where: macroMissingWhere, _count: true }));
  console.log("\n=== Food chưa có nhóm, theo nguồn ===");
  console.table(await prisma.food.groupBy({ by: ["source"], where: { foodGroup: null }, _count: true }));

  console.log("\n=== Bản ghi macro âm (cần xác minh nguồn) ===");
  console.table(await prisma.food.findMany({
    where: { OR: [{ energyKcal: { lt: 0 } }, { proteinG: { lt: 0 } }, { lipidG: { lt: 0 } }, { glucidG: { lt: 0 } }] },
    select: { id: true, name: true, source: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true },
  }));
  console.log("\n=== Món không có nguyên liệu (cần đối chiếu file gốc) ===");
  console.table(await prisma.dish.findMany({
    where: { ingredients: { none: {} } },
    select: { id: true, name: true, sourceCode: true, categoryRaw: true, totalWeightG: true },
  }));
  console.log("\n=== Mẫu nguyên liệu chưa liên kết Food ===");
  console.table(await prisma.dishIngredient.findMany({
    where: { foodId: null }, take: 20,
    select: { foodNameRaw: true, quantityG: true, energyKcalRaw: true, dish: { select: { name: true } } },
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
