import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { normalizeVi } from "../src/lib/normalize.js";

// The RNI dish ingredient sheet provides only name, quantity and kcal/100 g
// for these rows. Materialize that source data as clearly labelled Food rows so
// formula ingredients are linked without inventing P/L/G or micronutrients.
const APPLY = process.argv.includes("--apply");
const SOURCE_NOTE = "RNI — nguyên liệu công thức món; nguồn chỉ có năng lượng /100g, chưa có P/L/G và vi chất.";

type Pending = { name: string; energyKcal: number; ingredientIds: string[] };

async function main() {
  const ingredients = await prisma.dishIngredient.findMany({
    where: { foodId: null },
    select: { id: true, foodNameRaw: true, energyKcalRaw: true },
  });
  const grouped = new Map<string, Pending>();
  for (const ingredient of ingredients) {
    if (ingredient.energyKcalRaw === null) throw new Error(`Thiếu năng lượng: ${ingredient.foodNameRaw}`);
    const key = `${normalizeVi(ingredient.foodNameRaw)}|${ingredient.energyKcalRaw}`;
    const current = grouped.get(key);
    if (current) current.ingredientIds.push(ingredient.id);
    else grouped.set(key, { name: ingredient.foodNameRaw, energyKcal: ingredient.energyKcalRaw, ingredientIds: [ingredient.id] });
  }

  console.log(`Nguyên liệu chưa liên kết: ${ingredients.length}`);
  console.log(`Bản ghi Food nguồn RNI cần tạo: ${grouped.size}`);
  console.log("Các bản ghi mới sẽ để trống foodType/foodGroup và ghi rõ chỉ có kcal từ nguồn.");
  if (!APPLY) {
    console.log("Dry run only. Use --apply to create source-labelled Foods and link their ingredients.");
    return;
  }

  let foodsCreated = 0;
  let ingredientsLinked = 0;
  for (const item of grouped.values()) {
    const existing = await prisma.food.findFirst({
      where: { name: item.name, source: "RNI", sourceNote: SOURCE_NOTE, energyKcal: item.energyKcal },
      select: { id: true },
    });
    const food = existing ?? await prisma.food.create({
      data: {
        name: item.name,
        nameNormalized: normalizeVi(item.name),
        source: "RNI",
        sourceNote: SOURCE_NOTE,
        unit: "g",
        energyKcal: item.energyKcal,
      },
      select: { id: true },
    });
    if (!existing) foodsCreated++;
    const result = await prisma.dishIngredient.updateMany({ where: { id: { in: item.ingredientIds }, foodId: null }, data: { foodId: food.id } });
    ingredientsLinked += result.count;
  }
  console.log(`Đã tạo ${foodsCreated} Food có ghi nguồn và liên kết ${ingredientsLinked} nguyên liệu.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
