import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { workbookFixture } from "./test-nutrition-chat-workbook";
import { resolveMenu } from "../src/lib/nutrition-chat/core";
import { buildNutritionWorkbook, parseNutritionWorkbook } from "../src/lib/nutrition-chat/workbook";
import { inspectWorkbookArchive } from "../src/lib/nutrition-chat/workbook-security";
import { parseMenuInput } from "../src/lib/nutrition-chat/validation";
import { nutritionExcelFilename, selectNutritionDay, webNutritionReportInput } from "../src/app/tinh-khau-phan/nutrition-excel-download";
import MealInput from "../src/app/tinh-khau-phan/MealInput";
import MenuDraftEditor from "../src/app/tinh-khau-phan/MenuDraftEditor";
import MultiDayExcelExport from "../src/app/tinh-khau-phan/MultiDayExcelExport";
import { makeRow } from "../src/app/tinh-khau-phan/types";

async function main() {
  const fixture = workbookFixture(), input = structuredClone(fixture.menu.input);
  input.days.push({ id: "empty", label: "Ngày trống", date: "", rows: [] });
  for (let i = 4; i <= 7; i++) input.days.push({ id: `day-${i}`, label: i === 7 ? "=SUM(A1) / [ngày cuối]" : "Tên ngày trùng", date: "", rows: [{ ...structuredClone(input.days[1].rows[0]), id: `row-${i}`, quantity: i === 4 ? 0 : i === 5 ? null : i * 10 }] });
  input.days[1].rows[0].basis = "raw";
  input.days[1].rows[0].aiFilledFields = ["quantity", "servings"];
  const menu = resolveMenu(input, fixture.foods);
  const bytes = await buildNutritionWorkbook(menu, fixture.foods);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  const archive = await inspectWorkbookArchive(bytes);
  const daily = workbook.worksheets.filter(sheet => /^Ngay \d{2}$/.test(sheet.name));
  assert.equal(daily.length, 7, "each day has a sheet, including an explicitly empty day");
  assert.equal(workbook.views[0].activeTab, workbook.worksheets.indexOf(daily[0]), "opens on the first daily sheet");
  let offset = 0;
  menu.days.forEach((day, i) => {
    const sheet = daily[i];
    assert.match(String(sheet.getCell("A2").value), new RegExp(day.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    day.rows.forEach((row, j) => {
      const source = 7 + offset + j;
      assert.equal(sheet.getCell(7 + j, 4).result, row.actualFoodName || row.food.name, "only this day's ingredients");
      assert.equal(sheet.getCell(7 + j, 5).result, row.quantity === null ? "—" : row.quantity * row.servings, JSON.stringify({day:day.id,source:workbook.getWorksheet("Thuc don")!.getCell(source,5).value,daily:sheet.getCell(7+j,5).value}));
      assert.equal(sheet.getCell(7 + j, 6).result, row.unit, "ml remains ml");
      assert.match(sheet.getCell(7 + j, 5).formula, new RegExp(`'Nhap khau phan'!G${source}\\b`), "retains canonical formulas at the correct input offset");
      assert.match(sheet.getCell(7 + j, 11).formula, new RegExp(`'Nhap khau phan'!J${source}\\b`), "basis reads the actual input basis column");
      assert.equal(sheet.getCell(7 + j, 5).numFmt, workbook.getWorksheet("Thuc don")!.getCell(source, 5).numFmt, "AI markers retained");
    });
    assert.equal(sheet.getCell("A1").font?.name, "Times New Roman");
    assert.match(sheet.pageSetup.printArea!, /^A1:K\d+$/);
    assert.equal(sheet.pageSetup.fitToHeight, 0, "long days may use several readable pages");
    offset += day.rows.length;
  });
  assert.match(String(daily[2].getCell("A7").value), /Chưa nhập/);
  assert.equal(daily[2].getCell("G9").value, "—", "empty day is not zero kcal");
  assert.equal(daily[3].getCell("G7").result, 0, "real zero is kept");
  assert.equal(daily[4].getCell("G7").result, "—", "missing amount is not zero");
  assert.equal(typeof daily[6].getCell("A2").value, "string", "a label beginning with = is literal text");
  for (const sheet of daily) {
    const xml = await archive.file(`xl/worksheets/sheet${sheet.id}.xml`)!.async("string");
    assert.doesNotMatch(xml, /<pane\b|<sheetProtection\b/);
  }
  const roundTrip = await parseNutritionWorkbook(bytes);
  assert.equal(roundTrip.days.length, 7);
  assert.deepEqual(roundTrip.days.map(day => day.rows.map(row => [row.id, row.quantity, row.unit, row.servings])), input.days.map(day => day.rows.map(row => [row.id, row.quantity, row.unit, row.servings])));

  const selected = selectNutritionDay(input, "day-a");
  assert.equal(selected.days.length, 1);
  assert.deepEqual(selected.days[0], input.days[0]);
  assert.deepEqual(selected.comparison, input.comparison);
  assert.deepEqual(selected.days[0].rows[2].customFood, input.days[0].rows[2].customFood);
  selected.days[0].rows[0].quantity = 999;
  assert.notEqual(input.days[0].rows[0].quantity, 999, "export selection cannot edit the original week");
  assert.throws(() => selectNutritionDay(input, "deleted-day"));
  assert.equal(nutritionExcelFilename(selectNutritionDay(input, "day-b")), "thuc-don-Ngay-2-2026-10-15.xlsx");
  assert.doesNotMatch(nutritionExcelFilename(selectNutritionDay(input, "day-7")), /[\[\]/\\:*?]/);
  const local = makeRow("Trưa", "Món ngoài hệ thống", { id: "local-test", name: "Nhãn do người dùng nhập", wastePercent: 0, nutrients: { energyKcal: 100, proteinG: null, lipidG: 0, glucidG: 20 } }, "menu");
  const web = parseMenuInput(webNutritionReportInput([{ id: "local-day", label: "Ngày tự nhập", date: "", rows: [local] }], null));
  assert.equal(web.days[0].rows[0].foodId, undefined);
  assert.equal(web.days[0].rows[0].customFood?.nutrients.proteinG, null);
  assert.equal(web.days[0].rows[0].customFood?.nutrients.lipidG, 0);

  const actions = renderToStaticMarkup(<MealInput actionsOnly controlled={{ rows: [], mode: "menu", onChange: () => {}, onModeChange: () => {}, onPickFood: () => {}, onPickDish: () => {}, renderDish: () => null }} />);
  assert.ok(actions.includes("Thêm thực phẩm và món ăn ngoài hệ thống") && actions.includes("AI hỗ trợ nhập liệu"));
  assert.ok(!actions.includes("data-calculator-input-workspace"));
  const editor = renderToStaticMarkup(<MenuDraftEditor input={input} menu={menu} names={{}} disabled={false} onChange={() => {}} onNames={() => {}} onAmount={() => {}} />);
  assert.ok(editor.includes("Thêm thực phẩm và món ăn ngoài hệ thống") && editor.includes("AI hỗ trợ nhập liệu"), "linked multi-day editor also exposes shared actions");
  const exports = renderToStaticMarkup(<MultiDayExcelExport days={[{ id: "one", label: "Ngày 1", date: "", rows: [] }, { id: "two", label: "Ngày 2", date: "", rows: [] }]} profile={null} />);
  assert.ok(exports.includes("mỗi ngày một sheet") && exports.includes("Excel riêng ngày này"));
  console.log("Daily menu export: 7 isolated sheets, source formulas, units, empty/null/zero, import round-trip, selected-day scope and shared actions passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
