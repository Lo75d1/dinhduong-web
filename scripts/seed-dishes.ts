// Seed `dishes` + `dish_ingredients` from D:\datanutrition\Món ăn của RNI.xlsx
//   Sheet 1 "Danh sach mon an"     — 7369 dishes
//   Sheet 2 "Chi tiet nguyen lieu" — 41446 ingredient rows
//
// VDD's "Món ăn" file is NOT used here — it has no ingredient breakdown and
// was already imported into `foods` (foodType=MA) by seed-foods.ts.
// See ../README-data.md #5 for why categoryRaw/diseaseDiet/ageGroup are split.

import "dotenv/config";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/prisma.js";
import { normalizeVi } from "../src/lib/normalize.js";

const MONAN_RNI_PATH = "D:\\datanutrition\\Món ăn của RNI.xlsx";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim();
}
function boolish(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toUpperCase();
  return s === "TRUE" || s === "1";
}

const DISEASE_LABELS: Record<string, string> = {
  "Món ăn cho người bệnh đái tháo đường": "Đái tháo đường",
  "Món ăn cho người bệnh suy thận": "Suy thận",
  "Món ăn cho người bệnh tăng huyết áp": "Tăng huyết áp",
  "Món ăn cho người bệnh ung thư": "Ung thư",
};
const AGE_PATTERN = /(\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?\s*(?:tháng|tuổi)|\d+(?:[.,]\d+)?\s*(?:tháng|tuổi))/i;

function deriveDisease(categoryRaw: string | null): string | null {
  if (!categoryRaw) return null;
  return DISEASE_LABELS[categoryRaw] ?? null;
}
function deriveAgeGroup(categoryRaw: string | null): string | null {
  if (!categoryRaw) return null;
  const m = categoryRaw.match(AGE_PATTERN);
  return m ? m[0].trim() : null;
}

async function main() {
  console.log("Reading Món ăn của RNI.xlsx...");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(MONAN_RNI_PATH);
  const wsDishes = wb.worksheets[0]; // Danh sach mon an
  const wsIngredients = wb.worksheets[1]; // Chi tiet nguyen lieu

  console.log(`  dishes sheet: ${wsDishes.rowCount - 1} rows`);
  console.log(`  ingredients sheet: ${wsIngredients.rowCount - 1} rows`);

  console.log("Clearing existing RNI dishes...");
  await prisma.dishIngredient.deleteMany({});
  await prisma.dish.deleteMany({});

  // ---- 1. dishes ----
  type DishRow = {
    sourceCode: string;
    name: string;
    totalWeightG: number | null;
    servingUnit: string | null;
    categoryRaw: string | null;
    diseaseDiet: string | null;
    ageGroup: string | null;
    cookingSteps: string | null;
    isActive: boolean;
  };
  const dishRows: DishRow[] = [];
  for (let r = 2; r <= wsDishes.rowCount; r++) {
    const g = (c: number) => wsDishes.getRow(r).getCell(c).value;
    const sourceCode = str(g(1));
    if (!sourceCode) continue;
    const categoryRaw = str(g(9));
    dishRows.push({
      sourceCode,
      name: str(g(2)) ?? "(không tên)",
      totalWeightG: num(g(7)),
      servingUnit: str(g(8)),
      categoryRaw,
      diseaseDiet: deriveDisease(categoryRaw),
      ageGroup: deriveAgeGroup(categoryRaw),
      cookingSteps: str(g(10)),
      isActive: boolish(g(11)),
    });
  }
  console.log(`Inserting ${dishRows.length} dishes...`);
  const DISH_BATCH = 1000;
  for (let i = 0; i < dishRows.length; i += DISH_BATCH) {
    const batch = dishRows.slice(i, i + DISH_BATCH).map((d) => ({
      sourceCode: d.sourceCode,
      name: d.name,
      nameNormalized: normalizeVi(d.name),
      source: "RNI",
      totalWeightG: d.totalWeightG,
      servingUnit: d.servingUnit,
      categoryRaw: d.categoryRaw,
      diseaseDiet: d.diseaseDiet,
      ageGroup: d.ageGroup,
      cookingSteps: d.cookingSteps,
      isActive: d.isActive,
    }));
    await prisma.dish.createMany({ data: batch });
    console.log(`  ${Math.min(i + DISH_BATCH, dishRows.length)}/${dishRows.length}`);
  }

  // build sourceCode -> generated id map
  console.log("Building sourceCode -> id map...");
  const allDishes = await prisma.dish.findMany({
    select: { id: true, sourceCode: true },
    where: { source: "RNI" },
  });
  const idByCode = new Map<string, string>();
  for (const d of allDishes) {
    if (d.sourceCode) idByCode.set(d.sourceCode, d.id);
  }
  console.log(`  ${idByCode.size} dishes mapped`);

  // ---- 2. ingredients ----
  type IngRow = {
    dishId: string;
    foodNameRaw: string;
    quantityG: number | null;
    sortOrder: number;
    energyKcalRaw: number | null;
  };
  const ingRows: IngRow[] = [];
  const sortCounter = new Map<string, number>();
  let skippedNoMatch = 0;
  for (let r = 2; r <= wsIngredients.rowCount; r++) {
    const g = (c: number) => wsIngredients.getRow(r).getCell(c).value;
    const dishCode = str(g(1));
    if (!dishCode) continue;
    const dishId = idByCode.get(dishCode);
    if (!dishId) {
      skippedNoMatch++;
      continue;
    }
    const order = (sortCounter.get(dishId) ?? 0) + 1;
    sortCounter.set(dishId, order);
    ingRows.push({
      dishId,
      foodNameRaw: str(g(4)) ?? "(không tên)",
      quantityG: num(g(6)),
      sortOrder: order,
      energyKcalRaw: num(g(8)),
    });
  }
  if (skippedNoMatch) console.log(`  WARNING: ${skippedNoMatch} ingredient rows had no matching dish (skipped)`);

  console.log(`Inserting ${ingRows.length} ingredient rows...`);
  const ING_BATCH = 1000;
  for (let i = 0; i < ingRows.length; i += ING_BATCH) {
    const batch = ingRows.slice(i, i + ING_BATCH);
    await prisma.dishIngredient.createMany({ data: batch });
    console.log(`  ${Math.min(i + ING_BATCH, ingRows.length)}/${ingRows.length}`);
  }

  const dishCount = await prisma.dish.count();
  const ingCount = await prisma.dishIngredient.count();
  console.log(`Done. dishes=${dishCount}, dish_ingredients=${ingCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
