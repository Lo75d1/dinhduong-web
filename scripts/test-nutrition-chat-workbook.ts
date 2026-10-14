import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { buildNutritionWorkbook, parseNutritionWorkbook } from "../src/lib/nutrition-chat/workbook";
import { assertNutritionWorkbookExportBudget, inspectWorkbookArchive, NutritionWorkbookError, WORKBOOK_LIMITS } from "../src/lib/nutrition-chat/workbook-security";
import { analyzeMenuPeriod } from "../src/app/tinh-khau-phan/multi-day-analysis";
import { resolveMenu } from "../src/lib/nutrition-chat/core";
import { ALL_NUTRIENT_FIELDS } from "../src/lib/nutrient-fields";
import type { MenuInput, NutritionFood, ResolvedMenu, ResolvedRow } from "../src/lib/nutrition-chat/contracts";

const fields = [
  { key: "energyKcal", label: "Năng lượng", unit: "kcal" },
  { key: "proteinG", label: "Đạm", unit: "g" },
  { key: "lipidG", label: "Béo", unit: "g" },
  { key: "glucidG", label: "Bột đường", unit: "g" },
  { key: "calciumMg", label: "Canxi", unit: "mg" },
];
const foods: NutritionFood[] = [
  { id: "test-rice-a", name: "Cơm (trùng tên thử nghiệm)", unit: "g", source: { kind: "catalog", label: "Dữ liệu giả lập A; chỉ kiểm thử", confirmed: true }, foodGroup: "Ngũ cốc", wastePercent: 0, nutrients: { energyKcal: 130, proteinG: 2.5, lipidG: 0.2, glucidG: 28, calciumMg: 10 } },
  { id: "test-rice-b", name: "Cơm (trùng tên thử nghiệm)", unit: "g", source: { kind: "catalog", label: "Dữ liệu giả lập B; chỉ kiểm thử", confirmed: true }, foodGroup: "Ngũ cốc", wastePercent: 0, nutrients: { energyKcal: 200, proteinG: 3, lipidG: 1, glucidG: 40, calciumMg: 0 } },
  { id: "test-beef", name: "Thịt giả lập", unit: "g", source: { kind: "catalog", label: "Dữ liệu giả lập; chỉ kiểm thử", confirmed: true }, foodGroup: "Thịt", wastePercent: 10, nutrients: { energyKcal: 200, proteinG: 20, lipidG: 10, glucidG: 0, calciumMg: null } },
  { id: "test-no-waste", name: "Thiếu thải bỏ", unit: "g", source: { kind: "catalog", label: "Dữ liệu giả lập; chỉ kiểm thử", confirmed: true }, foodGroup: null, wastePercent: null, nutrients: { energyKcal: 100, proteinG: 1, lipidG: 1, glucidG: 1, calciumMg: null } },
];

export function workbookFixture(): { menu: ResolvedMenu; foods: NutritionFood[] } {
  const customFood = { id: "custom-milk", name: "Sữa nhãn giả lập", source: { kind: "label" as const, label: "Nhãn giả lập; chỉ kiểm thử", url: "https://example.com/test-label", confirmed: true }, basis: "portion" as const, portionAmount: 200, portionUnit: "ml" as const, wastePercent: 0, nutrients: { energyKcal: 100, proteinG: 6, lipidG: 4, glucidG: 10, calciumMg: null } };
  const input: MenuInput = { title: "MẪU KIỂM THỬ · không dùng tính khẩu phần", mode: "menu", fields: fields.map(field => field.key), comparison: { mode: "manual", targets: [{ key: "energyKcal", value: 2000, source: "Mục tiêu thử nghiệm" }, { key: "calciumMg", value: 1000, source: "Mục tiêu thử nghiệm" }] }, aiComment: "Nhận xét giả lập tại lúc xuất. Sửa Excel sẽ báo cần cập nhật.", days: [
    { id: "day-a", label: "Ngày 1", date: "2026-10-14", rows: [
      { id: "row-rice", meal: "Trưa", dish: "Cơm với thịt", foodId: "test-rice-a", quantity: 200, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "catalog", label: "Công thức giả lập", dishId: "test-dish" } },
      { id: "row-beef", meal: "Trưa", dish: "Cơm với thịt", foodId: "test-beef", quantity: 50, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "ai", label: "Công thức ước lượng đã xác nhận" }, estimateAccepted: true, replacedFromFoodId: "test-original" },
      { id: "row-milk", meal: "Phụ", dish: "Sữa", customFood, quantity: 200, unit: "ml", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Người dùng nhập nhãn" } },
    ] },
    { id: "day-b", label: "Ngày 2", date: "2026-10-15", rows: [
      { id: "row-other-rice", meal: "Sáng", dish: "Cơm", foodId: "test-rice-b", quantity: 100, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Nhập trong hội thoại" } },
    ] },
  ] };
  const days = input.days.map(day => ({ ...day, rows: day.rows.map<ResolvedRow>(row => {
    const food: NutritionFood = row.customFood ? { id: row.customFood.id, name: row.customFood.name, unit: "ml", source: row.customFood.source, foodGroup: null, wastePercent: 0, nutrients: Object.fromEntries(fields.map(field => [field.key, row.customFood!.nutrients[field.key] === null ? null : row.customFood!.nutrients[field.key]! / 2])) } : foods.find(food => food.id === row.foodId)!;
    const referenceAmount = row.quantity!;
    return { ...row, food, referenceAmount, edibleGrams: row.unit === "ml" ? null : referenceAmount, rawGrams: row.unit === "ml" ? null : referenceAmount / (1 - food.wastePercent! / 100), warnings: [] };
  }) }));
  const totalsFor = (rows: ResolvedRow[]) => Object.fromEntries(fields.map(field => {
    const known = rows.filter(row => row.referenceAmount !== null && row.food.nutrients[field.key] !== null);
    const missingRows = rows.filter(row => row.referenceAmount === null || row.food.nutrients[field.key] === null).map(row => row.id);
    return [field.key, { value: known.length ? known.reduce((sum, row) => sum + row.food.nutrients[field.key]! * row.referenceAmount! / 100, 0) : null, incomplete: missingRows.length > 0, missingRows, estimated: rows.some(row => row.recipeSource.kind === "ai") }];
  }));
  return { foods, menu: { contractVersion: "1.0", title: input.title, mode: input.mode, input, digest: "test-digest", dataVersion: "test-data-version", generatedAt: "2026-10-14T10:00:00.000Z", aiComment: input.aiComment!, fields, days, totals: totalsFor(days.flatMap(day => day.rows)), dayTotals: days.map(day => ({ id: day.id, label: day.label, date: day.date, hasData: true, totals: totalsFor(day.rows) })), targets: input.comparison.targets!.map(target => ({ ...target, isUpperLimit: false })), analysis: analyzeMenuPeriod([], null, []), warnings: [], missingInputs: [] } };
}

async function read(bytes: Uint8Array) { const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]); return workbook; }
async function edit(bytes: Uint8Array, change: (workbook: ExcelJS.Workbook) => void) { const workbook = await read(bytes); change(workbook); return new Uint8Array(await workbook.xlsx.writeBuffer()); }

async function main() {
  const fixture = workbookFixture();
  if (process.argv.includes("--check-native")) {
    const native = await parseNutritionWorkbook(await fs.readFile(path.resolve("evidence/nutrition-chat/editable-workbook-native-verified.xlsx")));
    const resolved = resolveMenu(native, fixture.foods);
    assert.equal(resolved.totals.energyKcal.value, 660);
    assert.equal(resolved.totals.calciumMg.value, 20);
    assert.equal(resolved.totals.calciumMg.missingRows.length, 2);
    console.log("Native Excel saved workbook safely re-imported and server parity passed.");
    return;
  }
  if (process.argv.includes("--benchmark-import")) {
    const started = performance.now();
    const imported = await parseNutritionWorkbook(await fs.readFile(path.resolve("evidence/nutrition-chat/editable-workbook-max.xlsx")));
    assert.equal(imported.days.length, 90);
    assert.equal(imported.days.reduce((sum, day) => sum + day.rows.length, 0), 1000);
    const report = { operation: "standalone import", days: imported.days.length, rows: 1000, elapsedMs: Math.round(performance.now() - started), peakRssMiB: process.resourceUsage().maxRSS ? Math.round(process.resourceUsage().maxRSS / 1024) : null, rssMiBAtEnd: Math.round(process.memoryUsage().rss / 1024 / 1024), environment: `${process.platform} Node ${process.version}` };
    await fs.writeFile(path.resolve("evidence/nutrition-chat/workbook-import-benchmark.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    return;
  }
  if (process.argv.includes("--benchmark-export")) {
    const maximum = process.argv.includes("--maximum");
    const representative = process.argv.includes("--representative");
    const dayCount = representative ? 7 : 90;
    const rowCount = representative ? 21 : 1000;
    const fieldSet = ALL_NUTRIENT_FIELDS.slice(0, maximum ? 40 : 18);
    const catalogue = Array.from({ length: maximum ? 6000 : 3719 }, (_, i) => ({ ...fixture.foods[0], id: `benchmark-food-${i + 1}`, name: `Dữ liệu giả lập ${i + 1}`, nutrients: Object.fromEntries(fieldSet.map(field => [field.key, field.key === "energyKcal" ? 130 : 1])) }));
    const days = Array.from({ length: dayCount }, (_, index) => ({ id: `benchmark-day-${index + 1}`, label: `Ngày ${index + 1}`, date: "", rows: [] as MenuInput["days"][number]["rows"] }));
    for (let i = 0; i < rowCount; i++) days[i % days.length].rows.push({ ...fixture.menu.input.days[0].rows[0], id: `benchmark-row-${i + 1}`, foodId: catalogue[i].id });
    const menu = resolveMenu({ title: "Dữ liệu giả lập kiểm thử hiệu năng", mode: "menu", days, comparison: { mode: "none" }, fields: fieldSet.map(field => field.key) }, catalogue);
    const started = performance.now();
    const bytes = await buildNutritionWorkbook(menu, catalogue);
    const report = { operation: representative ? "standalone representative export" : maximum ? "standalone maximum export" : "standalone default-fields export", catalogue: catalogue.length, fields: fieldSet.length, days: dayCount, rows: rowCount, bytes: bytes.byteLength, elapsedMs: Math.round(performance.now() - started), peakRssMiB: process.resourceUsage().maxRSS ? Math.round(process.resourceUsage().maxRSS / 1024) : null, rssMiBAtEnd: Math.round(process.memoryUsage().rss / 1024 / 1024), environment: `${process.platform} Node ${process.version}` };
    await fs.mkdir(path.resolve("evidence/nutrition-chat"), { recursive: true });
    await fs.writeFile(path.resolve(`evidence/nutrition-chat/workbook-export-${representative ? "representative" : maximum ? "maximum" : "default"}-benchmark.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    return;
  }
  const bytes = await buildNutritionWorkbook(fixture.menu, fixture.foods);
  const folder = path.resolve("evidence/nutrition-chat");
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "editable-workbook-test.xlsx"), bytes);
  const archive = await inspectWorkbookArchive(bytes);
  assert.doesNotThrow(() => assertNutritionWorkbookExportBudget(bytes));
  assert.throws(() => assertNutritionWorkbookExportBudget(new Uint8Array(WORKBOOK_LIMITS.bytes + 1)), error => error instanceof NutritionWorkbookError && error.status === 413, "oversized compressed export rejected before publication");
  const overEntry = new Uint8Array(bytes);
  const overEntryView = new DataView(overEntry.buffer);
  for (let index = 0; index < overEntry.length - 46; index++) if (overEntryView.getUint32(index, true) === 0x02014b50 && overEntryView.getUint32(index + 24, true) > 0) { overEntryView.setUint32(index + 24, WORKBOOK_LIMITS.entryBytes + 1, true); break; }
  assert.throws(() => assertNutritionWorkbookExportBudget(overEntry), error => error instanceof NutritionWorkbookError && error.status === 413, "oversized exported entry rejected before publication");
  const overTotal = new Uint8Array(bytes);
  const overTotalView = new DataView(overTotal.buffer);
  for (let index = 0, count = 0; index < overTotal.length - 46 && count < 3; index++) if (overTotalView.getUint32(index, true) === 0x02014b50 && overTotalView.getUint32(index + 24, true) > 0) { overTotalView.setUint32(index + 24, 23 * 1024 * 1024, true); count++; }
  assert.throws(() => assertNutritionWorkbookExportBudget(overTotal), error => error instanceof NutritionWorkbookError && error.status === 413, "oversized exported aggregate rejected before publication");
  const charts = Object.values(archive.files).filter(entry => /^xl\/charts\/.*\.xml$/.test(entry.name));
  assert.equal(charts.length, 2, "two native live charts");
  for (const entry of charts) assert.match(await entry.async("string"), /<c:f>.*Phan tich.*<\/c:f>/, "charts linked to formulas");
  const sheet = await read(bytes);
  if (process.env.WORKBOOK_DEBUG === "1") await sheet.xlsx.writeFile(path.join(folder, "no-charts.xlsx"));
  assert.equal(sheet.getWorksheet("Nhap khau phan")!.getCell("G7").protection.locked, false);
  assert.notEqual(sheet.getWorksheet("Nhap khau phan")!.getCell("AC7").protection?.locked, false);
  assert.notEqual(sheet.getWorksheet("Du lieu")!.getCell("J7").protection?.locked, false);
  assert.equal((sheet.getWorksheet("Nhap khau phan")!.getCell("AC7").value as ExcelJS.CellFormulaValue).result, 260);
  assert.equal((sheet.getWorksheet("Phan tich")!.getCell("D7").value as ExcelJS.CellFormulaValue).result, 460);
  assert.equal((sheet.getWorksheet("Phan tich")!.getCell("D98").value as ExcelJS.CellFormulaValue).result, 660);
  assert.equal(sheet.getWorksheet("Du lieu")!.getCell("N8").value, 0, "canonical zero retained");
  assert.equal(sheet.getWorksheet("Du lieu")!.getCell("N9").value, null, "canonical null retained");
  const parsed = await parseNutritionWorkbook(bytes);
  const recalculatedServer = resolveMenu(parsed, fixture.foods);
  assert.equal(recalculatedServer.totals.energyKcal.value, 660, "re-import agrees with server engine");
  assert.equal(recalculatedServer.totals.calciumMg.value, 20);
  assert.equal(recalculatedServer.totals.calciumMg.missingRows.length, 2);
  assert.equal(parsed.aiComment, undefined, "snapshot prose does not masquerade as new analysis");
  const savedBytes = await buildNutritionWorkbook({ ...fixture.menu, savedRecord: { id: "private-ration-id", revision: 4 } }, fixture.foods);
  const savedWorkbook = await read(savedBytes);
  assert.match(String(savedWorkbook.getWorksheet("Phan tich")!.getCell("A2").value), /private-ration-id.*phiên bản 4/);
  const savedImport = await parseNutritionWorkbook(savedBytes);
  assert.ok(!("savedRecord" in savedImport) && !JSON.stringify(savedImport).includes("private-ration-id"), "saved IDs do not grant write access on import");
  assert.equal(parsed.days.length, 2);
  assert.equal(parsed.days[0].rows[2].customFood!.nutrients.calciumMg, null);
  assert.equal(parsed.days[0].rows[2].customFood!.portionAmount, 200);
  assert.equal(parsed.days[0].rows[1].replacedFromFoodId, "test-original");
  const changed = await parseNutritionWorkbook(await edit(bytes, workbook => {
    const input = workbook.getWorksheet("Nhap khau phan")!;
    input.getCell("E7").value = "test-rice-b"; input.getCell("G7").value = 300; input.getCell("I7").value = 2;
    input.getCell("B7").value = 2; input.getCell("C7").value = "Tối";
    input.getCell("AC7").value = { formula: "1+1", result: 999999 };
    workbook.getWorksheet("Du lieu")!.getCell("J8").value = 999999;
    workbook.getWorksheet("Ngay va muc tieu")!.getCell("F7").value = 1800;
  }));
  assert.equal(changed.days[1].rows.find(row => row.id === "row-rice")!.quantity, 300);
  assert.equal(changed.days[1].rows.find(row => row.id === "row-rice")!.servings, 2);
  assert.equal(changed.days[1].rows.find(row => row.id === "row-rice")!.foodId, "test-rice-b");
  assert.equal(changed.days[1].rows.find(row => row.id === "row-rice")!.replacedFromFoodId, "test-rice-a");
  assert.equal(changed.comparison.targets![0].source, "Người dùng điều chỉnh từ Mục tiêu thử nghiệm");
  const changedServer = resolveMenu(changed, fixture.foods);
  assert.equal(changedServer.totals.energyKcal.value, 1600, "re-import recomputes from server IDs, not tampered canonical cells");
  assert.ok(!JSON.stringify(changed).includes("999999"), "cached results and canonical edits ignored");
  await assert.rejects(parseNutritionWorkbook(await edit(bytes, workbook => { workbook.getWorksheet("Nhap khau phan")!.getCell("G7").value = { formula: "1+1", result: 2 }; })), /công thức/);
  await assert.rejects(parseNutritionWorkbook(await edit(bytes, workbook => { workbook.getWorksheet("Tu nhap")!.getCell("A8").value = "custom-milk"; })), /trùng/);
  await assert.rejects(parseNutritionWorkbook(await edit(bytes, workbook => { workbook.getWorksheet("Nhap khau phan")!.getCell("F7").value = "custom-milk"; })), /một dòng|Một dòng/);
  await assert.rejects(parseNutritionWorkbook(await edit(bytes, workbook => { workbook.getWorksheet("Nhap khau phan")!.getCell("G2000").value = 1; })), /ngoài vùng/);
  const external = await JSZip.loadAsync(bytes); external.file("xl/_rels/external.xml.rels", '<Relationships><Relationship TargetMode="External" Target="https://evil.example"/></Relationships>');
  await assert.rejects(parseNutritionWorkbook(await external.generateAsync({ type: "uint8array" })), /liên kết/);
  const macro = await JSZip.loadAsync(bytes); macro.file("xl/vbaProject.bin", "macro");
  await assert.rejects(parseNutritionWorkbook(await macro.generateAsync({ type: "uint8array" })), /macro/);
  const zeroTarget = await parseNutritionWorkbook(await edit(bytes, workbook => { workbook.getWorksheet("Ngay va muc tieu")!.getCell("F7").value = 0; }));
  assert.equal(zeroTarget.comparison.targets![0].value, 0, "zero target distinct from no target");
  const override = await parseNutritionWorkbook(await edit(bytes, workbook => { workbook.getWorksheet("Tu nhap")!.getCell("M7").value = 12; }));
  assert.equal(override.days[0].rows[2].customFood!.source.kind, "user", "edited label numbers become user-source values");
  assert.equal(override.days[0].rows[2].customFood!.source.confirmed, false, "edited source requires fresh confirmation");
  assert.match(override.days[0].rows[2].customFood!.source.label, /^Người dùng điều chỉnh từ /);
  const nonCoreFields = ALL_NUTRIENT_FIELDS.filter(field => !["energyKcal", "proteinG", "lipidG", "glucidG"].includes(field.key)).slice(0, 40);
  const nonCoreMenu = resolveMenu({ ...fixture.menu.input, fields: nonCoreFields.map(field => field.key) }, fixture.foods);
  const nonCoreBytes = await buildNutritionWorkbook(nonCoreMenu, fixture.foods);
  const nonCoreImport = await parseNutritionWorkbook(nonCoreBytes);
  assert.equal(nonCoreImport.fields!.length, 40);
  const nonCoreWorkbook = await read(nonCoreBytes);
  assert.equal(nonCoreWorkbook.getWorksheet("Tu nhap")!.columnCount, 55, "40 non-core selected fields plus four source macros");
  assert.equal(nonCoreImport.days[0].rows[2].customFood!.nutrients.proteinG, 6, "unselected source macros survive re-import");
  const forged = new Uint8Array(bytes);
  const forgedView = new DataView(forged.buffer);
  for (let index = 0; index < forged.length - 46; index++) if (forgedView.getUint32(index, true) === 0x02014b50 && forgedView.getUint32(index + 24, true) > 5000) { forgedView.setUint32(index + 24, 1, true); break; }
  await assert.rejects(inspectWorkbookArchive(forged), /giải nén|khớp/, "actual inflation bound detects forged central size");
  const hostile = await JSZip.loadAsync(bytes); hostile.file("xl/worksheets/bomb.xml", "x".repeat(WORKBOOK_LIMITS.worksheetBytes + 1));
  await assert.rejects(inspectWorkbookArchive(await hostile.generateAsync({ type: "uint8array", compression: "DEFLATE" })), /giới hạn/);
  const report = { verified: ["source null/zero", "editable cells and protection", "stable duplicate-name IDs", "recipe substitutions", "editable label portion", "server parity", "ignore cached/canonical results", "target provenance", "input formula rejection", "duplicate/custom-source rejection", "row limits", "external/macro rejection", "ZIP expansion limits"], nativeRecalculation: "separate PowerShell Excel verification required", bytes: bytes.byteLength, output: path.join(folder, "editable-workbook-test.xlsx"), chartParts: charts.length };
  await fs.writeFile(path.join(folder, "workbook-structure-tests.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (process.env.MAX_WORKBOOK === "1") {
    const started = performance.now();
    const fieldSet = (process.env.NON_CORE_WORKBOOK === "1" ? ALL_NUTRIENT_FIELDS.filter(field => !["energyKcal", "proteinG", "lipidG", "glucidG"].includes(field.key)) : ALL_NUTRIENT_FIELDS).slice(0, 40);
    const catalogue = Array.from({ length: WORKBOOK_LIMITS.catalogue }, (_, i) => ({ ...fixture.foods[0], id: `max-food-${i + 1}`, name: `Dữ liệu giả lập ${i + 1}`, nutrients: { ...fixture.foods[0].nutrients, ...Object.fromEntries(fieldSet.map(field => [field.key, field.key === "energyKcal" ? 130 : 1])) } }));
    const sourceRow = fixture.menu.input.days[0].rows[0];
    const days = Array.from({ length: WORKBOOK_LIMITS.days }, (_, dayIndex) => ({ id: `max-day-${dayIndex + 1}`, label: `Ngày ${dayIndex + 1}`, date: "", rows: [] as MenuInput["days"][number]["rows"] }));
    for (let i = 0; i < WORKBOOK_LIMITS.rows; i++) days[i % days.length].rows.push({ ...sourceRow, id: `max-row-${i + 1}`, foodId: catalogue[i].id });
    const maxMenu = resolveMenu({ title: "Dữ liệu giả lập kiểm thử giới hạn", mode: "menu", days, comparison: { mode: "none" }, fields: fieldSet.map(field => field.key) }, catalogue);
    console.log("Maximum fixture: server resolved; building XLSX");
    const buildStarted = performance.now();
    const maxBytes = await buildNutritionWorkbook(maxMenu, catalogue);
    const buildElapsedMs = Math.round(performance.now() - buildStarted);
    console.log(`Maximum fixture: built ${maxBytes.byteLength} bytes; inspecting ZIP`);
    await fs.writeFile(path.join(folder, "editable-workbook-max.xlsx"), maxBytes);
    const maxZip = new DataView(maxBytes.buffer, maxBytes.byteOffset, maxBytes.byteLength);
    let end = maxBytes.byteLength - 22;
    while (end >= 0 && maxZip.getUint32(end, true) !== 0x06054b50) end--;
    let central = maxZip.getUint32(end + 16, true), measuredExpanded = 0;
    const entryMeasures = [];
    while (central < end && maxZip.getUint32(central, true) === 0x02014b50) {
      const entryBytes = maxZip.getUint32(central + 24, true), nameLength = maxZip.getUint16(central + 28, true);
      measuredExpanded += entryBytes;
      entryMeasures.push({ name: new TextDecoder().decode(maxBytes.subarray(central + 46, central + 46 + nameLength)), bytes: entryBytes });
      central += 46 + nameLength + maxZip.getUint16(central + 30, true) + maxZip.getUint16(central + 32, true);
    }
    await fs.writeFile(path.join(folder, "workbook-maximum-archive.json"), JSON.stringify({ bytes: maxBytes.byteLength, expanded: measuredExpanded, largestEntries: entryMeasures.sort((a, b) => b.bytes - a.bytes).slice(0, 8) }, null, 2));
    console.log(`Maximum fixture: central expanded bytes ${measuredExpanded}`);
    const archive = await inspectWorkbookArchive(maxBytes);
    console.log("Maximum fixture: ZIP inspected; parsing inputs");
    const importStarted = performance.now();
    const imported = await parseNutritionWorkbook(maxBytes);
    const importElapsedMs = Math.round(performance.now() - importStarted);
    console.log("Maximum fixture: imported; checking limits");
    assert.equal(imported.days.length, WORKBOOK_LIMITS.days);
    assert.equal(imported.days.reduce((sum, day) => sum + day.rows.length, 0), WORKBOOK_LIMITS.rows);
    assert.equal(imported.fields!.length, 40);
    const expandedBytes = (await Promise.all(Object.values(archive.files).filter(entry => !entry.dir).map(async entry => (await entry.async("uint8array")).byteLength))).reduce((sum, value) => sum + value, 0);
    await fs.writeFile(path.join(folder, "editable-workbook-max.xlsx"), maxBytes);
    const maximumReport = { bytes: maxBytes.byteLength, expandedBytes, catalogue: catalogue.length, days: days.length, rows: WORKBOOK_LIMITS.rows, fields: fieldSet.length, sourceFields: new Set([...fieldSet.map(field => field.key), "energyKcal", "proteinG", "lipidG", "glucidG"]).size, buildElapsedMs, importElapsedMs, elapsedMs: Math.round(performance.now() - started), peakRssMiB: process.resourceUsage().maxRSS ? Math.round(process.resourceUsage().maxRSS / 1024) : null, rssMiBAtEnd: Math.round(process.memoryUsage().rss / 1024 / 1024), environment: `${process.platform} Node ${process.version}` };
    await fs.writeFile(path.join(folder, process.env.NON_CORE_WORKBOOK === "1" ? "workbook-maximum-noncore-tests.json" : "workbook-maximum-tests.json"), JSON.stringify(maximumReport, null, 2));
    console.log(JSON.stringify(maximumReport));
  }
}

if (process.argv[1]?.endsWith("test-nutrition-chat-workbook.ts")) main().catch(error => { console.error(error); process.exitCode = 1; });
