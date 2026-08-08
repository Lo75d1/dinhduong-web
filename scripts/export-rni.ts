// Xuất dữ liệu RNI (foods nguồn RNI + toàn bộ dishes/nguyên liệu) để làm bản offline.
// Chạy: node --env-file=.env node_modules/.bin/tsx scripts/export-rni.ts   (hoặc npx tsx --env-file=.env ...)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "node:fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const mode = process.argv[2] ?? "count";

async function main() {
  const rniFoods = await prisma.food.count({ where: { source: "RNI" } });
  const vddFoods = await prisma.food.count({ where: { source: "VDD" } });
  const dishes = await prisma.dish.count();
  const ing = await prisma.dishIngredient.count();
  console.log(JSON.stringify({ rniFoods, vddFoods, dishes, dishIngredients: ing }));

  if (mode === "full") {
    const foods = await prisma.food.findMany({ where: { source: "RNI" }, orderBy: { name: "asc" } });
    const dishRows = await prisma.dish.findMany({ orderBy: { name: "asc" }, include: { ingredients: true } });
    const outDir = "D:/datanutrition/rni-offline";
    writeFileSync(`${outDir}/rni-foods.json`, JSON.stringify(foods, null, 0), "utf8");
    writeFileSync(`${outDir}/rni-dishes.json`, JSON.stringify(dishRows, null, 0), "utf8");
    console.log(JSON.stringify({ wroteFoods: foods.length, wroteDishes: dishRows.length, outDir }));
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
