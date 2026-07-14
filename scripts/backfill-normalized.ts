import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { normalizeVi } from "../src/lib/normalize.js";

async function backfillFoods() {
  const foods = await prisma.food.findMany({ select: { id: true, name: true } });
  console.log(`Backfilling ${foods.length} foods...`);
  const BATCH = 50;
  for (let i = 0; i < foods.length; i += BATCH) {
    const batch = foods.slice(i, i + BATCH);
    await Promise.all(
      batch.map((f) =>
        prisma.food.update({ where: { id: f.id }, data: { nameNormalized: normalizeVi(f.name) } })
      )
    );
    if ((i / BATCH) % 20 === 0) console.log(`  ${Math.min(i + BATCH, foods.length)}/${foods.length}`);
  }
}

async function backfillDishes() {
  const dishes = await prisma.dish.findMany({ select: { id: true, name: true } });
  console.log(`Backfilling ${dishes.length} dishes...`);
  const BATCH = 50;
  for (let i = 0; i < dishes.length; i += BATCH) {
    const batch = dishes.slice(i, i + BATCH);
    await Promise.all(
      batch.map((d) =>
        prisma.dish.update({ where: { id: d.id }, data: { nameNormalized: normalizeVi(d.name) } })
      )
    );
    if ((i / BATCH) % 20 === 0) console.log(`  ${Math.min(i + BATCH, dishes.length)}/${dishes.length}`);
  }
}

async function main() {
  await backfillFoods();
  await backfillDishes();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
