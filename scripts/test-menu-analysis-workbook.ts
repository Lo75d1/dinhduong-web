import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { buildMenuAnalysisWorkbook } from "../src/lib/menu-analysis-workbook";
import JSZip from "jszip";
import { ALL_NUTRIENT_FIELDS } from "../src/lib/nutrient-fields";

async function main() {
if (process.argv.includes("--stream")) {
  const large = process.argv.includes("--benchmark");
  const dense = Object.fromEntries(ALL_NUTRIENT_FIELDS.map(field => [field.key, 0]));
  const started = performance.now();
  const foods = Array.from({ length: large ? 3719 : 1200 }, (_, i) => ({ id: `stream-food-${i}`, name: `MẪU KIỂM THỬ ${i}`, source: "VDD", unit: "g", ...dense, vitAMgVdd: 99 }));
  const dishes = Array.from({ length: large ? 7369 : 1 }, (_, i) => ({ id: `stream-dish-${i}`, name: `Mẫu món ${i}`, source: "RNI" }));
  const ingredients = Array.from({ length: large ? 41457 : 1 }, (_, i) => ({ dishId: dishes[i % dishes.length].id, dishName: "Mẫu món", sortOrder: i, foodId: foods[i % foods.length].id, foodNameRaw: "Mẫu nguyên liệu", foodName: "Mẫu nguyên liệu", quantityG: 100, energyKcalRaw: 0, linkStatus: "Đã liên kết" }));
  const bytes = await buildMenuAnalysisWorkbook({ foods, dishes, ingredients, recommendations: [], dietCodes: [] });
  const result = { bytes: bytes.length, elapsedMs: Math.round(performance.now() - started), peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024), foods: foods.length, dishes: dishes.length, ingredients: ingredients.length };
  const zip = await JSZip.loadAsync(bytes);
  const foodXml = await zip.file("xl/worksheets/sheet2.xml")!.async("string");
  assert.equal([...foodXml.matchAll(/<row\b/g)].length, foods.length + 1);
  assert.match(foodXml, new RegExp(`stream-food-${foods.length - 1}`));
  assert.match(foodXml, /Vitamin D|Vitamin K/);
  assert.match(foodXml, /<v>0<\/v>/);
  assert.doesNotMatch(foodXml, /<pane\b/);
  assert.match(await zip.file("xl/worksheets/sheet4.xml")!.async("string"), new RegExp(`r="${ingredients.length + 1}"`));
  await fs.mkdir("evidence/nutrition-chat", { recursive: true });
  await fs.writeFile("evidence/nutrition-chat/admin-stream-report-test.xlsx", bytes);
  await fs.writeFile("evidence/nutrition-chat/admin-stream-benchmark.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result)); return;
}
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
