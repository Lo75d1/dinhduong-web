import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { workbookFixture } from "./test-nutrition-chat-workbook";
import { parseMenuInput } from "../src/lib/nutrition-chat/validation";
import { resolveMenu, assertMenuComplete } from "../src/lib/nutrition-chat/core";
import { buildNutritionWorkbook, parseNutritionWorkbook } from "../src/lib/nutrition-chat/workbook";
import { nutritionMenuReview } from "../src/lib/nutrition-chat/menu-review";
import { displayNumber, recallAmounts, RECALL_HEADERS, RECALL_ENERGY_HEADERS } from "../src/lib/nutrition-chat/presentation";
import { nutritionChatReport } from "../src/lib/nutrition-chat/chat-report";
import { NUTRITION_WORKFLOW } from "../src/lib/nutrition-chat/tools";
import { nutritionStartMessage } from "../src/lib/nutrition-chat/start-guide";

let checks = 0;
function equal(actual: unknown, expected: unknown, message?: string) { if (message) assert.deepEqual(actual, expected, message); else assert.deepEqual(actual, expected); checks++; }
function check(value: unknown, message?: string) { if (message) assert.ok(value, message); else assert.ok(value); checks++; }
async function main() {
  const fixture = workbookFixture(), foods = structuredClone(fixture.foods);
  foods[0].source.label = "RNI"; foods[0].foodType = "TS";
  foods[1].source.label = "VDD"; foods[1].foodType = "MA";
  foods[2].source.label = "RNI"; foods[2].foodType = "TS";
  const input = structuredClone(fixture.menu.input); input.mode = "recall24h"; input.comparison = { mode: "none" };
  const rice = input.days[0].rows[0]; rice.basis = "cooked"; rice.sourceState = "raw_clean"; rice.conversionFactor = 0.4; rice.conversionSource = "Hệ số giả lập chỉ kiểm thử"; rice.mealTime = "11:30"; rice.householdMeasure = "1 bát"; rice.aiFilledFields = ["quantity", "conversionFactor", "householdMeasure"];
  input.days[0].rows[1].sourceState = "raw_clean";
  input.days[0].rows[2].aiFilledFields = ["customFood.nutrients.energyKcal"];
  input.days[1].rows[0].sourceState = "cooked";
  const normalized = parseMenuInput(input), menu = resolveMenu(normalized, foods);
  assertMenuComplete(menu); checks++;
  equal(menu.totals.energyKcal.value, 504, "new metadata never replaces the existing calculator");
  equal(recallAmounts(menu.days[0].rows[0]), { cookedGrams: 200, rawCleanGrams: 80, conversionFactor: 0.4 });
  equal(recallAmounts(menu.days[1].rows[0]), { cookedGrams: 100, rawCleanGrams: null, conversionFactor: null });
  equal(displayNumber(0, true), "*0"); equal(displayNumber(null, true), "—"); equal(typeof normalized.days[0].rows[0].quantity, "number");
  const review = nutritionMenuReview(menu);
  check(review.text.includes("\\*200 g")); check(review.text.includes("\\*")); check(!review.text.includes("confirmationToken")); equal(review.truncated, false); equal(review.rowCount, 4);
  const long = structuredClone(normalized); long.days = [{ ...long.days[0], rows: Array.from({ length: 101 }, (_, i) => ({ ...long.days[0].rows[0], id: `long-${i}` })) }];
  const bounded = nutritionMenuReview(resolveMenu(long, foods)); equal(bounded.shownRows, 100); equal(bounded.truncated, true); check(bounded.text.includes("100/101"));
  for (const patch of [{ mealTime: "25:00" }, { aiFilledFields: ["quantity", "quantity"] }, { aiFilledFields: ["profile.weight"] }, { quantity: "*200" }]) {
    const invalid = structuredClone(input); Object.assign(invalid.days[0].rows[0], patch); assert.throws(() => parseMenuInput(invalid)); checks++;
  }
  const wrongState = structuredClone(normalized); wrongState.days[1].rows[0].sourceState = "raw_clean";
  assert.throws(() => assertMenuComplete(resolveMenu(wrongState, foods))); checks++;
  const report = nutritionChatReport(menu); check(report.summaryText.includes("504")); check(report.summaryText.length < report.text.length);
  check(NUTRITION_WORKFLOW.menuGuidance.includes("Không tự chọn dòng đầu")); check(NUTRITION_WORKFLOW.resultPresentation.includes("không cần tạo/tải Excel")); check(nutritionStartMessage("https://example.test").includes("save_menu"));
  const bytes = await buildNutritionWorkbook(menu, foods);
  await fs.mkdir("evidence/nutrition-chat", { recursive: true }); await fs.writeFile("evidence/nutrition-chat/recall-2598-test.xlsx", bytes);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  equal(workbook.worksheets[0].name, "Phieu 24h");
  const survey = workbook.getWorksheet("Phieu 24h")!, energy = workbook.getWorksheet("Quy doi 24h")!;
  equal((survey.getRow(6).values as unknown[]).slice(1), RECALL_HEADERS); equal((energy.getRow(6).values as unknown[]).slice(1), RECALL_ENERGY_HEADERS);
  equal(survey.getCell("A7").value, "11:30"); equal(survey.getCell("E7").result, "*1 bát"); equal(survey.getCell("F7").result, 200); equal(survey.getCell("G7").result, 0.4); equal(survey.getCell("H7").result, 80);
  equal(energy.getCell("C7").result, 80); equal(energy.getCell("D7").result, 104); equal(energy.getCell("C8").result, 50); equal(energy.getCell("D8").result, 100);
  const archive = await JSZip.loadAsync(bytes);
  const sheetXml = async (name: string) => archive.file(`xl/worksheets/sheet${workbook.getWorksheet(name)!.id}.xml`)!.async("string");
  const surveyXml = await sheetXml("Phieu 24h");
  check(surveyXml.includes('sqref="F7"')); check((await sheetXml("Nhap khau phan")).includes('sqref="G7"'));
  check((await sheetXml("Tu nhap")).includes("conditionalFormatting")); check(surveyXml.includes("<sheetProtection"));
  const roundTrip = await parseNutritionWorkbook(bytes);
  equal(roundTrip.days[0].rows[0].mealTime, "11:30"); equal(roundTrip.days[0].rows[0].householdMeasure, "1 bát"); equal(roundTrip.days[0].rows[0].sourceState, "raw_clean"); equal(roundTrip.days[0].rows[0].aiFilledFields, rice.aiFilledFields); equal(roundTrip.days[0].rows[2].aiFilledFields, ["customFood.nutrients.energyKcal"]);
  workbook.getWorksheet("Nhap khau phan")!.getCell("G7").value = 300;
  const edited = await parseNutritionWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer()));
  equal(edited.days[0].rows[0].aiFilledFields, ["conversionFactor"]); equal(edited.days[0].rows[0].householdMeasure, undefined); equal(edited.days[0].rows[0].sourceState, "raw_clean"); equal(resolveMenu(edited, foods).totals.energyKcal.value, 556);
  workbook.getWorksheet("Nhap khau phan")!.getCell("E7").value = foods[1].id;
  const substituted = await parseNutritionWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer())); equal(substituted.days[0].rows[0].sourceState, undefined);
  console.log(JSON.stringify({ checks, result: "review, provenance and appendix workbook passed", file: "recall-2598-test.xlsx" }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
