import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import { workbookFixture } from "./test-nutrition-chat-workbook";
import { nutritionDietCode, dietStatus, DIET_REFERENCE_NOTICE } from "../src/lib/nutrition-chat/clinical";
import { parseMenuInput } from "../src/lib/nutrition-chat/validation";
import { resolveMenu, assertMenuComplete } from "../src/lib/nutrition-chat/core";
import { nutritionMenuReview } from "../src/lib/nutrition-chat/menu-review";
import { nutritionChatReport } from "../src/lib/nutrition-chat/chat-report";
import { buildNutritionWorkbook, parseNutritionWorkbook } from "../src/lib/nutrition-chat/workbook";
import type { MenuInput } from "../src/lib/nutrition-chat/contracts";

let checks = 0;
const equal = (actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected); checks++; };
const check = (value: unknown) => { assert.ok(value); checks++; };
async function main() {
  const food = structuredClone(workbookFixture().foods[0]); food.nutrients = { ...food.nutrients, energyKcal: 130, proteinG: 2.5, lipidG: 0.3, glucidG: 28, sodiumMg: 0, potassiumMg: null };
  const raw = { id: "test-clinical", code: "TEST-01", name: "Chế độ giả lập kiểm thử", targetGroup: "NguoiLon", diseaseGroup: "Kiểm thử phần mềm", energyMinKcal: 100, energyMaxKcal: 200, proteinMinG: 2, proteinMaxG: 4, sodiumMinMg: 0, sodiumMaxMg: 0, mealsMin: 1, mealsMax: 2, waterMinMl: 1.5, note: "Ghi chú giả lập theo kg cân nặng; không dùng cho người bệnh." };
  const diet = nutritionDietCode(raw);
  const input: MenuInput = { title: "KIỂM THỬ CHẾ ĐỘ ĂN", mode: "menu", comparison: { mode: "none" }, fields: ["energyKcal", "proteinG", "lipidG", "glucidG", "sodiumMg", "potassiumMg"], clinicalContext: { conditions: ["Tình trạng giả lập"], notes: "Dữ kiện kiểm thử, không phải hồ sơ người bệnh.", targetGroup: "NguoiLon", dietCodeId: diet.id, selection: "user_confirmed" }, days: [
    { id: "d1", label: "Ngày 1", date: "2026-10-16", rows: [{ id: "r1", meal: "Trưa", dish: "Cơm", foodId: food.id, quantity: 100, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Kiểm thử" } }] },
    { id: "d2", label: "Ngày 2", date: "2026-10-17", rows: [{ id: "r2", meal: "Trưa", dish: "Cơm", foodId: food.id, quantity: 200, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Kiểm thử" } }] },
    { id: "d3", label: "Chưa nhập", date: "2026-10-18", rows: [] },
  ] };
  const normalized = parseMenuInput(input), menu = resolveMenu(normalized, [food], [], diet), clinical = menu.clinicalAssessment!;
  assertMenuComplete(menu); checks++;
  equal(menu.totals.energyKcal.value, 390); equal(menu.targets, []); equal(clinical.referenceOnly, true); equal(clinical.notice, DIET_REFERENCE_NOTICE);
  const energy = clinical.metrics.find(row => row.key === "energyKcal")!;
  equal([energy.average, energy.status, energy.assessedDays, energy.withinDays, energy.dataDays], [195, "within", 2, 1, 2]);
  const sodium = clinical.metrics.find(row => row.key === "sodiumMg")!, potassium = clinical.metrics.find(row => row.key === "potassiumMg")!;
  equal([sodium.average, sodium.status], [0, "within"]); equal([potassium.average, potassium.status, potassium.assessedDays], [null, "unknown", 0]);
  equal(clinical.metrics.find(row => row.key === "meals")?.average, 1); check(!clinical.metrics.some(row => row.key === "waterMl"));
  equal(diet.rawWater, { min: 1.5, max: null, columnUnit: "ml", unitVerified: false }); equal(diet.qualityWarnings.length, 2); check(diet.note?.includes("kg"));
  equal(dietStatus(0, 0, 0), "within"); equal(dietStatus(null, 0, 1), "unknown"); equal(dietStatus(2, null, 1), "above"); equal(dietStatus(0, 1, null), "below");
  const invalidRange = nutritionDietCode({ ...raw, energyMinKcal: 300 }); equal(invalidRange.ranges[0].min, null); equal(invalidRange.ranges[0].max, null); check(invalidRange.qualityWarnings.some(w => w.includes("xác minh")));
  const noCode = structuredClone(normalized); noCode.clinicalContext = { conditions: ["Chưa có mã"] }; const plain = resolveMenu(noCode, [food]); equal(plain.clinicalAssessment?.diet, null); equal(plain.totals.energyKcal.value, 390); assertMenuComplete(plain); checks++;
  const proposed = structuredClone(normalized); proposed.clinicalContext!.selection = "proposed"; const draft = resolveMenu(proposed, [food], [], diet); assert.throws(() => assertMenuComplete(draft)); checks++; equal(draft.clinicalAssessment?.metrics[0].status, "unknown");
  const mismatch = structuredClone(normalized); mismatch.clinicalContext!.targetGroup = "TreEm"; assert.throws(() => assertMenuComplete(resolveMenu(mismatch, [food], [], diet))); checks++;
  assert.throws(() => resolveMenu(normalized, [food], [], { ...diet, id: "forged" })); checks++;
  const sourceChanged = resolveMenu(normalized, [food], [], nutritionDietCode({ ...raw, energyMaxKcal: 300 })); check(sourceChanged.dataVersion !== menu.dataVersion); check(sourceChanged.digest !== menu.digest);
  const estimatedInput = structuredClone(normalized); estimatedInput.days[0].rows[0].recipeSource.kind = "ai"; const estimated = resolveMenu(estimatedInput, [food], [], diet).clinicalAssessment!.metrics[0]; equal(estimated.status, "unknown"); equal(estimated.assessedDays, 0);
  for (const bad of [{ dietCodeId: diet.id }, { dietCodeId: diet.id, selection: "user_confirmed" }, { selection: "prescribed" }, { unknown: "x" }, { conditions: ["a", "a"] }]) { assert.throws(() => parseMenuInput({ ...input, clinicalContext: bad })); checks++; }
  check(nutritionMenuReview(menu).text.includes("TEST-01")); check(nutritionMenuReview(menu).text.includes("Người dùng chọn")); check(nutritionChatReport(menu).summaryText.includes("TEST-01")); check(nutritionChatReport(menu).text.includes("Trong khoảng tham khảo"));
  const bytes = await buildNutritionWorkbook(menu, [food]); await fs.mkdir("evidence/nutrition-chat", { recursive: true }); await fs.writeFile("evidence/nutrition-chat/clinical-test.xlsx", bytes);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer); const report = wb.getWorksheet("Bao cao")!;
  const titleRow = report.getRows(1, report.rowCount)!.find(row => row.getCell(1).value === "ĐỐI CHIẾU CHẾ ĐỘ ĂN BỆNH LÝ")!.number;
  const clinicalRow = report.getRows(titleRow + 1, report.rowCount - titleRow)!.find(row => row.getCell(1).value === "Năng lượng")!.number;
  equal(report.getCell(clinicalRow, 3).result, 195); equal(report.getCell(clinicalRow, 8).result, "Trong khoảng tham khảo"); equal(report.getCell(clinicalRow, 6).result, 2); equal(report.getCell(clinicalRow, 7).result, 1);
  const imported = await parseNutritionWorkbook(bytes); equal(imported.clinicalContext, normalized.clinicalContext); equal(resolveMenu(imported, [food], [], diet).clinicalAssessment?.metrics[0].average, 195);
  wb.getWorksheet("Nhap khau phan")!.getCell("G7").value = 300; const edited = await parseNutritionWorkbook(new Uint8Array(await wb.xlsx.writeBuffer())); const updated = resolveMenu(edited, [food], [], diet).clinicalAssessment!.metrics[0]; equal(updated.average, 325); equal(updated.status, "above"); equal(updated.withinDays, 0);
  console.log(JSON.stringify({ checks, clinicalRow, workbook: "clinical-test.xlsx", result: "clinical validation, source ranges, incomplete/zero/estimated days, provenance and workbook roundtrip passed" }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
