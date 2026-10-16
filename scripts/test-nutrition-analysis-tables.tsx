import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildNutritionWorkbook, parseNutritionWorkbook } from "../src/lib/nutrition-chat/workbook";
import { parseNutritionReportContext } from "../src/lib/nutrition-chat/workbook-context";
import { resolveMenu } from "../src/lib/nutrition-chat/core";
import { workbookFixture } from "./test-nutrition-chat-workbook";
import { DEFAULT_PROFILE } from "../src/app/tinh-khau-phan/PersonalProfile";
import WhoGrowthAssessment from "../src/app/tinh-khau-phan/WhoGrowthAssessment";
import { assessWhoGrowth, WHO_GROWTH_ENTRIES } from "../src/lib/who-growth";
import { downloadNutritionExcel, webReportDietCode } from "../src/app/tinh-khau-phan/nutrition-excel-download";

async function main() {
  let checks = 0;
  const equal = (value: unknown, expected: unknown) => { assert.deepEqual(value, expected); checks++; };
  const fixture = workbookFixture(), input = structuredClone(fixture.menu.input);
  input.comparison = { mode: "manual", targets: [{ key: "energyKcal", value: 330, source: "Mốc kiểm thử" }, { key: "calciumMg", value: 1000, source: "Mốc kiểm thử" }, { key: "sodiumMg", value: 1500, isUpperLimit: true, source: "Mốc kiểm thử" }] };
  input.profile = { ...DEFAULT_PROFILE, age: "30", weight: "60", height: "160" };
  input.days.push({ id: "empty", label: "Ngày chưa nhập", date: "", rows: [] });
  fixture.foods[0].nutrients.sodiumMg = 200; fixture.foods[1].nutrients.sodiumMg = 0;
  const menu = resolveMenu(input, fixture.foods);
  const options = { reportContext: { mealShares: { Trưa: 50, Phụ: 25, Sáng: 25 } } };
  const bytes = await buildNutritionWorkbook(menu, fixture.foods, options);
  await fs.mkdir("evidence/nutrition-chat", { recursive: true }); await fs.writeFile("evidence/nutrition-chat/analysis-tables-test.xlsx", bytes);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  const balance = wb.getWorksheet("Can doi nang luong")!, contribution = wb.getWorksheet("Dong gop bua mon")!, detail = wb.getWorksheet("Thanh phan day du")!;
  const find = (sheet: ExcelJS.Worksheet, label: string, start = 1) => { let found = 0; sheet.eachRow((row, i) => { if (!found && i >= start && row.getCell(1).value === label) found = i; }); assert.ok(found, label); return found; };
  const summaryValue = (label: string) => { let value: unknown; balance.eachRow(row => { for (const c of [1, 6]) if (row.getCell(c).value === label) value = row.getCell(c + 3).result; }); return value; };
  equal(balance.getCell("B7").result, 460); equal(balance.getCell("C7").result, 330); equal(balance.getCell("D7").result, 130);
  equal(balance.getCell("I7").result, 2); equal(balance.getCell("I8").result, 1); equal(balance.getCell("I9").result, "—");
  equal(balance.getCell("J7").result, "Vượt"); equal(balance.getCell("J8").result, "Thiếu");
  equal(summaryValue("Ngày chưa đủ cơ sở"), 0);
  equal(summaryValue("Thực phẩm khác nhau"), 4);
  const macroTitle = find(balance, "CÂN ĐỐI P:L:G VÀ CHỈ SỐ TRÊN CÂN NẶNG");
  equal(balance.getCell(macroTitle + 2, 8).result, 24 / 2 / 60);
  equal(balance.getCell(macroTitle + 2, 9).result, "Chưa đủ cơ sở");
  equal(contribution.getCell("C7").result, 360); equal(contribution.getCell("F7").value, .5); equal(contribution.getCell("G7").result, 330);
  equal(contribution.getCell("L7").result, "Đạt"); equal(contribution.getCell("B7").result, 1);
  const dishTitle = find(contribution, "MÓN ĐÓNG GÓP TRONG TOÀN KỲ"); equal(contribution.getCell(dishTitle + 2, 3).result, 2);
  const responseTitle = find(detail, "ĐỐI CHIẾU KHUYẾN NGHỊ THEO NGÀY");
  const calcium = find(detail, "Canxi", responseTitle), sodium = find(detail, "Natri", responseTitle);
  equal(detail.getCell(calcium, 3).result, 2000); equal(detail.getCell(calcium, 4).result, 1); equal(detail.getCell(calcium, 5).result, 0); equal(detail.getCell(calcium, 6).result, "Chưa đủ cơ sở");
  equal(detail.getCell(sodium, 4).result, 1); equal(detail.getCell(sodium, 5).result, 1); equal(detail.getCell(sodium, 7).result, "Giới hạn trên");
  for (const sheet of wb.worksheets) sheet.eachRow(row => row.eachCell(cell => { if (cell.formula) {
    const unquoted = cell.formula.replace(/"(?:[^"]|"")*"/g, ""); let depth = 0;
    for (const char of unquoted) { if (char === "(") depth++; if (char === ")") depth--; assert.ok(depth >= 0, `${sheet.name}!${cell.address}`); }
    assert.equal(depth, 0, `${sheet.name}!${cell.address}`); assert.ok(cell.formula.length <= 8192, `${sheet.name}!${cell.address}`);
  } })); checks++;
  equal((await parseNutritionWorkbook(bytes)).fields, input.fields);
  const noTarget = new ExcelJS.Workbook(); await noTarget.xlsx.load(Buffer.from(await buildNutritionWorkbook(resolveMenu({ ...input, comparison: { mode: "none" } }, fixture.foods), fixture.foods)) as unknown as ExcelJS.Buffer);
  equal(noTarget.getWorksheet("Can doi nang luong")!.getCell("J7").result, "Chưa đủ cơ sở"); equal(noTarget.getWorksheet("Dong gop bua mon")!.getCell("G7").result, "—");
  const kitchenBytes = await buildNutritionWorkbook(menu, fixture.foods, { reportContext: { kitchenMode: true, mealShares: { Trưa: 25 } } });
  const kitchen = new ExcelJS.Workbook(); await kitchen.xlsx.load(Buffer.from(kitchenBytes) as unknown as ExcelJS.Buffer);
  equal(kitchen.getWorksheet("Can doi nang luong")!.getCell("J7").result, "Tham khảo cả ngày"); equal(kitchen.getWorksheet("Dong gop bua mon")!.getCell("G7").result, "—");
  const child = structuredClone(input); child.profile = { ...DEFAULT_PROFILE, age: "12", ageUnit: "thang", weight: "9.6", height: "75.7" };
  const childBytes = await buildNutritionWorkbook(resolveMenu(child, fixture.foods), fixture.foods);
  await fs.writeFile("evidence/nutrition-chat/analysis-child-test.xlsx", childBytes);
  const childBook = new ExcelJS.Workbook(); await childBook.xlsx.load(Buffer.from(childBytes) as unknown as ExcelJS.Buffer);
  const growthRows = assessWhoGrowth(WHO_GROWTH_ENTRIES.filter(entry => entry.sex === "Nam"), 12, 9.6, 75.7);
  equal(growthRows.length, 4); const childSheet = childBook.getWorksheet("Can doi nang luong")!, title = find(childSheet, "Z-SCORE TRẺ EM · CHUẨN WHO");
  for (const [i, item] of growthRows.entries()) equal((childSheet.getRow(title + 2 + i).values as unknown[]).slice(1, 7), [item.label, item.value, item.unit, item.score, item.status, item.source]);
  const html = renderToStaticMarkup(<WhoGrowthAssessment entries={WHO_GROWTH_ENTRIES.filter(entry => entry.sex === "Nam")} ageMonths={12} weightKg={9.6} heightCm={75.7} />);
  for (const item of growthRows) { assert.ok(html.includes(item.label)); checks++; }
  equal(assessWhoGrowth(WHO_GROWTH_ENTRIES, 240, 60, 160), []);
  for (const invalid of [null, [], { totals: {} }, { kitchenMode: "true" }, { dietCodeId: "../../bad" }, { mealShares: { Trưa: -1 } }, { mealShares: { Trưa: 101 } }, { mealShares: { Trưa: NaN } }, { mealShares: [] }]) { assert.throws(() => parseNutritionReportContext(invalid)); checks++; }
  equal(parseNutritionReportContext({ mealShares: { "Bữa * ?": 100 }, kitchenMode: false, dietCodeId: "test-01" }), { mealShares: { "Bữa * ?": 100 }, kitchenMode: false, dietCodeId: "test-01" });
  const descriptors = new Map(["window", "document", "fetch"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const requests: Array<{ reportContext: unknown }> = []; let clicks = 0;
  Object.assign(globalThis, {
    window: { localStorage: { getItem: (key: string) => key === "khauphan_menu_dietcode_v1" ? "multi-diet" : key === "khauphan_dietcode_v1" ? "single-diet" : null } },
    document: { createElement: () => ({ click() { clicks++; } }) },
    fetch: async (_url: string, init: RequestInit) => { requests.push(JSON.parse(String(init.body))); return new Response(new Uint8Array([80, 75])); },
  });
  try {
    equal(webReportDietCode(false), "single-diet"); equal(webReportDietCode(true), "multi-diet");
    await downloadNutritionExcel([{ id: "test", label: "Ngày 1", date: "", rows: [] }], null);
    equal(requests[0].reportContext, { dietCodeId: "single-diet" });
    const reportContext = { kitchenMode: true, mealShares: { Trưa: 100 }, dietCodeId: webReportDietCode(true) };
    await downloadNutritionExcel([{ id: "test", label: "Ngày 1", date: "", rows: [] }], null, { reportContext });
    equal(requests[1].reportContext, reportContext); equal(clicks, 2);
  } finally { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } }
  await fs.writeFile("evidence/nutrition-chat/analysis-tables-proof.json", JSON.stringify({ rows: { macroStart: macroTitle + 2, dishStart: dishTitle + 2, calcium, sodium, responseStart: responseTitle + 2, weightRow: find(balance, "Cân nặng") }, formulaChecks: true, fixturesOnly: true }, null, 2));
  console.log(JSON.stringify({ result: "ANALYSIS_TABLES_OK", checks, output: "analysis-tables-test.xlsx", browserInteraction: false }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
