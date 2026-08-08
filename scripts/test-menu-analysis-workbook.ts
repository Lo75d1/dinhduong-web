import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { buildMenuAnalysisWorkbook } from "../src/lib/menu-analysis-workbook";

async function main() {
const bytes = await buildMenuAnalysisWorkbook({
  generatedAt: new Date("2026-08-01T08:00:00+07:00"),
  foods: [{
    id: "food-001", name: "Gạo tẻ", source: "VDD", sourceCode: "001", foodType: "TS", foodGroup: "Ngũ cốc",
    unit: "g", wastePercent: 0, energyKcal: 344, proteinG: 7.9, animalProteinG: 0, lipidG: 1,
    glucidG: 76.2, fiberG: 0.4, sodiumMg: 5,
  }],
  dishes: [{
    id: "dish-001", name: "Cơm", source: "RNI", sourceCode: "M001", categoryRaw: "Món chính",
    totalWeightG: 200, servingUnit: "Chén", ageGroup: null, diseaseDiet: null, ingredientCount: 1,
    cookingSteps: "Vo gạo và nấu chín.",
  }],
  ingredients: [{
    dishId: "dish-001", dishName: "Cơm", sortOrder: 1, foodNameRaw: "Gạo tẻ", foodId: "food-001",
    foodName: "Gạo tẻ", quantityG: 80, energyKcalRaw: 344, linkStatus: "Đã liên kết",
  }],
  recommendations: [{
    stt: 1, ageGroup: "19-30 tuổi", gender: "Nam", energyKcal: 2300, referenceWeightKg: 60,
    physicalActivity: "Trung bình", proteinMinPct: 0.13, proteinMaxPct: 0.2,
  }],
  dietCodes: [{
    code: "BT01", targetGroup: "NguoiLon", diseaseGroup: "Bình thường", name: "Chế độ ăn thông thường",
    energyMinKcal: 1800, energyMaxKcal: 2200, mealsMin: 3, mealsMax: 5,
  }],
});

const outputDir = path.resolve("outputs/menu-analysis-export");
const outputPath = path.join(outputDir, "dinh-duong-2598-phan-tich-thuc-don-mau.xlsx");
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, bytes);

const workbook = new ExcelJS.Workbook();
// Kiểu Buffer<ArrayBuffer> của @types/node khác kiểu Buffer mà exceljs khai báo
// (xung đột phiên bản @types/node). Ép về đúng kiểu tham số của load — runtime vẫn là Buffer hợp lệ.
await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), [
  "Huong_dan", "Thuc_pham", "Mon_an", "Nguyen_lieu_mon", "Nhu_cau", "Ma_che_do_an", "Khung_thuc_don",
]);
assert.equal(workbook.getWorksheet("Thuc_pham")?.getCell("B2").value, "Gạo tẻ");
assert.match(String((workbook.getWorksheet("Khung_thuc_don")?.getCell("E3").value as ExcelJS.CellFormulaValue).formula), /VLOOKUP/);
assert.equal((workbook.getWorksheet("Khung_thuc_don")?.getCell("G103").value as ExcelJS.CellFormulaValue).formula, "SUM(G3:G102)");

console.log(JSON.stringify({ outputPath, bytes: bytes.byteLength, sheets: workbook.worksheets.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
