import { prisma } from "../src/lib/prisma";

async function main() {
  const fish = await prisma.food.create({
    data: {
      name: "Cá tươi M2 nghiệm thu",
      nameNormalized: "ca tuoi m2 nghiem thu",
      source: "TEST",
      wastePercent: 20,
    },
  });
  const sauce = await prisma.food.create({
    data: {
      name: "Nước mắm M2 nghiệm thu",
      nameNormalized: "nuoc mam m2 nghiem thu",
      source: "TEST",
      wastePercent: null,
    },
  });
  const completeDish = await prisma.dish.create({
    data: {
      name: "Cá kho cấu trúc M2",
      nameNormalized: "ca kho cau truc m2",
      source: "TEST",
      sourceCode: "M2-COMPLETE",
      totalWeightG: 400,
      servingUnit: "suất",
      ingredients: {
        create: [
          { foodNameRaw: fish.name, foodId: fish.id, quantityG: 300, sortOrder: 0 },
          { foodNameRaw: sauce.name, foodId: sauce.id, quantityG: 20, sortOrder: 1 },
        ],
      },
    },
  });
  const incompleteDish = await prisma.dish.create({
    data: {
      name: "Canh thiếu liên kết M2",
      nameNormalized: "canh thieu lien ket m2",
      source: "TEST",
      sourceCode: "M2-INCOMPLETE",
      totalWeightG: 300,
      servingUnit: "suất",
      ingredients: {
        create: [
          { foodNameRaw: "Rau chưa nối kho M2", foodId: null, quantityG: 50, sortOrder: 0 },
          { foodNameRaw: "Gia vị thiếu gram M2", foodId: sauce.id, quantityG: null, sortOrder: 1 },
        ],
      },
    },
  });
  const lunch = await prisma.mealType.create({
    data: {
      code: "TEST-TRUA-M2",
      name: "Bữa trưa DRAFT M2",
      serviceLocalTime: "11:30",
      cutoffLocalTime: "23:59",
      cutoffDaysBefore: 0,
      sortOrder: 2,
    },
  });

  console.log(JSON.stringify({
    completeDishId: completeDish.id,
    incompleteDishId: incompleteDish.id,
    fishId: fish.id,
    sauceId: sauce.id,
    lunchMealTypeId: lunch.id,
  }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
