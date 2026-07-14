import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const foodCount = await prisma.food.count();
  const dishCount = await prisma.dish.count();
  const ingCount = await prisma.dishIngredient.count();
  console.log({ foodCount, dishCount, ingCount });

  const byFoodType = await prisma.food.groupBy({ by: ["foodType"], _count: true });
  console.log("foodType:", byFoodType);

  const bySource = await prisma.food.groupBy({ by: ["source"], _count: true });
  console.log("source:", bySource);

  const byDisease = await prisma.dish.groupBy({ by: ["diseaseDiet"], _count: true });
  console.log("diseaseDiet:", byDisease);

  const sampleDish = await prisma.dish.findFirst({
    where: { diseaseDiet: "Đái tháo đường" },
    include: { ingredients: true },
  });
  console.log("sample diabetic dish:", JSON.stringify(sampleDish, null, 2).slice(0, 1500));

  const sampleFood = await prisma.food.findFirst({ where: { name: { contains: "Sữa bò tươi" } } });
  console.log("sample food (Sữa bò tươi):", JSON.stringify(sampleFood, null, 2).slice(0, 800));

  const ageSamples = await prisma.dish.findMany({
    where: { ageGroup: { not: null } },
    select: { categoryRaw: true, ageGroup: true },
    take: 5,
  });
  console.log("age samples:", ageSamples);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
