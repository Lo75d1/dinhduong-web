import "dotenv/config";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/prisma.js";
import { normalizeVi } from "../src/lib/normalize.js";

const FILE = "D:\\datanutrition\\Món Ăn của RNI.xlsx";
const TYPES: Record<string, string> = {
  "19054": "SP",
  "19667": "TS",
  "19164": "SP",
  "16223": "SP",
  "16136": "SP",
  "16222": "SP",
  "16137": "SP",
};
const SOURCE_NOTE = "RNI — món có năng lượng/khẩu phần nhưng không có bảng nguyên liệu; kcal/100g quy đổi từ năng lượng và khối lượng nguồn.";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE);
  const sheet = workbook.worksheets[0];
  let created = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const code = String(row.getCell(1).value ?? "").trim();
    const foodType = TYPES[code];
    if (!foodType) continue;
    const dish = await prisma.dish.findFirst({ where: { sourceCode: code }, include: { ingredients: true } });
    if (!dish || dish.ingredients.length > 0) continue;
    const name = String(row.getCell(2).value ?? "").trim();
    const energyPerServing = asNumber(row.getCell(5).value);
    const weight = asNumber(row.getCell(7).value);
    if (!name || energyPerServing === null || weight === null) throw new Error(`Thiếu nguồn năng lượng/khối lượng cho mã ${code}`);
    const energyKcal = weight > 0 ? (energyPerServing / weight) * 100 : 0;
    const sourceCode = `dish-direct-${code}`;
    const existing = await prisma.food.findFirst({ where: { source: "RNI", sourceCode }, select: { id: true } });
    const food = existing ?? await prisma.food.create({
      data: {
        name,
        nameNormalized: normalizeVi(name),
        source: "RNI",
        sourceCode,
        sourceNote: SOURCE_NOTE,
        unit: "g",
        foodType,
        energyKcal,
      },
      select: { id: true },
    });
    await prisma.dishIngredient.create({
      data: {
        dishId: dish.id,
        foodId: food.id,
        foodNameRaw: name,
        quantityG: weight,
        energyKcalRaw: energyKcal,
        sortOrder: 1,
      },
    });
    if (!existing) created++;
    console.log(`+ ${code}: ${name} (${energyKcal.toFixed(3)} kcal/100g)`);
  }
  console.log(`Đã khôi phục ${created} món bằng năng lượng trực tiếp từ nguồn RNI.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
