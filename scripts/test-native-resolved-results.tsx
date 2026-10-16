import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MultiDayAnalysis, { NutrientSummaryTable } from "../src/app/tinh-khau-phan/MultiDayAnalysis";
import RationDetail from "../src/app/tinh-khau-phan/RationDetail";
import { resolvedAmountText, resolvedDetailLines, resolvedDisplayTotal, resolvedShoppingItems } from "../src/app/tinh-khau-phan/resolved-ration-detail";
import { resolveMenu } from "../src/lib/nutrition-chat/core";
import { ALL_NUTRIENT_FIELDS } from "../src/lib/nutrient-fields";
import type { MenuInput, NutritionFood } from "../src/lib/nutrition-chat/contracts";
import { DEFAULT_PROFILE } from "../src/app/tinh-khau-phan/PersonalProfile";
import { makeRow } from "../src/app/tinh-khau-phan/types";

let checks = 0;
const equal = (actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected); checks++; };
const has = (html: string, text: string) => { assert.ok(html.includes(text), text); checks++; };
const absent = (html: string, text: string) => { assert.ok(!html.includes(text), text); checks++; };
const source = { kind: "catalog" as const, label: "RNI", confirmed: true };
const foods: NutritionFood[] = [
  { id: "g", name: "Thực phẩm khô", unit: "g", source, foodGroup: "Lương thực", wastePercent: 20, nutrients: Object.fromEntries(ALL_NUTRIENT_FIELDS.map((field, i) => [field.key, field.key === "energyKcal" ? 100 : i % 20])) },
  { id: "ml", name: "Đồ uống nguồn 100 ml", unit: "ml", source: { ...source, label: "Nhãn đồ uống" }, foodGroup: "Sữa", wastePercent: null, nutrients: Object.fromEntries(ALL_NUTRIENT_FIELDS.map((field, i) => [field.key, field.key === "energyKcal" ? 50 : i % 10])) },
];
const base = { meal: "Trưa", dish: "Món RNI có thành phần", unit: "g" as const, servings: 2, basis: "edible" as const, recipeSource: { kind: "catalog" as const, label: "Công thức RNI", dishId: "rni-dish" } };
const input: MenuInput = { title: "Bản nháp nguồn chuẩn", mode: "menu", comparison: { mode: "none" }, fields: ALL_NUTRIENT_FIELDS.map(field => field.key), days: [
  { id: "day1", label: "Ngày 1", date: "", rows: [{ ...base, id: "r1", foodId: "g", quantity: 100, aiFilledFields: ["quantity"] }, { ...base, id: "r2", foodId: "ml", quantity: 150, unit: "ml" }] },
  { id: "day2", label: "Ngày 2", date: "", rows: [{ ...base, id: "r3", foodId: "g", quantity: null }] },
  { id: "empty", label: "Ngày chưa nhập", date: "", rows: [] },
] };
const menu = resolveMenu(input, foods);
const rows = menu.days.flatMap(day => day.rows);
for (const field of ALL_NUTRIENT_FIELDS) {
  const display = resolvedDisplayTotal(rows, field.key), canonical = menu.totals[field.key];
  equal({ value: display.value, incomplete: display.incomplete, missingRows: display.missingRows }, { value: canonical.value, incomplete: canonical.incomplete, missingRows: canonical.missingRows });
}
equal(resolvedDisplayTotal([], "energyKcal").value, null);
equal(resolvedDisplayTotal([{ ...rows[0], referenceAmount: 0 }], "notPresent").value, 0);
equal(resolvedDisplayTotal([{ ...rows[0], referenceAmount: 0 }, rows[2]], "energyKcal").value, null);
equal(resolvedAmountText(menu.days[0].rows), "200 g + 300 ml");
equal(resolvedAmountText([rows[0], rows[2]]), "≥ 200 g");
equal(resolvedShoppingItems(rows).find(item => item.id === "ml")!.rawGrams, null);
equal(resolvedShoppingItems(rows).find(item => item.id === "g")!.rawGrams, null);
const dayLines = resolvedDetailLines(menu, "day1", ALL_NUTRIENT_FIELDS.map(field => field.key));
equal(dayLines.map(line => line.kind), ["food", "food", "dish", "meal", "day"]);
equal(dayLines[0].values.energyKcal.value, 200);
equal(dayLines[1].values.energyKcal.value, 150);
equal(dayLines[2].values.energyKcal.value, 350);
equal(dayLines[3].values.energyKcal.value, menu.analysis.days[0].meals[0].energy.value);
equal(dayLines[4].values.energyKcal, menu.dayTotals[0].totals.energyKcal);
equal(resolvedDetailLines(menu, "missing", ["energyKcal"]), []);
const html = renderToStaticMarkup(<MultiDayAnalysis days={[]} profile={null} recommendations={[]} resolvedMenu={menu} reportActions={<button>Tải bản nguồn chuẩn</button>} />);
for (const text of ["Báo cáo toàn kỳ", "Tổng kỳ và biến động từng ngày", "Cân đối chất sinh năng lượng toàn kỳ", "Phân bổ năng lượng", "Dinh dưỡng khẩu phần chi tiết", "Thực phẩm khô", "Đồ uống nguồn 100 ml", "*100", "300 ml", "Tải bản nguồn chuẩn", "Chỉ tính thành phần.", "≥ 350 kcal"]) has(html, text);
for (const text of ["⬇ Word", "Chia đều", "Tỷ lệ mục tiêu", "Tĩnh tại", "Khuyến nghị tự động theo toàn kỳ", "1–1,5 g/kg"]) absent(html, text);
const sentinel = structuredClone(menu); sentinel.analysis.totalEnergy = { value: 12345.6, incomplete: false };
has(renderToStaticMarkup(<MultiDayAnalysis days={[]} profile={null} recommendations={[]} resolvedMenu={sentinel} />), "12.345,6 kcal");
const wrongProfile = { ...DEFAULT_PROFILE, age: "99", weight: "777", height: "999" };
absent(renderToStaticMarkup(<MultiDayAnalysis days={[]} profile={wrongProfile} recommendations={[]} resolvedMenu={menu} />), "777 kg");
const detail = renderToStaticMarkup(<RationDetail rows={[]} mode="menu" resolvedMenu={menu} dayId="day1" />);
const summary = renderToStaticMarkup(<NutrientSummaryTable nutrients={menu.analysis.nutrients} />);
for (const field of ALL_NUTRIENT_FIELDS) {
  has(detail, `data-nutrient-key="${field.key}"`);
  if (!["energyKcal", "proteinG", "lipidG", "glucidG"].includes(field.key)) has(summary, `data-nutrient-summary-key="${field.key}"`);
}
has(detail, "Hiện toàn bộ 160 chỉ tiêu");
has(detail, "Đang hiện 160/160 chỉ tiêu");
absent(html, "Xem thêm 6 vi chất khác");
const conciseInput = structuredClone(input);
conciseInput.fields = ["energyKcal", "proteinG"];
const conciseMenu = resolveMenu(conciseInput, foods);
equal(conciseMenu.fields.map(field => field.key), ["energyKcal", "proteinG"]);
equal(Object.keys(conciseMenu.totals).length, ALL_NUTRIENT_FIELDS.length);
equal(conciseMenu.analysis.nutrients.length, ALL_NUTRIENT_FIELDS.length - 4);
const b12 = conciseMenu.analysis.nutrients.find(metric => metric.key === "vitB12Mcg")!;
equal(b12.total, { value: conciseMenu.totals.vitB12Mcg.value, incomplete: true });
equal(b12.targetPerDay, null);
equal(b12.percentOfTarget, null);
equal(b12.status, "unknown");
const sparse = structuredClone(foods);
for (const food of sparse) { food.nutrients.seleniumMcg = null; food.nutrients.vitB12Mcg = 0; }
const sparseMenu = resolveMenu({ ...conciseInput, days: [conciseInput.days[0]] }, sparse);
equal(sparseMenu.totals.seleniumMcg.value, null);
equal(sparseMenu.analysis.nutrients.find(metric => metric.key === "seleniumMcg")!.total.value, null);
equal(sparseMenu.totals.vitB12Mcg.value, 0);
const targeted = structuredClone(conciseInput);
targeted.days = [targeted.days[0]];
targeted.comparison = { mode: "manual", targets: [{ key: "vitB12Mcg", value: 1, source: "Chỉ định kiểm thử bổ sung" }] };
const targetedMenu = resolveMenu(targeted, foods);
equal(targetedMenu.analysis.nutrients.find(metric => metric.key === "vitB12Mcg")!.targetPerDay, 1);
equal(targetedMenu.analysis.nutrients.find(metric => metric.key === "vitB12Mcg")!.comparableDays, 1);
const manualRow = { ...makeRow("Trưa", "Món thử"), foodId: "g", foodName: foods[0].name, nutrients: foods[0].nutrients, grams: 100, inputGrams: 100 };
const manualDetail = renderToStaticMarkup(<RationDetail rows={[manualRow]} mode="menu" />);
for (const field of ALL_NUTRIENT_FIELDS.filter(field => field.key !== "energyKcal")) has(manualDetail, `data-nutrient-key="${field.key}"`);
has(manualDetail, "Đang hiện 160/160 chỉ tiêu");
for (const text of ["Bữa", "Món", "Thực phẩm", "Lượng nhập × suất", "Lượng dùng tính", "Tổng món", "Tổng bữa", "Tổng Ngày 1", "Nhãn đồ uống"]) has(detail, text);
has(detail, "100 ml"); has(detail, "Phiên bản dữ liệu:");
const partialInput = structuredClone(input);
partialInput.comparison = { mode: "manual", targets: [{ key: "energyKcal", value: 200, source: "Chỉ định kiểm thử" }] };
partialInput.days[0].rows.push({ ...base, id: "missing", foodId: "g", quantity: null });
const partial = resolveMenu(partialInput, foods);
const partialHtml = renderToStaticMarkup(<MultiDayAnalysis days={[]} profile={null} recommendations={[]} resolvedMenu={partial} />);
has(partialHtml, "Chỉ định kiểm thử"); has(partialHtml, "≥ 350");
absent(partialHtml, "175%"); absent(partialHtml, "87,5%");
const clinicalInput = structuredClone(input);
clinicalInput.clinicalContext = { dietCodeId: "diet", targetGroup: "NguoiLon", selection: "user_confirmed" };
const clinical = resolveMenu(clinicalInput, foods, [], { id: "diet", code: "BT01", name: "Mã ăn nguồn kiểm thử", targetGroup: "NguoiLon", diseaseGroup: "Bình thường", ranges: [{ key: "meals", label: "Số bữa", unit: "bữa", min: 1, max: 4 }], note: null, source: { label: "MCDA", url: "https://example.test/diet" }, qualityWarnings: [], rawWater: { min: null, max: null, columnUnit: "ml", unitVerified: false } });
const clinicalHtml = renderToStaticMarkup(<MultiDayAnalysis days={[]} profile={null} recommendations={[]} resolvedMenu={clinical} />);
has(clinicalHtml, "BT01"); has(clinicalHtml, "Số bữa"); has(clinicalHtml, "Người dùng chọn/xác nhận");
const child = resolveMenu({ ...input, profile: { ...DEFAULT_PROFILE, age: "12", ageUnit: "thang", weight: "9.6", height: "75.7" } }, foods);
const childHtml = renderToStaticMarkup(<MultiDayAnalysis days={[]} profile={null} recommendations={[]} resolvedMenu={child} />);
for (const text of ["Đối chiếu Z-score", "Cân nặng theo tuổi", "Chiều cao theo tuổi"]) has(childHtml, text);
const manual = renderToStaticMarkup(<MultiDayAnalysis days={[]} profile={null} recommendations={[]} />);
has(manual, "⬇ Word"); has(manual, "Loại thực đơn:");
console.log(JSON.stringify({ result: "NATIVE_RESOLVED_RESULTS_OK", checks, completeNutrientFields: ALL_NUTRIENT_FIELDS.length }));
