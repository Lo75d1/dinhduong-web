// Seed 3 bảng tham chiếu từ file mẫu gg script (dữ liệu THẬT, không phải template rỗng):
//   D:\datanutrition\gg script dinhduong by claude\Webdinhduong\dataweb_chuan-1.xlsx
//   - Sheet "KhuyenNghi"  (72 dòng) -> NutritionRecommendation
//   - Sheet "MCDA"        (246 dòng) -> DietCode
//   - Sheet "ChuanTreEm"  (40 dòng) -> ChildGrowthStandard

import "dotenv/config";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/prisma.js";

const SRC_PATH =
  "D:\\datanutrition\\gg script dinhduong by claude\\Webdinhduong\\dataweb_chuan-1.xlsx";

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

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC_PATH);

  // ---- KhuyenNghi ----
  {
    const ws = wb.getWorksheet("KhuyenNghi")!;
    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const g = (c: number) => ws.getRow(r).getCell(c).value;
      const ageGroup = str(g(2));
      if (!ageGroup) continue;
      rows.push({
        stt: num(g(1)) ? Math.round(num(g(1))!) : null,
        ageGroup,
        gender: str(g(3)) ?? "",
        energyKcal: num(g(4)),
        referenceWeightKg: num(g(5)),
        physicalActivity: str(g(6)),
        proteinMinPct: num(g(7)),
        proteinMaxPct: num(g(8)),
        lipidMinPct: num(g(9)),
        lipidMaxPct: num(g(10)),
        glucidMinPct: num(g(11)),
        glucidMaxPct: num(g(12)),
        vitA: num(g(13)),
        vitAType: str(g(14)),
        vitD: num(g(15)),
        vitDType: str(g(16)),
        vitE: num(g(17)),
        vitEType: str(g(18)),
        vitK: num(g(19)),
        vitKType: str(g(20)),
        vitB1: num(g(21)),
        vitB1Type: str(g(22)),
        vitB2: num(g(23)),
        vitB2Type: str(g(24)),
        vitB3: num(g(25)),
        vitB3Type: str(g(26)),
        vitB5: num(g(27)),
        vitB5Type: str(g(28)),
        vitB6: num(g(29)),
        vitB6Type: str(g(30)),
        vitB9: num(g(31)),
        vitB9Type: str(g(32)),
        vitB12: num(g(33)),
        vitB12Type: str(g(34)),
        vitC: num(g(35)),
        vitCType: str(g(36)),
        calcium: num(g(37)),
        calciumType: str(g(38)),
        iron: num(g(39)),
        ironType: str(g(40)),
        zinc: num(g(41)),
        zincType: str(g(42)),
        magnesium: num(g(43)),
        magnesiumType: str(g(44)),
        iodine: num(g(45)),
        iodineType: str(g(46)),
        phosphorus: num(g(47)),
        phosphorusType: str(g(48)),
        fiber: num(g(49)),
        fiberType: str(g(50)),
        water: num(g(51)),
        waterType: str(g(52)),
        sodium: num(g(53)),
        sodiumType: str(g(54)),
        potassium: num(g(55)),
        potassiumType: str(g(56)),
        chloride: num(g(57)),
        chlorideType: str(g(58)),
      });
    }
    console.log(`KhuyenNghi: ${rows.length} rows`);
    await prisma.nutritionRecommendation.deleteMany({});
    await prisma.nutritionRecommendation.createMany({ data: rows });
  }

  // ---- MCDA ----
  {
    const ws = wb.getWorksheet("MCDA")!;
    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const g = (c: number) => ws.getRow(r).getCell(c).value;
      const code = str(g(1));
      if (!code) continue;
      rows.push({
        code,
        targetGroup: str(g(2)) ?? "",
        diseaseGroup: str(g(3)) ?? "",
        name: str(g(4)) ?? "",
        energyMinKcal: num(g(5)),
        energyMaxKcal: num(g(6)),
        proteinMinG: num(g(7)),
        proteinMaxG: num(g(8)),
        lipidMinG: num(g(9)),
        lipidMaxG: num(g(10)),
        glucidMinG: num(g(11)),
        glucidMaxG: num(g(12)),
        sodiumMinMg: num(g(13)),
        sodiumMaxMg: num(g(14)),
        potassiumMinMg: num(g(15)),
        potassiumMaxMg: num(g(16)),
        waterMinMl: num(g(17)),
        waterMaxMl: num(g(18)),
        mealsMin: num(g(19)),
        mealsMax: num(g(20)),
        note: str(g(21)),
      });
    }
    console.log(`MCDA: ${rows.length} rows`);
    await prisma.dietCode.deleteMany({});
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      await prisma.dietCode.createMany({ data: rows.slice(i, i + BATCH) });
    }
  }

  // ---- ChuanTreEm ----
  {
    const ws = wb.getWorksheet("ChuanTreEm")!;
    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const g = (c: number) => ws.getRow(r).getCell(c).value;
      const ageMonths = num(g(3));
      const gender = str(g(1));
      if (ageMonths === null || !gender) continue;
      rows.push({
        gender,
        ageYears: num(g(2)),
        ageMonths,
        weightM3sd: num(g(4)),
        weightM2sd: num(g(5)),
        weightAvg: num(g(6)),
        weightP2sd: num(g(7)),
        weightP3sd: num(g(8)),
        heightM3sd: num(g(9)),
        heightM2sd: num(g(10)),
        heightAvg: num(g(11)),
        heightP2sd: num(g(12)),
        heightP3sd: num(g(13)),
      });
    }
    console.log(`ChuanTreEm: ${rows.length} rows`);
    await prisma.childGrowthStandard.deleteMany({});
    await prisma.childGrowthStandard.createMany({ data: rows });
  }

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
