import ExcelJS from "exceljs";
import { randomBytes } from "node:crypto";
import type { CustomFoodInput, FoodSource, MenuInput, MenuRowInput, NutritionFood, ResolvedMenu, TargetInput } from "./contracts";
import { CONTRACT_VERSION } from "./contracts";
import { ALL_NUTRIENT_FIELDS } from "../nutrient-fields";
import { resolveMenu, sanitizeNutritionFood } from "./core";
import { addNutritionReportSheets, type NutritionWorkbookOptions } from "./workbook-report";
import { NUTRIENT_KEYS, parseMenuInput } from "./validation";
import { addNativeWorkbookCharts } from "./workbook-charts";
import { assertNutritionWorkbookExportBudget, inspectWorkbookArchive, NutritionWorkbookError, WORKBOOK_LIMITS } from "./workbook-security";
import { workbookInputView } from "./workbook-reader";

const SHEETS = { analysis: "Phan tich", input: "Nhap khau phan", targets: "Ngay va muc tieu", shopping: "Di cho", custom: "Tu nhap", data: "Du lieu", meals: "Theo bua", dishes: "Theo mon", comparison: "Doi chieu", meta: "_meta", originalInput: "_input", originalCustom: "_custom", originalTargets: "_targets" };
const FIRST = 7;
const GREEN = "123C36";
const LIGHT = "E7F1EC";
const INPUT = "FFF3CF";
const MAX_NUTRIENTS = 40;
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,70}$/;
const q = (name: string) => `'${name.replace(/'/g, "''")}'`;
const col = (number: number) => { let value = number; let result = ""; while (value) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); } return result; };
const range = (sheet: string, column: string, last: number) => `${q(sheet)}!$${column}$${FIRST}:$${column}$${last}`;
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const isFormula = (cell: ExcelJS.Cell) => cell.type === ExcelJS.ValueType.Formula || typeof cell.value === "object" && cell.value !== null && ("formula" in cell.value || "sharedFormula" in cell.value);

type Manifest = {
  version: string; title: string; mode: MenuInput["mode"]; fields: string[]; sourceFields: string[];
  inputCapacity: number; customCapacity: number; dataRows: number; reportFields?: string[];
  digest: string; dataVersion: string; generatedAt: string; aiComment: string;
  savedRecord?: { id: string; revision: number };
  days: Array<{ id: string; label: string; date: string }>;
  rows: Array<Omit<MenuRowInput, "customFood"> & { customFoodId?: string }>; targets: TargetInput[]; customSources: CustomFoodInput[];
};

function heading(sheet: ExcelJS.Worksheet, title: string, subtitle: string, headers: string[], widths: number[]) {
  sheet.properties.defaultRowHeight = 23;
  sheet.properties.tabColor = { argb: GREEN };
  sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 6, activeCell: "G7", showGridLines: false }];
  sheet.columns = headers.map((_, i) => ({ width: widths[i] ?? 17 }));
  sheet.mergeCells(1, 1, 1, Math.min(headers.length, 12));
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { name: "Calibri", size: 20, bold: true, color: { argb: GREEN } };
  sheet.getRow(1).height = 35;
  sheet.mergeCells(2, 1, 3, Math.min(headers.length, 12));
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  sheet.getCell("A2").font = { name: "Calibri", size: 11, color: { argb: "344C45" } };
  sheet.getRow(2).height = 28;
  sheet.getRow(3).height = 25;
  sheet.getRow(6).values = headers;
  sheet.getRow(6).height = 38;
  sheet.getRow(6).eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } }; cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } }; cell.alignment = { vertical: "middle", wrapText: true }; });
  sheet.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 } };
  sheet.headerFooter.oddFooter = "Dinh dưỡng 2598 | Trang &P / &N";
  sheet.pageSetup.printTitlesRow = "1:6";
}

function styleRows(sheet: ExcelJS.Worksheet, last: number, editable: number[] = [], sparse = false) {
  const columnCount = sheet.columnCount;
  const regularFont = { name: "Calibri", size: 11, color: { argb: "17201D" } };
  const editableFont = { name: "Calibri", size: 11, color: { argb: "175387" } };
  const fills: Record<string, ExcelJS.Fill> = Object.fromEntries([INPUT, "FFFFFF", "F3F7F5"].map(color => [color, { type: "pattern", pattern: "solid", fgColor: { argb: color } }])) as Record<string, ExcelJS.Fill>;
  const border: Partial<ExcelJS.Borders> = { bottom: { style: "hair", color: { argb: "D7E2DC" } } };
  const wrapped = { vertical: "middle" as const, wrapText: true };
  const unwrapped = { vertical: "middle" as const, wrapText: false };
  const locked = { locked: true }; const unlocked = { locked: false };
  for (let row = FIRST; row <= last; row++) {
    sheet.getRow(row).height = 28;
    for (let column = 1; column <= columnCount; column++) {
      if (sparse && sheet.getRow(row).findCell(column)?.value == null) continue;
      const cell = sheet.getCell(row, column);
      const canEdit = editable.includes(column);
      cell.font = canEdit ? editableFont : regularFont;
      cell.fill = fills[canEdit ? INPUT : row % 2 ? "FFFFFF" : "F3F7F5"];
      cell.alignment = column < 7 || column === 26 || column === 28 ? wrapped : unwrapped;
      cell.border = border;
      cell.protection = canEdit ? unlocked : locked;
      if (column > 6) cell.numFmt = '#,##0.00;[Red](#,##0.00);"0"';
    }
  }
  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: last, column: columnCount } };
}
function textColumns(sheet: ExcelJS.Worksheet, columns: number[], last: number) {
  for (const column of columns) for (let row = FIRST; row <= last; row++) sheet.getCell(row, column).numFmt = "@";
}

function decimal(cell: ExcelJS.Cell, maximum = 1000000, minimum = 0) {
  cell.dataValidation = { type: "decimal", operator: "between", allowBlank: true, formulae: [minimum, maximum], showErrorMessage: true, errorStyle: "stop", errorTitle: "Giá trị chưa hợp lệ", error: `Nhập số từ ${minimum} đến ${maximum}.` };
}
function list(cell: ExcelJS.Cell, formula: string) {
  cell.dataValidation = { type: "list", allowBlank: true, formulae: [formula], showErrorMessage: true, errorStyle: "stop", errorTitle: "Chọn trong danh sách", error: "Chọn giá trị trong danh sách hoặc để trống." };
}
function formula(cell: ExcelJS.Cell, expression: string, result?: string | number | boolean | null) {
  const unquoted = expression.replace(/"[^"]*"/g, "");
  let depth = 0;
  for (const character of unquoted) { if (character === "(") depth++; if (character === ")") depth--; if (depth < 0) throw new Error(`Unbalanced formula at ${cell.address}`); }
  if (depth !== 0) throw new Error(`Unbalanced formula at ${cell.address}`);
  cell.value = result === undefined || result === null ? { formula: expression } : { formula: expression, result };
}
function copySnapshot(workbook: ExcelJS.Workbook, source: ExcelJS.Worksheet, name: string, last: number) {
  const sheet = workbook.addWorksheet(name, { state: "veryHidden" });
  const columnCount = source.columnCount;
  for (let row = FIRST; row <= last; row++) for (let column = 1; column <= columnCount; column++) {
    const cell = source.getCell(row, column);
    if (!isFormula(cell)) sheet.getCell(row, column).value = cell.value;
  }
}

/** An editable, self-contained workbook. Only explicit user input is re-imported. */
export async function buildNutritionWorkbook(original: ResolvedMenu, catalogue: NutritionFood[], options: NutritionWorkbookOptions = {}): Promise<Uint8Array> {
  const complete = options.complete !== false;
  const selectedFields = original.fields;
  const fullFields = [...selectedFields, ...ALL_NUTRIENT_FIELDS.filter(field => !selectedFields.some(selected => selected.key === field.key))];
  const catalogued = new Set(catalogue.map(food => food.id));
  const allFoods = [...new Map([...catalogue, ...original.days.flatMap(day => day.rows.filter(row => !row.customFood && !catalogued.has(row.food.id)).map(row => row.food))].map(food => [food.id, food])).values()];
  const full = complete ? resolveMenu({ ...original.input, fields: fullFields.map(field => field.key), comparison: { mode: "none" } }, allFoods) : original;
  const menu = complete ? { ...original, fields: fullFields, days: full.days, totals: full.totals, dayTotals: full.dayTotals, dataVersion: full.dataVersion } : original;
  const rows = menu.days.flatMap(day => day.rows.map(row => ({ day, row })));
  if (rows.length > WORKBOOK_LIMITS.rows || menu.days.length > WORKBOOK_LIMITS.days) throw new NutritionWorkbookError("WORKBOOK_LIMIT", "Vượt giới hạn 90 ngày hoặc 1.000 dòng.");
  const fields = menu.fields;
  if (fields.length > (complete ? ALL_NUTRIENT_FIELDS.length : MAX_NUTRIENTS) || !fields.length || fields.some(field => !KEY_PATTERN.test(field.key))) throw new NutritionWorkbookError("WORKBOOK_FIELDS", "Danh sách chất xuất Excel không hợp lệ.");
  const sourceFields = [...fields, ...ALL_NUTRIENT_FIELDS.filter(field => ["energyKcal", "proteinG", "lipidG", "glucidG"].includes(field.key) && !fields.some(selected => selected.key === field.key))];
  const foods = allFoods.map(sanitizeNutritionFood);
  if (foods.length > WORKBOOK_LIMITS.catalogue) throw new NutritionWorkbookError("WORKBOOK_LIMIT", "Danh mục Excel vượt 6.000 thực phẩm.");
  const customs = [...new Map(rows.filter(item => item.row.customFood).map(item => [item.row.customFood!.id, item.row.customFood!])).values()];
  if (customs.length > WORKBOOK_LIMITS.customFoods) throw new NutritionWorkbookError("WORKBOOK_LIMIT", "Excel hỗ trợ tối đa 100 nguồn tự nhập.");
  const inputCapacity = Math.min(WORKBOOK_LIMITS.rows, Math.max(50, rows.length + 30));
  const customCapacity = Math.min(WORKBOOK_LIMITS.customFoods, Math.max(20, customs.length + 10));
  if (complete) {
    // Bound live object/formula allocation before constructing ExcelJS cells on the 2 GB VPS.
    const dataCells = foods.reduce((sum, food) => sum + 10 + sourceFields.filter(field => food.nutrients[field.key] != null).length, 0);
    const estimatedCells = dataCells + inputCapacity * (sourceFields.length * 2 + 45) + WORKBOOK_LIMITS.days * fields.length * 2 + menu.days.length * fields.length * 8 + inputCapacity * 10 + customCapacity * (sourceFields.length + 11) * 2;
    if (estimatedCells > 400_000) throw new NutritionWorkbookError("WORKBOOK_LIMIT", "Báo cáo đầy đủ vượt dung lượng xử lý an toàn. Chia thành các đợt ít ngày hoặc ít dòng hơn rồi xuất lại.");
  }
  const lastInput = FIRST + inputCapacity - 1;
  const lastCustom = FIRST + customCapacity - 1;
  const lastData = FIRST + Math.max(1, foods.length) - 1;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dinh dưỡng 2598";
  workbook.title = menu.title;
  workbook.created = new Date(menu.generatedAt);
  workbook.calcProperties.fullCalcOnLoad = true;
  if (complete) for (const name of ["Bao cao", "Thuc don", "Thanh phan day du", ...(menu.days.length > 1 ? ["Dinh duong theo ngay"] : []), "Nguon doi soat"]) workbook.addWorksheet(name);
  const analysis = workbook.addWorksheet(SHEETS.analysis);
  const comparison = workbook.addWorksheet(SHEETS.comparison);
  const targetSheet = workbook.addWorksheet(SHEETS.targets);
  const input = workbook.addWorksheet(SHEETS.input);
  const meals = workbook.addWorksheet(SHEETS.meals);
  const dishes = workbook.addWorksheet(SHEETS.dishes);
  const shopping = workbook.addWorksheet(SHEETS.shopping);
  const custom = workbook.addWorksheet(SHEETS.custom);
  const data = workbook.addWorksheet(SHEETS.data);
  const sourceBuild = workbook.addWorksheet("_source", { state: "veryHidden" });
  const lists = workbook.addWorksheet("_lists", { state: "veryHidden" });
  ALL_NUTRIENT_FIELDS.forEach((field, index) => { lists.getCell(index + 1, 1).value = field.key; });
  workbook.definedNames.add(`'_lists'!$A$1:$A$${ALL_NUTRIENT_FIELDS.length}`, "NutrientKeys");
  const nutrientHeaders = fields.map(field => `${field.label} (${field.unit})`);
  const persistenceLabel = menu.savedRecord ? `Bản nền đã lưu: ${menu.savedRecord.id} · phiên bản ${menu.savedRecord.revision}. Sửa Excel không tự đồng bộ. ` : "Chưa lưu hệ thống. ";
  heading(analysis, `Dinh dưỡng 2598 · ${menu.title}`, `${persistenceLabel}Kết quả tự cập nhật khi sửa ô vàng. Số đã biết và dòng thiếu được hiển thị riêng; tổng thiếu chưa đầy đủ. P/L/G chỉ hiện khi đủ ba chất.`, ["Ngày", "Nhãn / thời gian", "Dòng đã chọn", ...nutrientHeaders.flatMap(label => [label, "Dòng thiếu"]), "P (% NL)", "L (% NL)", "G (% NL)", "Mục tiêu kcal", "Kcal / mục tiêu", "Chênh kcal"], [11, 28, 15, ...fields.flatMap(() => [17, 12]), 13, 13, 13, 18, 18, 18]);
  heading(targetSheet, "Ngày và mục tiêu", "Ô vàng sửa được. Thêm ngày bằng điền nhãn và ngày ISO (YYYY-MM-DD); cột số ngày dùng trong bảng nhập. Mục tiêu tùy chọn, theo một ngày; không có mục tiêu thì không kết luận đạt/thiếu. Sửa mức phải ghi rõ nguồn do người dùng điều chỉnh.", ["Số ngày", "ID ngày", "Nhãn ngày", "Ngày (YYYY-MM-DD)", "Chất", "Mục tiêu / ngày", "Nguồn mục tiêu", "Giới hạn trên?"], [11, 28, 28, 22, 24, 20, 48, 18]);
  heading(input, "Nhập khẩu phần · ô vàng sửa được", `Tối đa ${inputCapacity} dòng, 90 ngày. Chọn Food ID để tránh trùng tên; tên/nguồn hiện ở bên phải. Nguồn ngoài kho chọn ID tự nhập và để Food ID trống. Lượng × số suất; ml không tự thành g. Sống cần thải bỏ; chín cần hệ số và nguồn quy đổi.`, ["ID dòng", "Số ngày", "Bữa", "Món", "Food ID", "ID tự nhập", "Lượng / suất", "Đơn vị", "Số suất", "Trạng thái lượng", "Hệ số chín → nguồn", "Nguồn hệ số", "Mật độ (g/ml)", "Nguồn mật độ", "Tên thực tế / tham chiếu", "Chấp nhận ước tính?", "Vị trí nguồn", "Bảng nguồn", "Tên đã chọn", "Nguồn số liệu", "Đơn vị nguồn", "Thải bỏ (%)", "Lượng nguồn ăn được", "Ăn được (g)", "Mua (g)", "Cảnh báo", "Nguồn công thức", "Ghi chú", ...nutrientHeaders], [28, 11, 18, 27, 29, 25, 17, 11, 12, 20, 20, 38, 19, 38, 30, 19, 10, 13, 30, 40, 15, 16, 22, 18, 18, 45, 46, 40, ...fields.map(() => 18)]);
  heading(shopping, "Đi chợ · cả đợt", "Gộp theo ID, không gộp nhầm thực phẩm trùng tên. Khối lượng mua chỉ tính khi có tỷ lệ thải bỏ và quy đổi g hợp lệ. Dòng thiếu vẫn hiện cảnh báo; số đã biết chưa phải toàn bộ lượng cần mua.", ["Loại", "Food / nguồn ID", "Tên", "Dòng sử dụng", "Ăn được đã biết (g)", "Dòng thiếu g", "Mua đã biết (g)", "Dòng thiếu mua", "Nguồn", "Trạng thái"], [13, 29, 35, 15, 25, 17, 25, 20, 42, 45]);
  heading(custom, "Nguồn tự nhập · ngoài kho / ghi đè riêng", "Chỉ nhập số trên nhãn hoặc tài liệu có nguồn. Trống = thiếu, 0 = có số liệu bằng 0. Mỗi ID riêng; để dùng: điền ID tự nhập trong khẩu phần, xóa Food ID. Không chỉnh dữ liệu chuẩn ở Du lieu. Theo phần cần lượng phần và đơn vị.", ["ID tự nhập", "Tên thực phẩm", "Loại nguồn", "Nguồn / nhãn", "URL nguồn", "Đã xác nhận?", "Cơ sở số liệu", "Lượng mỗi phần", "Đơn vị phần", "Thải bỏ (%)", "Nhóm thực phẩm", ...sourceFields.map(field => `${field.label} (${field.unit}/cơ sở)`)], [25, 34, 19, 45, 48, 18, 20, 20, 16, 19, 26, ...sourceFields.map(() => 22)]);
  heading(data, "Danh mục chuẩn · chỉ đọc", `Phiên bản ${menu.dataVersion}; xuất ${menu.generatedAt}. Số liệu trên 100 đơn vị g hoặc ml theo cột đơn vị. Trống là chưa có dữ liệu hoặc cần xác minh; 0 là số nguồn. Đổi Food ID trong bảng nhập để chọn lại. Cảnh báo nguồn ở cột cuối.`, ["Food ID", "Tên", "Đơn vị", "Loại nguồn", "Nguồn", "URL nguồn", "Đã xác nhận?", "Thải bỏ (%)", "Nhóm thực phẩm", ...sourceFields.map(field => `${field.label} (${field.unit}/100 đơn vị)`), "Cảnh báo chất lượng nguồn"], [29, 35, 13, 18, 46, 48, 18, 18, 27, ...sourceFields.map(() => 23), 65]);
  foods.forEach((food, index) => { data.getRow(FIRST + index).values = [food.id, food.name, food.unit, food.source.kind, food.source.label, food.source.url ?? "", food.source.confirmed ? "Có" : "Không", food.wastePercent, food.foodGroup ?? "", ...sourceFields.map(field => food.nutrients[field.key] ?? undefined), food.qualityWarnings?.join("; ") ?? ""]; });
  for (let i = 0; i < customCapacity; i++) {
    const item = customs[i];
    if (item) custom.getRow(FIRST + i).values = [item.id, item.name, item.source.kind, item.source.label, item.source.url ?? "", item.source.confirmed ? "Có" : "Không", item.basis, item.portionAmount ?? null, item.portionUnit ?? "g", item.wastePercent ?? null, item.foodGroup ?? "", ...sourceFields.map(field => item.nutrients[field.key] ?? null)];
    const row = FIRST + i;
    list(custom.getCell(row, 3), '"label,document,user,unknown"');
    list(custom.getCell(row, 6), '"Có,Không"'); list(custom.getCell(row, 7), '"100g,100ml,portion"'); list(custom.getCell(row, 9), '"g,ml"');
    decimal(custom.getCell(row, 8), 1000000, 0.000001); decimal(custom.getCell(row, 10), 99.999);
    sourceFields.forEach((_, fieldIndex) => decimal(custom.getCell(row, 12 + fieldIndex), 1000000));
  }
  for (let i = 0; i < WORKBOOK_LIMITS.days; i++) {
    const day = menu.days[i];
    const target = menu.targets[i];
    targetSheet.getRow(FIRST + i).values = [i + 1, day?.id ?? `excel-day-${i + 1}`, day?.label ?? "", day?.date ?? "", target?.key ?? "", target?.value ?? null, target?.source ?? "", target?.isUpperLimit ? "Có" : "Không"];
    list(targetSheet.getCell(FIRST + i, 5), "NutrientKeys");
    decimal(targetSheet.getCell(FIRST + i, 6), 1000000);
    list(targetSheet.getCell(FIRST + i, 8), '"Có,Không"');
  }
  workbook.definedNames.add(`${q(SHEETS.data)}!$A$${FIRST}:$A$${lastData}`, "FoodIds");
  workbook.definedNames.add(`${q(SHEETS.custom)}!$A$${FIRST}:$A$${lastCustom}`, "CustomIds");
  const source = (row: number, dataColumn: number, customColumn: number, nullable = false) => {
    const canonical = `INDEX(${range(SHEETS.data, col(dataColumn), lastData)},$Q${row})`;
    const user = `INDEX(${range(SHEETS.custom, col(customColumn), lastCustom)},$Q${row})`;
    const selected = `IF($R${row}="custom",${user},${canonical})`;
    if (!nullable) return `IF($Q${row}="","",${selected})`;
    return `IF($Q${row}="","",IF(IF($R${row}="custom",COUNT(${user}),COUNT(${canonical}))=0,"",${selected}))`;
  };
  for (let i = 0; i < inputCapacity; i++) {
    const selected = rows[i];
    const row = FIRST + i;
    const item = selected?.row;
    const sourceId = item?.customFood?.id;
    const day = selected ? menu.days.findIndex(value => value.id === selected.day.id) + 1 : null;
    input.getRow(row).values = [item?.id ?? `excel-row-${i + 1}`, day, item?.meal ?? "", item?.dish ?? "", sourceId ? "" : item?.foodId ?? "", sourceId ?? "", item?.quantity ?? null, item?.unit ?? "g", item?.servings ?? 1, item?.basis ?? "edible", item?.conversionFactor ?? null, item?.conversionSource ?? "", item?.densityGPerMl ?? null, item?.densitySource ?? "", item?.actualFoodName ?? "", item?.estimateAccepted ? "Có" : "Không"];
    input.getCell(row, 27).value = item ? `${item.recipeSource.kind}: ${item.recipeSource.label}${item.recipeSource.dishId ? ` | Dish ${item.recipeSource.dishId}` : ""}${item.replacedFromFoodId ? ` | Thay từ ${item.replacedFromFoodId}` : ""}` : "user: Bổ sung trong Excel";
    input.getCell(row, 28).value = item?.note ?? "";
    const active = `OR($E${row}<>"",$F${row}<>"")`;
    formula(input.getCell(row, 18), `IF(${active},IF($F${row}<>"","custom","catalog"),"")`, item ? sourceId ? "custom" : "catalog" : "");
    const customMatch = `MATCH($F${row},${range(SHEETS.custom, "A", lastCustom)},0)`;
    const foodMatch = `MATCH($E${row},${range(SHEETS.data, "A", lastData)},0)`;
    formula(input.getCell(row, 17), `IF(NOT(${active}),"",IF($R${row}="custom",IF(ISNA(${customMatch}),"",${customMatch}),IF(ISNA(${foodMatch}),"",${foodMatch})))`, item ? sourceId ? customs.findIndex(food => food.id === sourceId) + 1 : foods.findIndex(food => food.id === item.foodId) + 1 : "");
    formula(input.getCell(row, 19), source(row, 2, 2), item?.food.name ?? "");
    formula(input.getCell(row, 20), source(row, 5, 4), item?.food.source.label ?? "");
    const customBasis = `INDEX(${range(SHEETS.custom, "G", lastCustom)},$Q${row})`;
    const customUnit = `INDEX(${range(SHEETS.custom, "I", lastCustom)},$Q${row})`;
    formula(input.getCell(row, 21), `IF($Q${row}="","",IF($R${row}="custom",IF(${customBasis}="100g","g",IF(${customBasis}="100ml","ml",${customUnit})),INDEX(${range(SHEETS.data, "C", lastData)},$Q${row})))`, item?.food.unit ?? "");
    formula(input.getCell(row, 22), source(row, 8, 10, true), item?.food.wastePercent ?? "");
    const unitFactor = `IF($H${row}=$U${row},1,IF(AND(ISNUMBER($M${row}),$M${row}>0,$N${row}<>""),IF($H${row}="ml",$M${row},1/$M${row}),""))`;
    const basisFactor = `IF($J${row}="edible",1,IF($J${row}="raw",IF(ISNUMBER($V${row}),1-$V${row}/100,""),IF(AND(ISNUMBER($K${row}),$K${row}>0,$L${row}<>""),$K${row},"")))`;
    // Excel AND evaluates every argument. Guard custom INDEX with IF first:
    // a catalogue match can exceed the much smaller custom-source row range.
    formula(input.getCell(row, 26), `IF(NOT(${active}),"",IF(AND($E${row}<>"",$F${row}<>""),"Chỉ chọn một nguồn",IF($Q${row}="","ID không có trong danh mục",IF(OR(NOT(ISNUMBER($B${row})),$B${row}<1,$B${row}>${WORKBOOK_LIMITS.days},$C${row}="",$D${row}=""),"Thiếu ngày/bữa/món",IF(OR(NOT(ISNUMBER($G${row})),$G${row}<0,NOT(ISNUMBER($I${row})),$I${row}<=0),"Thiếu hoặc sai lượng/số suất",IF(AND($H${row}<>$U${row},OR(NOT(ISNUMBER($M${row})),$M${row}<=0,$N${row}="")),"Thiếu mật độ và nguồn g/ml",IF(AND($J${row}="raw",NOT(ISNUMBER($V${row}))),"Thiếu tỷ lệ thải bỏ",IF(AND($J${row}="cooked",OR(NOT(ISNUMBER($K${row})),$K${row}<=0,$L${row}="")),"Thiếu hệ số và nguồn quy đổi",IF(IF($R${row}="custom",AND(${customBasis}="portion",OR(NOT(ISNUMBER(INDEX(${range(SHEETS.custom, "H", lastCustom)},$Q${row}))),INDEX(${range(SHEETS.custom, "H", lastCustom)},$Q${row})<=0)),FALSE),"Thiếu lượng mỗi phần",IF(AND($R${row}="custom",COUNTIF(${range(SHEETS.custom, "A", lastCustom)},$F${row})<>1),"ID tự nhập bị trùng",""))))))))))`, item?.warnings.join("; ") ?? "");
    formula(input.getCell(row, 23), `IF(OR(NOT(${active}),$Z${row}<>""),"",$G${row}*$I${row}*${unitFactor}*${basisFactor})`, item?.referenceAmount ?? "");
    formula(input.getCell(row, 24), `IF(NOT(ISNUMBER($W${row})),"",IF($U${row}="g",$W${row},IF(AND(ISNUMBER($M${row}),$M${row}>0,$N${row}<>""),$W${row}*$M${row},"")))`, item?.edibleGrams ?? "");
    formula(input.getCell(row, 25), `IF(OR(NOT(ISNUMBER($X${row})),NOT(ISNUMBER($V${row})),$V${row}>=100),"",$X${row}/(1-$V${row}/100))`, item?.rawGrams ?? "");
    const sourceIndex = `$${col(sourceFields.length + 2)}${row}`;
    const sourceTable = `$${col(sourceFields.length + 3)}${row}`;
    const sourceQuantity = `$${col(sourceFields.length + 4)}${row}`;
    const sourcePortion = `$${col(sourceFields.length + 5)}${row}`;
    formula(sourceBuild.getCell(row, sourceFields.length + 2), `${q(SHEETS.input)}!Q${row}`);
    formula(sourceBuild.getCell(row, sourceFields.length + 3), `${q(SHEETS.input)}!R${row}`);
    formula(sourceBuild.getCell(row, sourceFields.length + 4), `${q(SHEETS.input)}!W${row}`);
    const portionSize = `INDEX(${range(SHEETS.custom, "H", lastCustom)},${sourceIndex})`;
    formula(sourceBuild.getCell(row, sourceFields.length + 5), `IF(${sourceIndex}="","",IF(${sourceTable}="custom",IF(INDEX(${range(SHEETS.custom, "G", lastCustom)},${sourceIndex})="portion",IF(AND(ISNUMBER(${portionSize}),${portionSize}>0),100/${portionSize},""),1),1))`);
    if (complete) formula(sourceBuild.getCell(row, sourceFields.length + 6), `IF(${sourceIndex}="","",IF(${sourceTable}="custom",IF(INDEX(${range(SHEETS.custom, "K", lastCustom)},${sourceIndex})="","Chưa phân nhóm",INDEX(${range(SHEETS.custom, "K", lastCustom)},${sourceIndex})),IF(INDEX(${range(SHEETS.data, "I", lastData)},${sourceIndex})="","Chưa phân nhóm",INDEX(${range(SHEETS.data, "I", lastData)},${sourceIndex}))))`, item?.food.foodGroup || (item ? "Chưa phân nhóm" : ""));
    sourceFields.forEach((field, index) => {
      const canonical = `INDEX(${range(SHEETS.data, col(10 + index), lastData)},${sourceIndex})`;
      const user = `INDEX(${range(SHEETS.custom, col(12 + index), lastCustom)},${sourceIndex})`;
      formula(sourceBuild.getCell(row, index + 1), `IF(${sourceIndex}="","",IF(${sourceTable}="custom",IF(OR(COUNT(${user})=0,NOT(ISNUMBER(${sourceQuantity})),INDEX(${range(SHEETS.custom, "C", lastCustom)},${sourceIndex})="unknown"),"",${user}*${sourcePortion}),IF(COUNT(${canonical})=0,"",${canonical})))`, item?.food.nutrients[field.key] ?? "");
    });
    const macroReferences = ["proteinG", "lipidG", "glucidG"].map(key => `${col(sourceFields.findIndex(field => field.key === key) + 1)}${row}`);
    const qualityColumn = sourceFields.length + 1;
    formula(sourceBuild.getCell(row, qualityColumn), `AND(${q(SHEETS.input)}!$U${row}="g",COUNT(${macroReferences.join(",")})=3,SUM(${macroReferences.join(",")})>110)`, false);
    fields.forEach((field, fieldIndex) => {
      const amount = `${q("_source")}!${col(fieldIndex + 1)}${row}`;
      const invalidUnit = field.unit === "g" ? `AND($U${row}="g",${amount}>100),` : field.key === "energyKcal" ? `AND($U${row}="g",${amount}>1000),` : "";
      const invalidMacros = ["energyKcal", "proteinG", "lipidG", "glucidG"].includes(field.key) ? `${q("_source")}!${col(qualityColumn)}${row},` : "";
      const result = item?.referenceAmount === 0 ? 0 : item?.referenceAmount !== null && item?.referenceAmount !== undefined && finite(item.food.nutrients[field.key]) ? item.referenceAmount * item.food.nutrients[field.key]! / 100 : "";
      formula(input.getCell(row, 29 + fieldIndex), `IF(NOT(ISNUMBER($W${row})),"",IF($W${row}=0,0,IF(OR(${invalidUnit}${invalidMacros}NOT(ISNUMBER(${amount})),${amount}<0),"",${amount}*$W${row}/100)))`, result);
    });
    decimal(input.getCell(row, 2), WORKBOOK_LIMITS.days, 1); list(input.getCell(row, 5), "FoodIds"); list(input.getCell(row, 6), "CustomIds");
    decimal(input.getCell(row, 7)); decimal(input.getCell(row, 9), 10000, 0.000001); decimal(input.getCell(row, 11), 1000, 0.000001); decimal(input.getCell(row, 13), 100, 0.000001);
    list(input.getCell(row, 8), '"g,ml"'); list(input.getCell(row, 10), '"edible,raw,cooked"'); list(input.getCell(row, 16), '"Có,Không"');
  }
  input.getColumn(17).hidden = true; input.getColumn(18).hidden = true;
  styleRows(input, lastInput, [...Array.from({ length: 15 }, (_, i) => i + 2), 28]);
  styleRows(custom, lastCustom, Array.from({ length: custom.columnCount }, (_, i) => i + 1));
  styleRows(data, lastData, [], complete);
  styleRows(targetSheet, FIRST + WORKBOOK_LIMITS.days - 1, [3, 4, 5, 6, 7, 8]);
  textColumns(input, [1, 3, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 19, 20, 21, 26, 27, 28], lastInput);
  textColumns(custom, [1, 2, 3, 4, 5, 6, 7, 9, 11], lastCustom);
  textColumns(data, [1, 2, 3, 4, 5, 6, 7, 9, 10 + sourceFields.length], lastData);
  textColumns(targetSheet, [2, 3, 4, 5, 7, 8], FIRST + WORKBOOK_LIMITS.days - 1);
  const editableFormulaComparison = `SUMPRODUCT(--(${q(SHEETS.input)}!B${FIRST}:P${lastInput}<>${q(SHEETS.originalInput)}!B${FIRST}:P${lastInput}))+SUMPRODUCT(--(${q(SHEETS.input)}!AB${FIRST}:AB${lastInput}<>${q(SHEETS.originalInput)}!AB${FIRST}:AB${lastInput}))+SUMPRODUCT(--(${q(SHEETS.custom)}!A${FIRST}:${col(custom.columnCount)}${lastCustom}<>${q(SHEETS.originalCustom)}!A${FIRST}:${col(custom.columnCount)}${lastCustom}))+SUMPRODUCT(--(${q(SHEETS.targets)}!C${FIRST}:H${FIRST + WORKBOOK_LIMITS.days - 1}<>${q(SHEETS.originalTargets)}!C${FIRST}:H${FIRST + WORKBOOK_LIMITS.days - 1}))`;
  analysis.mergeCells("A4:L4");
  formula(analysis.getCell("A4"), `IF((${editableFormulaComparison})>0,"Đã sửa Excel · nhận xét AI và kết quả web lúc xuất cần cập nhật","Chưa sửa đầu vào · nhận xét AI là bản tại thời điểm xuất")`, "Chưa sửa đầu vào · nhận xét AI là bản tại thời điểm xuất");
  analysis.getCell("A4").font = { color: { argb: "935A12" }, bold: true, size: 11 };
  analysis.getCell("A4").alignment = { wrapText: true }; analysis.getRow(4).height = 30;
  const activeRows = `--((LEN(${range(SHEETS.input, "E", lastInput)})+LEN(${range(SHEETS.input, "F", lastInput)}))>0)`;
  const activeCount = (dayNumber?: number) => dayNumber === undefined ? `SUMPRODUCT(${activeRows})` : `SUMPRODUCT(--(${range(SHEETS.input, "B", lastInput)}=$A${FIRST + dayNumber - 1}),${activeRows})`;
  for (let dayIndex = 0; dayIndex < WORKBOOK_LIMITS.days; dayIndex++) {
    const row = FIRST + dayIndex;
    const day = menu.dayTotals[dayIndex];
    analysis.getCell(row, 1).value = dayIndex + 1;
    formula(analysis.getCell(row, 2), `IF(${q(SHEETS.targets)}!C${row}="","",${q(SHEETS.targets)}!C${row}&IF(${q(SHEETS.targets)}!D${row}="",""," · "&${q(SHEETS.targets)}!D${row}))`, day ? `${day.label}${day.date ? ` · ${day.date}` : ""}` : "");
    formula(analysis.getCell(row, 3), activeCount(dayIndex + 1), menu.days[dayIndex]?.rows.length ?? 0);
    fields.forEach((field, fieldIndex) => {
      const nutrientColumn = col(29 + fieldIndex);
      const known = `SUMPRODUCT(--(${range(SHEETS.input, "B", lastInput)}=$A${row}),--ISNUMBER(${range(SHEETS.input, nutrientColumn, lastInput)}))`;
      formula(analysis.getCell(row, 4 + fieldIndex * 2), `IF(${known}=0,"",SUMIF(${range(SHEETS.input, "B", lastInput)},$A${row},${range(SHEETS.input, nutrientColumn, lastInput)}))`, day?.totals[field.key]?.value ?? "");
      formula(analysis.getCell(row, 5 + fieldIndex * 2), `MAX(0,$C${row}-${known})`, day?.totals[field.key]?.missingRows.length ?? 0);
    });
  }
  const totalRow = FIRST + WORKBOOK_LIMITS.days + 1;
  const averageRow = totalRow + 1;
  analysis.getCell(totalRow, 2).value = "TỔNG CẢ ĐỢT";
  analysis.getCell(averageRow, 2).value = "TRUNG BÌNH NGÀY CÓ NHẬP";
  formula(analysis.getCell(totalRow, 3), activeCount(), rows.length);
  formula(analysis.getCell(averageRow, 3), `COUNTIF(C${FIRST}:C${FIRST + WORKBOOK_LIMITS.days - 1},">0")`, menu.days.filter(day => day.rows.length > 0).length);
  fields.forEach((field, i) => {
    const valueColumn = col(4 + i * 2);
    const missingColumn = col(5 + i * 2);
    formula(analysis.getCell(totalRow, 4 + i * 2), `IF(COUNT(${valueColumn}${FIRST}:${valueColumn}${FIRST + WORKBOOK_LIMITS.days - 1})=0,"",SUM(${valueColumn}${FIRST}:${valueColumn}${FIRST + WORKBOOK_LIMITS.days - 1}))`, menu.totals[field.key]?.value ?? "");
    formula(analysis.getCell(totalRow, 5 + i * 2), `SUM(${missingColumn}${FIRST}:${missingColumn}${FIRST + WORKBOOK_LIMITS.days - 1})`, menu.totals[field.key]?.missingRows.length ?? 0);
    formula(analysis.getCell(averageRow, 4 + i * 2), `IF(OR(NOT(ISNUMBER(${valueColumn}${totalRow})),$C${averageRow}=0),"",${valueColumn}${totalRow}/$C${averageRow})`, typeof menu.totals[field.key]?.value === "number" && menu.days.filter(day => day.rows.length > 0).length > 0 ? menu.totals[field.key]!.value! / menu.days.filter(day => day.rows.length > 0).length : "");
    formula(analysis.getCell(averageRow, 5 + i * 2), `${missingColumn}${totalRow}`, menu.totals[field.key]?.missingRows.length ?? 0);
  });
  const macroColumn = 4 + fields.length * 2;
  const macroKeys = ["proteinG", "lipidG", "glucidG"];
  const macros = macroKeys.map(key => fields.findIndex(field => field.key === key));
  const energyIndex = fields.findIndex(field => field.key === "energyKcal");
  analysis.mergeCells("A5:L5");
  const totalEnergyRef = `${col(4 + energyIndex * 2)}${totalRow}`;
  const averageEnergyRef = `${col(4 + energyIndex * 2)}${averageRow}`;
  formula(analysis.getCell("A5"), energyIndex < 0 ? `"Số dòng đã chọn: "&C${totalRow}&" · Ngày có nhập: "&C${averageRow}` : `"Tổng đã biết: "&IF(ISNUMBER(${totalEnergyRef}),TEXT(${totalEnergyRef},"0.0"),"—")&" kcal · TB/ngày có nhập: "&IF(ISNUMBER(${averageEnergyRef}),TEXT(${averageEnergyRef},"0.0"),"—")&" kcal · Ngày có nhập: "&C${averageRow}`);
  analysis.getCell("A5").font = { name: "Calibri", size: 13, bold: true, color: { argb: GREEN } };
  analysis.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } }; analysis.getCell("A5").alignment = { wrapText: true }; analysis.getRow(5).height = 33;
  for (const row of [...Array.from({ length: WORKBOOK_LIMITS.days }, (_, i) => FIRST + i), totalRow, averageRow]) {
    const refs = macros.map(i => `${col(4 + i * 2)}${row}`);
    const missing = macros.map(i => `${col(5 + i * 2)}${row}`);
    const denominator = `(${refs[0]}*4+${refs[1]}*9+${refs[2]}*4)`;
    for (let i = 0; i < 3; i++) formula(analysis.getCell(row, macroColumn + i), macros.some(index => index < 0) ? '""' : `IF(OR(COUNT(${refs.join(",")})<3,SUM(${missing.join(",")})>0),"",IF(${denominator}=0,"",${refs[i]}*${i === 1 ? 9 : 4}/${denominator}))`);
    for (let i = 0; i < 3; i++) analysis.getCell(row, macroColumn + i).numFmt = "0.0%";
    const targetValue = `SUMIF(${range(SHEETS.targets, "E", FIRST + WORKBOOK_LIMITS.days - 1)},"energyKcal",${range(SHEETS.targets, "F", FIRST + WORKBOOK_LIMITS.days - 1)})`;
    const targetCount = `SUMPRODUCT(--(${range(SHEETS.targets, "E", FIRST + WORKBOOK_LIMITS.days - 1)}="energyKcal"),--ISNUMBER(${range(SHEETS.targets, "F", FIRST + WORKBOOK_LIMITS.days - 1)}))`;
    formula(analysis.getCell(row, macroColumn + 3), `IF(${targetCount}=0,"",${targetValue}${row === totalRow ? `*$C${averageRow}` : ""})`);
    const energyRef = `${col(4 + energyIndex * 2)}${row}`;
    const incompleteRef = `${col(5 + energyIndex * 2)}${row}`;
    const targetRef = `${col(macroColumn + 3)}${row}`;
    formula(analysis.getCell(row, macroColumn + 4), energyIndex < 0 ? '""' : `IF(OR(NOT(ISNUMBER(${targetRef})),NOT(ISNUMBER(${energyRef})),${incompleteRef}>0),"",IF(${targetRef}=0,"",${energyRef}/${targetRef}))`);
    analysis.getCell(row, macroColumn + 4).numFmt = "0.0%";
    formula(analysis.getCell(row, macroColumn + 5), energyIndex < 0 ? '""' : `IF(OR(NOT(ISNUMBER(${targetRef})),NOT(ISNUMBER(${energyRef})),${incompleteRef}>0),"",${energyRef}-${targetRef})`);
  }
  styleRows(analysis, averageRow);
  for (let row = FIRST; row <= averageRow; row++) {
    for (let i = 0; i < 3; i++) analysis.getCell(row, macroColumn + i).numFmt = "0.0%";
    analysis.getCell(row, macroColumn + 4).numFmt = "0.0%";
  }
  for (const row of [totalRow, averageRow]) analysis.getRow(row).eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row === totalRow ? GREEN : LIGHT } }; cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: row === totalRow ? "FFFFFF" : GREEN } }; });
  heading(comparison, "Đối chiếu mục tiêu · trung bình ngày có nhập", "Mục tiêu lấy từ Ngay va muc tieu. Thiếu dữ liệu thì chỉ hiện số đã biết và dòng thiếu; không kết luận đạt/thiếu/vượt. Đây là so sánh số học, không tự thay chỉ định chuyên môn. Chất chưa chọn phân tích thì chưa có kết quả.", ["Chất", "Đơn vị", "Trung bình / ngày", "Dòng thiếu cả đợt", "Mục tiêu / ngày", "Tỷ lệ / mục tiêu", "Chênh lệch", "Giới hạn trên?", "Nguồn mục tiêu", "Trạng thái"], [27, 13, 23, 24, 23, 22, 21, 20, 48, 50]);
  for (let i = 0; i < WORKBOOK_LIMITS.days; i++) {
    const row = FIRST + i;
    const keyRef = `${q(SHEETS.targets)}!E${row}`;
    formula(comparison.getCell(row, 1), `IF(${keyRef}="","",${keyRef})`);
    const sourceRef = `${q(SHEETS.targets)}!G${row}`;
    const baselineTarget = menu.targets[i];
    const original = `${q(SHEETS.originalTargets)}!F${row}`;
    const originalUpper = `${q(SHEETS.originalTargets)}!H${row}`;
    formula(comparison.getCell(row, 9), `IF(A${row}="","",IF(OR(${q(SHEETS.targets)}!F${row}<>${original},${q(SHEETS.targets)}!H${row}<>${originalUpper}),"Người dùng điều chỉnh từ "&${sourceRef},${sourceRef}))`, baselineTarget?.source ?? "");
    formula(comparison.getCell(row, 5), `IF(OR(A${row}="",NOT(ISNUMBER(${q(SHEETS.targets)}!F${row}))),"",${q(SHEETS.targets)}!F${row})`);
    formula(comparison.getCell(row, 8), `IF(A${row}="","",${q(SHEETS.targets)}!H${row})`);
    const lookup = (column: string) => `IF(A${row}="","",IFERROR(INDEX('_lists'!$${column}$1:$${column}$${ALL_NUTRIENT_FIELDS.length},MATCH(A${row},NutrientKeys,0)),""))`;
    const valueLookup = lookup("C"), missingLookup = lookup("D"), unitLookup = lookup("B");
    formula(comparison.getCell(row, 2), unitLookup); formula(comparison.getCell(row, 3), valueLookup); formula(comparison.getCell(row, 4), missingLookup);
    formula(comparison.getCell(row, 6), `IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(E${row})),E${row}<=0,D${row}>0),"",C${row}/E${row})`);
    formula(comparison.getCell(row, 7), `IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(E${row})),D${row}>0),"",C${row}-E${row})`);
    formula(comparison.getCell(row, 10), `IF(A${row}="","",IF(B${row}="","Chất chưa được chọn phân tích",IF(NOT(ISNUMBER(E${row})),"Chưa có mục tiêu",IF(OR(D${row}>0,NOT(ISNUMBER(C${row}))),"Chưa đủ dữ liệu để kết luận",IF(H${row}="Có",IF(C${row}>E${row},"Vượt giới hạn trên","Không vượt giới hạn trên"),IF(C${row}<E${row},"Dưới mục tiêu",IF(C${row}>E${row},"Trên mục tiêu","Bằng mục tiêu")))))))`);
  }
  ALL_NUTRIENT_FIELDS.forEach((field, index) => {
    const selected = fields.findIndex(item => item.key === field.key);
    if (selected < 0) return;
    lists.getCell(index + 1, 2).value = field.unit;
    lists.getCell(index + 1, 5).value = field.label;
    formula(lists.getCell(index + 1, 3), `${q(SHEETS.analysis)}!${col(4 + selected * 2)}${averageRow}`);
    formula(lists.getCell(index + 1, 4), `${q(SHEETS.analysis)}!${col(5 + selected * 2)}${totalRow}`);
  });
  styleRows(comparison, FIRST + WORKBOOK_LIMITS.days - 1);
  textColumns(comparison, [1, 2, 8, 9, 10], FIRST + WORKBOOK_LIMITS.days - 1);
  for (let row = FIRST; row < FIRST + WORKBOOK_LIMITS.days; row++) comparison.getCell(row, 6).numFmt = "0.0%";
  const groupFields = fields.filter(field => ["energyKcal", "proteinG", "lipidG", "glucidG"].includes(field.key));
  for (const [groupSheet, includeDish] of [[meals, false], [dishes, true]] as const) {
    heading(groupSheet, includeDish ? "Tổng theo món · trong từng ngày/bữa" : "Tổng theo bữa · trong từng ngày", "Các chất trọng tâm tự cập nhật khi sửa ngày, tên bữa hoặc tên món. Mỗi nhóm hiện một lần tại dòng đầu tiên; dùng bộ lọc cột ngày để ẩn dòng trống. Vi chất và nguồn đầy đủ xem Phan tich / Nhap khau phan.", ["Số ngày", "Nhãn ngày", "Bữa", "Món", "Dòng nguyên liệu", ...groupFields.flatMap(field => [`${field.label} (${field.unit})`, "Dòng thiếu"])], [13, 28, 20, 32, 23, ...groupFields.flatMap(() => [23, 18])]);
    for (let i = 0; i < inputCapacity; i++) {
      const row = FIRST + i;
      const references = [`--(${q(SHEETS.input)}!$B$${FIRST}:$B$${row}=${q(SHEETS.input)}!B${row})`, `--(${q(SHEETS.input)}!$C$${FIRST}:$C$${row}=${q(SHEETS.input)}!C${row})`, ...(includeDish ? [`--(${q(SHEETS.input)}!$D$${FIRST}:$D$${row}=${q(SHEETS.input)}!D${row})`] : []), `--((LEN(${q(SHEETS.input)}!$E$${FIRST}:$E$${row})+LEN(${q(SHEETS.input)}!$F$${FIRST}:$F$${row}))>0)`];
      formula(groupSheet.getCell(row, 1), `IF(AND(OR(${q(SHEETS.input)}!E${row}<>"",${q(SHEETS.input)}!F${row}<>""),SUMPRODUCT(${references.join(",")})=1),${q(SHEETS.input)}!B${row},"")`);
      formula(groupSheet.getCell(row, 2), `IF(A${row}="","",INDEX(${range(SHEETS.targets, "C", FIRST + WORKBOOK_LIMITS.days - 1)},A${row}))`);
      formula(groupSheet.getCell(row, 3), `IF(A${row}="","",${q(SHEETS.input)}!C${row})`);
      formula(groupSheet.getCell(row, 4), includeDish ? `IF(A${row}="","",${q(SHEETS.input)}!D${row})` : `IF(A${row}="","","Tất cả món")`);
      const criteria = [`--(${range(SHEETS.input, "B", lastInput)}=$A${row})`, `--(${range(SHEETS.input, "C", lastInput)}=$C${row})`, ...(includeDish ? [`--(${range(SHEETS.input, "D", lastInput)}=$D${row})`] : [])];
      formula(groupSheet.getCell(row, 5), `IF(A${row}="","",SUMPRODUCT(${criteria.join(",")},${activeRows}))`);
      groupFields.forEach((field, index) => {
        const nutrientRange = range(SHEETS.input, col(29 + fields.findIndex(selected => selected.key === field.key)), lastInput);
        const known = `SUMPRODUCT(${criteria.join(",")},--ISNUMBER(${nutrientRange}))`;
        formula(groupSheet.getCell(row, 6 + index * 2), `IF(OR(A${row}="",${known}=0),"",SUMIFS(${nutrientRange},${range(SHEETS.input, "B", lastInput)},$A${row},${range(SHEETS.input, "C", lastInput)},$C${row}${includeDish ? `,${range(SHEETS.input, "D", lastInput)},$D${row}` : ""}))`);
        formula(groupSheet.getCell(row, 7 + index * 2), `IF(A${row}="","",E${row}-${known})`);
      });
    }
    styleRows(groupSheet, lastInput);
    textColumns(groupSheet, [2, 3, 4], lastInput);
  }
  const noteRow = averageRow + 3;
  analysis.mergeCells(noteRow, 1, noteRow, 12); analysis.getCell(noteRow, 1).value = "Nhận xét AI · bản tại thời điểm xuất (không tự viết lại khi sửa Excel)";
  analysis.getCell(noteRow, 1).font = { bold: true, color: { argb: GREEN }, size: 12 };
  analysis.mergeCells(noteRow + 1, 1, noteRow + 3, 12); analysis.getCell(noteRow + 1, 1).value = menu.aiComment || "Chưa có nhận xét AI.";
  analysis.getCell(noteRow + 1, 1).alignment = { wrapText: true, vertical: "top" };
  analysis.getCell(noteRow + 1, 1).font = { size: 11, color: { argb: "344C45" } };
  const shoppingItems = complete ? [] : [...foods.map(food => ({ id: food.id, name: food.name, source: food.source.label, kind: "catalog", inputColumn: "E" })), ...Array.from({ length: customCapacity }, (_, i) => ({ id: customs[i]?.id ?? "", name: customs[i]?.name ?? "", source: customs[i]?.source.label ?? "", kind: "custom", inputColumn: "F" }))];
  shoppingItems.forEach((item, index) => {
    const row = FIRST + index;
    const customIndex = index - foods.length;
    shopping.getCell(row, 1).value = item.kind;
    if (item.kind === "catalog") { shopping.getCell(row, 2).value = item.id; shopping.getCell(row, 3).value = item.name; shopping.getCell(row, 9).value = item.source; }
    else { formula(shopping.getCell(row, 2), `IF(${q(SHEETS.custom)}!A${FIRST + customIndex}="","",${q(SHEETS.custom)}!A${FIRST + customIndex})`, item.id); formula(shopping.getCell(row, 3), `IF(B${row}="","",${q(SHEETS.custom)}!B${FIRST + customIndex})`, item.name); formula(shopping.getCell(row, 9), `IF(B${row}="","",${q(SHEETS.custom)}!D${FIRST + customIndex})`, item.source); }
    const sourceRange = range(SHEETS.input, item.inputColumn, lastInput);
    formula(shopping.getCell(row, 4), `IF(B${row}="","",COUNTIF(${sourceRange},$B${row}))`);
    for (const pair of [{ inputColumn: "X", output: 5 }, { inputColumn: "Y", output: 7 }]) {
      const values = range(SHEETS.input, pair.inputColumn, lastInput);
      const known = `SUMPRODUCT(--(${sourceRange}=$B${row}),--ISNUMBER(${values}))`;
      formula(shopping.getCell(row, pair.output), `IF(OR(B${row}="",D${row}=0,${known}=0),"",SUMIF(${sourceRange},$B${row},${values}))`);
      formula(shopping.getCell(row, pair.output + 1), `IF(OR(B${row}="",D${row}=0),"",D${row}-${known})`);
    }
    formula(shopping.getCell(row, 10), `IF(OR(B${row}="",D${row}=0),"",IF(H${row}>0,"Thiếu thải bỏ/mật độ/đầu vào; chưa đủ lượng mua","Đủ dữ liệu quy đổi"))`);
  });
  styleRows(shopping, FIRST + shoppingItems.length - 1);
  textColumns(shopping, [1, 2, 3, 9, 10], FIRST + shoppingItems.length - 1);
  if (complete) {
    for (let i = 0; i < inputCapacity; i++) {
      const r = FIRST + i, item = rows[i]?.row;
      const ref = (c: string) => `${q(SHEETS.input)}!${c}${r}`;
      const selected = `IF(${ref("R")}="custom",${ref("F")},${ref("E")})`;
      const first = `IF(${ref("R")}="custom",COUNTIF(${q(SHEETS.input)}!$F$${FIRST}:F${r},${ref("F")}),COUNTIF(${q(SHEETS.input)}!$E$${FIRST}:E${r},${ref("E")}))=1`;
      const duplicate = item && rows.slice(0, i).some(previous => item.customFood ? previous.row.customFood?.id === item.customFood.id : previous.row.foodId === item.foodId);
      const id = item?.customFood?.id ?? item?.foodId ?? "";
      const used = !item || duplicate ? [] : rows.filter(({ row }) => item.customFood ? row.customFood?.id === id : row.foodId === id);
      formula(shopping.getCell(r, 2), `IF(AND(${selected}<>"",${first}),${selected},"")`, duplicate ? "" : id);
      formula(shopping.getCell(r, 1), `IF(B${r}="","",${ref("R")})`, used.length ? item?.customFood ? "custom" : "catalog" : "");
      formula(shopping.getCell(r, 3), `IF(B${r}="","",${ref("S")})`, used.length ? item!.food.name : "");
      formula(shopping.getCell(r, 9), `IF(B${r}="","",${ref("T")})`, used.length ? item!.food.source.label : "");
      const ids = `IF($A${r}="custom",${range(SHEETS.input, "F", lastInput)},${range(SHEETS.input, "E", lastInput)})`;
      formula(shopping.getCell(r, 4), `IF(B${r}="","",SUMPRODUCT(--(${ids}=$B${r})))`, used.length || "");
      for (const [key, inputColumn, c] of [["edibleGrams", "X", 5], ["rawGrams", "Y", 7]] as const) {
        const values = range(SHEETS.input, inputColumn, lastInput);
        const known = `SUMPRODUCT(--(${ids}=$B${r}),--ISNUMBER(${values}))`;
        const knownRows = used.filter(({ row }) => row[key] !== null);
        formula(shopping.getCell(r, c), `IF(OR(B${r}="",${known}=0),"",SUMPRODUCT(--(${ids}=$B${r}),${values}))`, knownRows.length ? knownRows.reduce((sum, { row }) => sum + row[key]!, 0) : "");
        formula(shopping.getCell(r, c + 1), `IF(B${r}="","",D${r}-${known})`, used.length ? used.length - knownRows.length : "");
      }
      formula(shopping.getCell(r, 10), `IF(B${r}="","",IF(H${r}>0,"Thiếu thải bỏ/mật độ/đầu vào; chưa đủ lượng mua","Đủ dữ liệu quy đổi"))`, used.length ? used.some(({ row }) => row.rawGrams === null) ? "Thiếu thải bỏ/mật độ/đầu vào; chưa đủ lượng mua" : "Đủ dữ liệu quy đổi" : "");
    }
    styleRows(shopping, lastInput);
    textColumns(shopping, [1, 2, 3, 9, 10], lastInput);
    for (let i = rows.length; i < inputCapacity; i++) shopping.getRow(FIRST + i).hidden = true;
    shopping.pageSetup.printArea = `A1:J${FIRST + rows.length - 1}`;
  }
  input.addConditionalFormatting({ ref: `Z${FIRST}:Z${lastInput}`, rules: [{ type: "expression", formulae: [`LEN(Z${FIRST})>0`], style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FDE8D7" } }, font: { color: { argb: "9B3C13" } } }, priority: 1 }] });
  const manifest: Manifest = { version: CONTRACT_VERSION, title: menu.title, mode: menu.mode, fields: selectedFields.map(field => field.key), ...(complete ? { reportFields: fields.map(field => field.key) } : {}), sourceFields: sourceFields.map(field => field.key), inputCapacity, customCapacity, dataRows: foods.length, digest: menu.digest, dataVersion: menu.dataVersion, generatedAt: menu.generatedAt, aiComment: menu.aiComment, savedRecord: menu.savedRecord, customSources: customs, days: menu.days.map(day => ({ id: day.id, label: day.label, date: day.date })), rows: rows.map(item => ({ id: item.row.id, meal: item.row.meal, dish: item.row.dish, foodId: item.row.foodId, customFoodId: item.row.customFood?.id, quantity: item.row.quantity, unit: item.row.unit, servings: item.row.servings, basis: item.row.basis, recipeSource: item.row.recipeSource, replacedFromFoodId: item.row.replacedFromFoodId, actualFoodName: item.row.actualFoodName, estimateAccepted: item.row.estimateAccepted, note: item.row.note })), targets: menu.targets.filter(target => target.value !== null).map(target => ({ key: target.key, value: target.value!, source: target.source ?? "Mục tiêu đã chốt", isUpperLimit: target.isUpperLimit })) };
  const metadata = workbook.addWorksheet(SHEETS.meta, { state: "veryHidden" });
  metadata.getCell("A1").value = "DINHDUONG2598_NUTRITION_CHAT";
  const json = JSON.stringify(manifest);
  for (let offset = 0, row = 2; offset < json.length; offset += 30000, row++) metadata.getCell(row, 1).value = json.slice(offset, offset + 30000);
  copySnapshot(workbook, input, SHEETS.originalInput, lastInput); copySnapshot(workbook, custom, SHEETS.originalCustom, lastCustom); copySnapshot(workbook, targetSheet, SHEETS.originalTargets, FIRST + WORKBOOK_LIMITS.days - 1);
  if (complete) {
    formula(analysis.getCell("A4"), `IF((${editableFormulaComparison})>0,"Đã sửa Excel; kết quả tính lại từ đầu vào mới. Nhận xét lúc xuất cần xem lại.","Chưa sửa đầu vào; kết quả tại thời điểm xuất.")`, "Chưa sửa đầu vào; kết quả tại thời điểm xuất.");
    const cache = (cell: ExcelJS.Cell, value: number | string) => formula(cell, cell.formula!, value);
    menu.targets.forEach((target, index) => {
      const r = FIRST + index, field = fields.find(field => field.key === target.key), total = menu.totals[target.key];
      const average = total?.value == null || !menu.analysis.dataDayCount ? null : total.value / menu.analysis.dataDayCount;
      for (let c = 2; c <= 10; c++) formula(comparison.getCell(r, c), comparison.getCell(r, c).formula!.replaceAll(`A${r}`, `K${r}`));
      formula(comparison.getCell(r, 11), `${q(SHEETS.targets)}!E${r}`, target.key);
      formula(comparison.getCell(r, 1), `IF(K${r}="","",IFERROR(INDEX('_lists'!$E$1:$E$${ALL_NUTRIENT_FIELDS.length},MATCH(K${r},NutrientKeys,0)),K${r}))`, field?.label ?? target.key);
      cache(comparison.getCell(r, 2), field?.unit ?? ""); cache(comparison.getCell(r, 3), average ?? "");
      cache(comparison.getCell(r, 4), total?.missingRows.length ?? 0); cache(comparison.getCell(r, 5), target.value ?? "");
      cache(comparison.getCell(r, 6), average !== null && target.value && !total?.incomplete ? average / target.value : "");
      cache(comparison.getCell(r, 7), average !== null && target.value !== null && !total?.incomplete ? average - target.value : "");
      cache(comparison.getCell(r, 8), target.isUpperLimit ? "Có" : "Không"); cache(comparison.getCell(r, 9), target.source ?? "");
      cache(comparison.getCell(r, 10), target.value === null ? "Chưa có mục tiêu" : average === null || total?.incomplete ? "Chưa đủ dữ liệu để kết luận" : target.isUpperLimit ? average > target.value ? "Vượt giới hạn trên" : "Không vượt giới hạn trên" : average < target.value ? "Dưới mục tiêu" : average > target.value ? "Trên mục tiêu" : "Bằng mục tiêu");
    });
    comparison.getColumn(11).hidden = true;
    for (const [sheet, includeDish] of [[meals, false], [dishes, true]] as const) rows.forEach(({ day, row }, i) => {
      const grouped = rows.filter(item => item.day.id === day.id && item.row.meal === row.meal && (!includeDish || item.row.dish === row.dish));
      const first = rows.findIndex(item => item === grouped[0]);
      if (first !== i) return;
      const r = FIRST + i;
      [menu.days.findIndex(item => item.id === day.id) + 1, day.label, row.meal, includeDish ? row.dish : "Tất cả món", grouped.length].forEach((value, j) => cache(sheet.getCell(r, j + 1), value));
      groupFields.forEach((field, j) => {
        const known = grouped.filter(({ row }) => row.referenceAmount === 0 || row.referenceAmount !== null && row.food.nutrients[field.key] != null);
        const value = known.length ? known.reduce((sum, { row }) => sum + (row.referenceAmount === 0 ? 0 : row.referenceAmount! * row.food.nutrients[field.key]! / 100), 0) : "";
        cache(sheet.getCell(r, 6 + j * 2), value); cache(sheet.getCell(r, 7 + j * 2), grouped.length - known.length);
      });
    });
    shoppingItems.forEach((item, i) => {
      const used = rows.filter(({ row }) => item.kind === "catalog" ? row.foodId === item.id : row.customFood?.id === item.id && Boolean(item.id));
      if (!used.length) return;
      const r = FIRST + i; cache(shopping.getCell(r, 4), used.length);
      for (const [key, c] of [["edibleGrams", 5], ["rawGrams", 7]] as const) {
        const known = used.filter(({ row }) => row[key] !== null);
        cache(shopping.getCell(r, c), known.length ? known.reduce((sum, { row }) => sum + row[key]!, 0) : "");
        cache(shopping.getCell(r, c + 1), used.length - known.length);
      }
      cache(shopping.getCell(r, 10), used.some(({ row }) => row.rawGrams === null) ? "Thiếu thải bỏ/mật độ/đầu vào; chưa đủ lượng mua" : "Đủ dữ liệu quy đổi");
    });
    addNutritionReportSheets(workbook, menu, allFoods, options, { inputCapacity, sourceFields: sourceFields.length });
    const plain = { name: "Times New Roman", size: 12, color: { argb: "000000" } };
    for (const sheet of [analysis, comparison, targetSheet, input, meals, dishes, shopping, custom, data]) {
      sheet.views = [{ state: "normal", showGridLines: false, zoomScale: 85 }];
      sheet.properties.tabColor = { argb: "FFFFFF" };
      sheet.eachRow(row => row.eachCell(cell => {
        cell.font = { ...plain, ...(cell.font?.bold ? { bold: true } : {}) };
        cell.fill = { type: "pattern", pattern: "none" };
        cell.border = { bottom: { style: "hair", color: { argb: "AAAAAA" } } };
      }));
      sheet.pageSetup.printTitlesRow = "1:6";
      sheet.pageSetup.margins = { left: 0.55, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
      for (const address of ["A1", "A2"]) if (typeof sheet.getCell(address).value === "string") sheet.getCell(address).value = String(sheet.getCell(address).value).replaceAll("ô vàng", "ô nhập").replaceAll("Ô vàng", "Ô nhập");
    }
    for (let i = 0; i < WORKBOOK_LIMITS.days; i++) {
      if (i >= menu.days.length) analysis.getRow(FIRST + i).hidden = true;
      if (i >= Math.max(menu.days.length, menu.targets.length)) targetSheet.getRow(FIRST + i).hidden = true;
      if (i >= menu.targets.length) comparison.getRow(FIRST + i).hidden = true;
    }
    if (!menu.targets.length) { comparison.getRow(FIRST).hidden = false; comparison.getCell(FIRST, 1).value = "Chưa đặt mốc đối chiếu"; comparison.getCell(FIRST, 10).value = "Chỉ tính thành phần dinh dưỡng; không đánh giá đạt/thiếu nhu cầu."; }
    for (let i = rows.length; i < inputCapacity; i++) { input.getRow(FIRST + i).hidden = true; input.getRow(FIRST + i).outlineLevel = 1; }
    for (let i = customs.length; i < customCapacity; i++) { custom.getRow(FIRST + i).hidden = true; custom.getRow(FIRST + i).outlineLevel = 1; }
    for (const sheet of [meals, dishes]) for (let i = rows.length; i < inputCapacity; i++) sheet.getRow(FIRST + i).hidden = true;
    shoppingItems.forEach((item, i) => { shopping.getRow(FIRST + i).hidden = !rows.some(({ row }) => item.kind === "catalog" ? row.foodId === item.id : row.customFood?.id === item.id && Boolean(item.id)); });
    input.pageSetup.printArea = `B1:AB${FIRST + rows.length - 1}`;
    analysis.state = "hidden";
    input.getCell("A2").value = `Chỉnh ngày, bữa/món, mã thực phẩm, lượng, đơn vị và số suất tại các cột nhập. Dòng dự phòng được ẩn theo nhóm; có thể hiện thêm dòng khi cần (tối đa ${inputCapacity} dòng). Tra mã tại Du lieu. Bản in gọn ở Thuc don.`;
  }
  const protectionPassword = randomBytes(18).toString("base64url");
  for (const sheet of [...[analysis, comparison, targetSheet, input, meals, dishes, shopping, custom, data], ...(complete ? workbook.worksheets.filter(sheet => ["Bao cao", "Thuc don", "Thanh phan day du", "Dinh duong theo ngay", "Nguon doi soat", "Thuoc TPBS", "Nhom thuc pham"].includes(sheet.name)) : [])]) await sheet.protect(protectionPassword, { selectLockedCells: true, selectUnlockedCells: true, autoFilter: true, sort: false, formatCells: false, formatRows: complete, insertRows: false, deleteRows: false, spinCount: 1000 });
  const chartStart = noteRow + 5;
  const charts = [];
  const labelRange = range(SHEETS.targets, "C", FIRST + WORKBOOK_LIMITS.days - 1);
  const chartHeight = `IF(SUMPRODUCT(--(LEN(${labelRange})>0))=0,1,LOOKUP(2,1/(LEN(${labelRange})>0),ROW(${labelRange}))-${FIRST - 1})`;
  const names: Record<string, string> = {};
  if (energyIndex >= 0) {
    names.NutritionDayLabels = `OFFSET(${q(SHEETS.analysis)}!$B$${FIRST},0,0,${chartHeight},1)`;
    names.NutritionDayEnergy = `OFFSET(${q(SHEETS.analysis)}!$${col(4 + energyIndex * 2)}$${FIRST},0,0,${chartHeight},1)`;
    charts.push({ title: "Năng lượng theo ngày (kcal)", categoryFormula: `${q(SHEETS.analysis)}!NutritionDayLabels`, valueFormula: `${q(SHEETS.analysis)}!NutritionDayEnergy`, categories: menu.dayTotals.map(day => `${day.label}${day.date ? ` · ${day.date}` : ""}`), values: menu.dayTotals.map(day => day.totals.energyKcal?.value ?? null), color: GREEN, fromRow: chartStart, fromColumn: 0, toRow: chartStart + 15, toColumn: 6 });
  }
  const chartData = chartStart + 18;
  analysis.getCell(chartData, 1).value = "Chất";
  const macroLabels = ["P — đạm", "L — béo", "G — bột đường"];
  for (let i = 0; i < 3; i++) { analysis.getCell(chartData + i + 1, 1).value = macroLabels[i]; formula(analysis.getCell(chartData + i + 1, 2), `${col(macroColumn + i)}${totalRow}`); analysis.getCell(chartData + i + 1, 2).numFmt = "0.0%"; }
  const macroEnergy = macroKeys.map((key, index) => (menu.totals[key]?.value ?? 0) * (index === 1 ? 9 : 4));
  const macroDenominator = macroEnergy.reduce((sum, value) => sum + value, 0);
  charts.push({ title: "P/L/G (% năng lượng Atwater)", categoryFormula: `${q(SHEETS.analysis)}!$A$${chartData + 1}:$A$${chartData + 3}`, valueFormula: `${q(SHEETS.analysis)}!$B$${chartData + 1}:$B$${chartData + 3}`, categories: macroLabels, values: macroKeys.some(key => menu.totals[key]?.incomplete || menu.totals[key]?.value == null) || macroDenominator <= 0 || macros.some(index => index < 0) ? [null, null, null] : macroEnergy.map(value => value / macroDenominator), color: GREEN, kind: "pie" as const, fromRow: chartStart, fromColumn: 6, toRow: chartStart + 15, toColumn: 12 });
  // Retain fullCalcOnLoad: Excel itself recalculates formulas and chart series after edits.
  const finalBytes = new Uint8Array(await workbook.xlsx.writeBuffer());
  const result = await addNativeWorkbookCharts(finalBytes, analysis.id, charts, names);
  assertNutritionWorkbookExportBudget(result);
  return result;
}

function inputValue(sheet: ExcelJS.Worksheet, row: number, column: number): string | number | null {
  const cell = sheet.getCell(row, column);
  if (isFormula(cell)) throw new NutritionWorkbookError("INPUT_FORMULA", `${sheet.name}!${cell.address}: không cho công thức trong ô nhập.`);
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new NutritionWorkbookError("INPUT_NUMBER", `${cell.address}: số không hợp lệ.`); return value; }
  if (typeof value === "string") { if (value.length > 4000) throw new NutritionWorkbookError("INPUT_TEXT", `${cell.address}: nội dung quá dài.`); return value; }
  throw new NutritionWorkbookError("INPUT_TYPE", `${sheet.name}!${cell.address}: chỉ nhận văn bản hoặc số.`);
}
function inputText(sheet: ExcelJS.Worksheet, row: number, column: number, max = 1000): string {
  const value = inputValue(sheet, row, column);
  if (value !== null && typeof value !== "string") throw new NutritionWorkbookError("INPUT_TYPE", `${sheet.name}!${sheet.getCell(row, column).address}: cần văn bản.`);
  if (typeof value === "string" && value.length > max) throw new NutritionWorkbookError("INPUT_TEXT", "Văn bản vượt giới hạn.");
  return value?.trim() ?? "";
}
function inputNumber(sheet: ExcelJS.Worksheet, row: number, column: number, maximum: number, nullable = true, minimum = 0): number | null {
  const value = inputValue(sheet, row, column);
  if (value === null || value === "") { if (nullable) return null; throw new NutritionWorkbookError("INPUT_REQUIRED", `${sheet.name}!${sheet.getCell(row, column).address}: thiếu số.`); }
  if (typeof value !== "number" || value < minimum || value > maximum) throw new NutritionWorkbookError("INPUT_NUMBER", `${sheet.name}!${sheet.getCell(row, column).address}: số ngoài giới hạn.`);
  return value;
}
const failure = (message: string): never => { throw new NutritionWorkbookError("INVALID_WORKBOOK", message); };

/** Ignore all calculated/canonical cells: server resolves IDs and recomputes results afresh. */
export async function parseNutritionWorkbook(bytes: Uint8Array): Promise<MenuInput> {
  const zip = await inspectWorkbookArchive(bytes);
  for (const entry of Object.values(zip.files)) {
    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(entry.name)) continue;
    const xml = await entry.async("string");
    const sheetRows = [...xml.matchAll(/<row\b[^>]*\br=["'](\d+)["']/g)];
    if (sheetRows.some(match => Number(match[1]) > Math.max(WORKBOOK_LIMITS.catalogue + 100, WORKBOOK_LIMITS.days * ALL_NUTRIENT_FIELDS.length + FIRST + 1))) failure("Trang tính vượt giới hạn số dòng.");
    if (/<f\b[^>]*>[^<]*\[[^<]*<\/f>/i.test(xml)) failure("Không cho phép công thức tham chiếu workbook khác.");
  }
  const workbook = new ExcelJS.Workbook();
  const inputOnly = await workbookInputView(zip);
  try { await workbook.xlsx.load(inputOnly as unknown as ExcelJS.Buffer); } catch { return failure("Không đọc được cấu trúc XLSX."); }
  const get = (name: string) => workbook.getWorksheet(name) ?? failure(`Thiếu sheet ${name}.`);
  const metadata = get(SHEETS.meta);
  if (inputText(metadata, 1, 1) !== "DINHDUONG2598_NUTRITION_CHAT" || metadata.rowCount > 80) failure("Không đúng mẫu Dinh dưỡng 2598.");
  let manifest: Manifest;
  try { manifest = JSON.parse(Array.from({ length: metadata.rowCount - 1 }, (_, i) => {
    const cell = metadata.getCell(i + 2, 1);
    if (isFormula(cell) || typeof cell.value !== "string") return failure("Metadata không hợp lệ.");
    return cell.value;
  }).join("")) as Manifest; } catch { return failure("Không đọc được metadata."); }
  if (!manifest || manifest.version !== CONTRACT_VERSION || !Array.isArray(manifest.fields) || !manifest.fields.length || manifest.fields.length > MAX_NUTRIENTS || manifest.fields.some(key => typeof key !== "string" || !NUTRIENT_KEYS.has(key)) || !Array.isArray(manifest.sourceFields) || manifest.sourceFields.length > ALL_NUTRIENT_FIELDS.length || manifest.sourceFields.some(key => typeof key !== "string" || !NUTRIENT_KEYS.has(key)) || manifest.fields.some((key, index) => manifest.sourceFields[index] !== key) || !Number.isInteger(manifest.inputCapacity) || manifest.inputCapacity < 1 || manifest.inputCapacity > WORKBOOK_LIMITS.rows || !Number.isInteger(manifest.customCapacity) || manifest.customCapacity < 1 || manifest.customCapacity > WORKBOOK_LIMITS.customFoods || !Array.isArray(manifest.rows) || manifest.rows.length > WORKBOOK_LIMITS.rows || !Array.isArray(manifest.days) || manifest.days.length > WORKBOOK_LIMITS.days || !Array.isArray(manifest.targets) || manifest.targets.length > MAX_NUTRIENTS || !["menu", "recall24h"].includes(manifest.mode) || typeof manifest.title !== "string" || manifest.title.length > 200) failure("Metadata ngoài giới hạn.");
  if (manifest.rows.some(row => !row || typeof row !== "object" || typeof row.id !== "string") || manifest.days.some(day => !day || typeof day !== "object" || typeof day.id !== "string") || manifest.targets.some(target => !target || typeof target !== "object" || typeof target.key !== "string" || typeof target.value !== "number")) failure("Metadata bản ghi không hợp lệ.");
  if (!Array.isArray(manifest.customSources) || manifest.customSources.length > WORKBOOK_LIMITS.customFoods || manifest.customSources.some(source => !source || typeof source !== "object" || typeof source.id !== "string") || new Set(manifest.sourceFields).size !== manifest.sourceFields.length || new Set(manifest.rows.map(row => row.id)).size !== manifest.rows.length) failure("Metadata nguồn hoặc ID không hợp lệ.");
  const input = get(SHEETS.input); const customSheet = get(SHEETS.custom); const targetsSheet = get(SHEETS.targets);
  if (input.rowCount > FIRST + manifest.inputCapacity - 1 || customSheet.rowCount > FIRST + manifest.customCapacity - 1 || targetsSheet.rowCount > FIRST + WORKBOOK_LIMITS.days - 1) failure("Có dòng ngoài vùng nhập được hỗ trợ.");
  const customById = new Map<string, CustomFoodInput>();
  for (let row = FIRST; row < FIRST + manifest.customCapacity; row++) {
    const id = inputText(customSheet, row, 1, 100);
    // All editable cells are checked for formulas, even in otherwise empty records.
    for (let column = 1; column <= 11 + manifest.sourceFields.length; column++) inputValue(customSheet, row, column);
    if (!id) continue;
    if (customById.has(id)) failure("ID tự nhập bị trùng.");
    const kind = inputText(customSheet, row, 3, 30);
    const basis = inputText(customSheet, row, 7, 30);
    const portionUnit = inputText(customSheet, row, 9, 10);
    const confirmed = inputText(customSheet, row, 6, 10);
    if (!["label", "document", "user", "unknown"].includes(kind) || !["100g", "100ml", "portion"].includes(basis) || !["g", "ml"].includes(portionUnit) || !["Có", "Không"].includes(confirmed)) failure("Loại/đơn vị/nguồn tự nhập không hợp lệ.");
    const source: FoodSource = { kind: kind as FoodSource["kind"], label: inputText(customSheet, row, 4, 1000), url: inputText(customSheet, row, 5, 2000) || undefined, confirmed: confirmed === "Có" };
    if (source.url && !/^https:\/\//i.test(source.url)) failure("URL nguồn phải dùng https.");
    const portionAmount = inputNumber(customSheet, row, 8, 1000000, true, 0.000001);
    if (basis === "portion" && portionAmount === null) failure("Nguồn theo phần cần lượng mỗi phần.");
    const original = manifest.customSources.find(source => source.id === id);
    const nutrients: Record<string, number | null> = { ...original?.nutrients };
    manifest.sourceFields.forEach((field, index) => { nutrients[field] = inputNumber(customSheet, row, 12 + index, 1000000); });
    const wastePercent = inputNumber(customSheet, row, 10, 99.999);
    const valuesChanged = original && (original.basis !== basis || (basis === "portion" && ((original.portionAmount ?? null) !== portionAmount || original.portionUnit !== portionUnit)) || (original.wastePercent ?? null) !== wastePercent || Object.entries(nutrients).some(([key, value]) => (original.nutrients?.[key] ?? null) !== value));
    const updatedSource = valuesChanged && source.kind !== "unknown" ? { ...source, kind: "user" as const, label: `Người dùng điều chỉnh từ ${source.label}`.slice(0, 500), confirmed: false } : source;
    customById.set(id, { id, name: inputText(customSheet, row, 2, 200), source: updatedSource, basis: basis as CustomFoodInput["basis"], ...(portionAmount === null ? {} : { portionAmount }), portionUnit: portionUnit as "g" | "ml", wastePercent, foodGroup: inputText(customSheet, row, 11, 200) || null, nutrients });
  }
  const days = Array.from({ length: WORKBOOK_LIMITS.days }, (_, i) => {
    const row = FIRST + i;
    const id = inputText(targetsSheet, row, 2, 100);
    const label = inputText(targetsSheet, row, 3, 200);
    const date = inputText(targetsSheet, row, 4, 10);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) failure("Ngày cần dạng YYYY-MM-DD.");
    return { id, label, date, rows: [] as MenuRowInput[] };
  });
  const baselineRows = new Map(manifest.rows.map(row => [row.id, row]));
  const rowIds = new Set<string>();
  for (let row = FIRST; row < FIRST + manifest.inputCapacity; row++) {
    for (let column = 1; column <= 16; column++) inputValue(input, row, column);
    inputValue(input, row, 28);
    const foodId = inputText(input, row, 5, 100);
    const customId = inputText(input, row, 6, 100);
    if (!foodId && !customId) continue;
    if (foodId && customId) failure("Một dòng chỉ chọn Food ID hoặc nguồn tự nhập.");
    const id = inputText(input, row, 1, 100);
    if (!id || rowIds.has(id)) failure("ID dòng thiếu hoặc bị trùng."); rowIds.add(id);
    const dayNumber = inputNumber(input, row, 2, WORKBOOK_LIMITS.days, false, 1)!;
    if (!Number.isInteger(dayNumber)) failure("Số ngày phải là số nguyên.");
    const day = days[dayNumber - 1];
    if (!day.id || !day.label) failure("Ngày được sử dụng cần ID và nhãn.");
    const basis = inputText(input, row, 10, 20); const unit = inputText(input, row, 8, 10); const accepted = inputText(input, row, 16, 10);
    if (!["edible", "raw", "cooked"].includes(basis) || !["g", "ml"].includes(unit) || !["Có", "Không"].includes(accepted)) failure("Trạng thái lượng, đơn vị hoặc chấp nhận ước tính không hợp lệ.");
    const baseline = baselineRows.get(id);
    const customFood = customId ? customById.get(customId) ?? failure("Nguồn tự nhập chưa tồn tại.") : undefined;
    const conversionFactor = inputNumber(input, row, 11, 1000, true, 0.000001); const density = inputNumber(input, row, 13, 100, true, 0.000001);
    const userNote = inputText(input, row, 28, 1000);
    const substitutionNote = baseline?.customFoodId && baseline.customFoodId !== customId ? `Đổi nguồn tự nhập từ ${baseline.customFoodId}. ` : "";
    day.rows.push({ id, meal: inputText(input, row, 3, 120), dish: inputText(input, row, 4, 200), ...(foodId ? { foodId } : { customFood }), quantity: inputNumber(input, row, 7, 1000000), unit: unit as "g" | "ml", servings: inputNumber(input, row, 9, 10000, false, 0.000001)!, basis: basis as MenuRowInput["basis"], ...(conversionFactor === null ? {} : { conversionFactor }), conversionSource: inputText(input, row, 12, 1000) || undefined, ...(density === null ? {} : { densityGPerMl: density }), densitySource: inputText(input, row, 14, 1000) || undefined, actualFoodName: inputText(input, row, 15, 200) || undefined, estimateAccepted: accepted === "Có", recipeSource: baseline?.recipeSource ?? { kind: "user", label: "Bổ sung trong Excel" }, replacedFromFoodId: baseline?.foodId && foodId !== baseline.foodId ? baseline.foodId : baseline?.replacedFromFoodId, note: (substitutionNote + userNote).slice(0, 1000) || undefined });
  }
  const targets: TargetInput[] = [];
  const targetKeys = new Set<string>();
  for (let row = FIRST; row < FIRST + WORKBOOK_LIMITS.days; row++) {
    const key = inputText(targetsSheet, row, 5, 100); const value = inputNumber(targetsSheet, row, 6, 1000000); const source = inputText(targetsSheet, row, 7, 1000); const upper = inputText(targetsSheet, row, 8, 10);
    if (!key && value === null) continue;
    if (!NUTRIENT_KEYS.has(key) || value === null || !source || !["Có", "Không"].includes(upper) || targetKeys.has(key)) failure("Mục tiêu thiếu thông tin, sai chất hoặc bị trùng.");
    targetKeys.add(key);
    const previous = manifest.targets.find(target => target.key === key);
    const changed = !previous || previous.value !== value || Boolean(previous.isUpperLimit) !== (upper === "Có");
    targets.push({ key, value: value!, source: changed ? `Người dùng điều chỉnh từ ${source}`.slice(0, 500) : source, isUpperLimit: upper === "Có" });
  }
  const selectedDays = days.filter(day => day.rows.length > 0 || manifest.days.some(original => original.id === day.id));
  if (new Set(selectedDays.map(day => day.id)).size !== selectedDays.length) failure("ID ngày bị trùng.");
  // Snapshot prose is never attached to a newly calculated menu; AI must analyze the fresh result.
  return parseMenuInput({ title: manifest.title, mode: manifest.mode, days: selectedDays, fields: manifest.fields, comparison: targets.length ? { mode: "manual", targets } : { mode: "none" } });
}
