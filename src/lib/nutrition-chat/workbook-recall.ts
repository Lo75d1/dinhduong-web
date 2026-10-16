import type ExcelJS from "exceljs";
import type { ResolvedMenu } from "./contracts";
import { reportSheet, type NutritionWorkbookOptions } from "./workbook-report";
import { aiFilled, AI_NUMBER_LEGEND, briefFoodSource, recallAmounts, RECALL_HEADERS, RECALL_ENERGY_HEADERS, wholeVddDish } from "./presentation";
import { markAiNumber } from "./workbook-ai";

const font = { name: "Times New Roman", size: 15, color: { argb: "000000" } };
const border: Partial<ExcelJS.Borders> = Object.fromEntries(["top", "bottom", "left", "right"].map(edge => [edge, { style: "thin", color: { argb: "808080" } }]));
const literal = (text: string) => `"${text.replaceAll('"', '""')}"`;
function formula(cell: ExcelJS.Cell, expression: string, value: string | number | null) { cell.value = { formula: expression, result: value ?? "—" }; }
function line(sheet: ExcelJS.Worksheet, row: number, text: string) { sheet.mergeCells(row, 1, row, sheet.columnCount); sheet.getCell(row, 1).value = text; sheet.getRow(row).height = 30; }
function tableRow(sheet: ExcelJS.Worksheet, row: number, header = false) {
  sheet.getRow(row).height = header ? 92 : 64;
  sheet.getRow(row).eachCell({ includeEmpty: true }, (cell, column) => { cell.font = { ...font, ...(header ? { bold: true } : {}) }; cell.border = border; cell.alignment = { vertical: "middle", horizontal: header ? "center" : column >= 6 && column <= 8 ? "right" : "left", wrapText: header || column < 6 || column === 9, shrinkToFit: false }; cell.numFmt = "#,##0.0;(#,##0.0);0"; });
}

/** Two views of existing inputs/results. Unknown conversion remains unknown. */
export function addRecallWorkbookSheets(workbook: ExcelJS.Workbook, menu: ResolvedMenu, options: NutritionWorkbookOptions) {
  if (menu.mode !== "recall24h") return;
  const survey = workbook.getWorksheet("Phieu 24h")!, energy = workbook.getWorksheet("Quy doi 24h")!;
  reportSheet(survey, "PHỤ LỤC 1 — PHIẾU ĐIỀU TRA HỎI GHI KHẨU PHẦN 24H", RECALL_HEADERS, [11, 15, 29, 32, 24, 17, 15, 18, 17]);
  reportSheet(energy, "PHỤ LỤC 2 — BẢNG QUY ĐỔI NĂNG LƯỢNG VÀ THÀNH PHẦN DINH DƯỠNG", RECALL_ENERGY_HEADERS, [8, 42, 24, 21, 18, 18, 18]);
  line(survey, 3, `Họ và tên: ${options.meta?.subjectName || "____________________"}     Giới tính: ${menu.input.profile?.gender || "____"}`);
  line(survey, 4, "Ngày sinh: ____ / ____ / ______     Ngày điều tra: ____ / ____ / ______");
  line(energy, 3, "Chỉ ghi các dòng đã xác nhận cơ sở sống sạch; tổng toàn bộ khẩu phần xem Bao cao.");
  line(energy, 4, AI_NUMBER_LEGEND);
  let surveyRow = 7, energyRow = 7, inputRow = 7, ordinal = 0;
  for (const [dayIndex, day] of menu.days.entries()) {
    const title = `${day.label}${day.date ? ` · Ngày ăn: ${day.date}` : ""}`;
    if (dayIndex === 0) { line(survey, 5, `${title}. ${AI_NUMBER_LEGEND}`); line(energy, 5, title); }
    else {
      survey.getRow(surveyRow - 1).addPageBreak(); energy.getRow(Math.max(6, energyRow - 1)).addPageBreak();
      line(survey, surveyRow++, title); survey.getRow(surveyRow).values = RECALL_HEADERS; tableRow(survey, surveyRow++, true);
      line(energy, energyRow++, title); energy.getRow(energyRow).values = RECALL_ENERGY_HEADERS; tableRow(energy, energyRow++, true);
    }
    let rawCount = 0;
    for (const [index, row] of day.rows.entries()) {
      const r = surveyRow++, source = inputRow++, amount = recallAmounts(row);
      const ref = (column: string) => `'Nhap khau phan'!${column}${source}`;
      const sameSource = `AND(${ref("E")}=${literal(row.foodId || "")},${ref("F")}=${literal(row.customFood?.id || "")})`;
      const numericAmount = `AND(ISNUMBER(${ref("G")}),ISNUMBER(${ref("I")}))`;
      const grams = `IF(${ref("H")}="g",${ref("G")}*${ref("I")},IF(AND(ISNUMBER(${ref("M")}),${ref("N")}<>""),${ref("G")}*${ref("I")}*${ref("M")},"—"))`;
      const cooked = `AND(${sameSource},${numericAmount},OR(${ref("J")}="cooked",AND(${ref("J")}="edible",${row.sourceState === "cooked" ? "TRUE" : "FALSE"})))`;
      const raw = `AND(${sameSource},${row.sourceState === "raw_clean" && !wholeVddDish(row) ? "TRUE" : "FALSE"},ISNUMBER(${ref("X")}))`;
      const previous = day.rows[index - 1], whole = wholeVddDish(row);
      const dish = whole ? row.actualFoodName || row.food.name : row.dish;
      const previousDish = previous && (wholeVddDish(previous) ? previous.actualFoodName || previous.food.name : previous.dish);
      const sameDish = previous && previous.meal === row.meal && previousDish === dish && whole === wholeVddDish(previous);
      survey.getCell(r, 1).value = row.mealTime ? `${aiFilled(row, "mealTime") ? "*" : ""}${row.mealTime}` : "—";
      formula(survey.getCell(r, 2), ref("C"), row.meal);
      formula(survey.getCell(r, 3), sameDish ? `IF(AND(${ref("C")}='Nhap khau phan'!C${source - 1},EXACT(${ref("D")},'Nhap khau phan'!D${source - 1})),"",${ref("D")})` : whole ? `IF(${ref("O")}<>"",${ref("O")},${ref("S")})` : ref("D"), sameDish ? "" : dish);
      formula(survey.getCell(r, 4), whole ? '"—"' : `IF(${ref("O")}<>"",${ref("O")},${ref("S")})`, whole ? "—" : row.actualFoodName || row.food.name);
      const household = row.householdMeasure ? `${aiFilled(row, "householdMeasure") ? "*" : ""}${row.householdMeasure}` : "—";
      formula(survey.getCell(r, 5), `IF(AND(${sameSource},${ref("G")}=${row.quantity ?? '""'},${ref("I")}=${row.servings}),${literal(household)},"—")`, household);
      formula(survey.getCell(r, 6), `IF(${cooked},${grams},"—")`, amount.cookedGrams);
      formula(survey.getCell(r, 7), `IF(AND(${raw},${ref("J")}="cooked",ISNUMBER(${ref("K")})),${ref("K")},"—")`, amount.conversionFactor);
      formula(survey.getCell(r, 8), `IF(${raw},${ref("X")},"—")`, amount.rawCleanGrams);
      const sourceLabel = `IF(${ref("R")}="custom","Nguồn riêng",IF(OR(${ref("T")}="VDD",${ref("T")}="RNI"),${ref("T")},"Kho"))`;
      formula(survey.getCell(r, 9), `${sourceLabel}${whole ? '&" · cả món"' : ""}`, (row.food.source.kind === "catalog" ? briefFoodSource(row.food.source) : "Nguồn riêng") + (whole ? " · cả món" : ""));
      tableRow(survey, r);
      markAiNumber(survey, `F${r}`, row, source, ["quantity", "servings", "densityGPerMl"]);
      markAiNumber(survey, `G${r}`, row, source, ["conversionFactor"]);
      markAiNumber(survey, `H${r}`, row, source, ["quantity", "servings", "conversionFactor", "densityGPerMl"]);
      if (amount.rawCleanGrams === null) continue;
      rawCount++; const e = energyRow++;
      energy.getCell(e, 1).value = ++ordinal;
      formula(energy.getCell(e, 2), `IF(${ref("O")}<>"",${ref("O")},${ref("S")})`, row.actualFoodName || row.food.name);
      formula(energy.getCell(e, 3), `IF(${raw},${ref("X")},"—")`, amount.rawCleanGrams);
      for (const [i, key] of ["energyKcal", "proteinG", "lipidG", "glucidG"].entries()) {
        const col = workbook.getWorksheet("Nhap khau phan")!.getColumn(29 + menu.fields.findIndex(field => field.key === key)).letter;
        formula(energy.getCell(e, i + 4), `IF(AND(${raw},ISNUMBER(${ref(col)})),${ref(col)},"—")`, row.referenceAmount !== null && row.food.nutrients[key] != null ? row.referenceAmount * row.food.nutrients[key]! / 100 : null);
      }
      tableRow(energy, e); energy.getCell(e, 1).numFmt = "0"; energy.getRow(e).eachCell((cell, column) => { if (column >= 3) cell.alignment = { vertical: "middle", horizontal: "right", wrapText: false }; });
      markAiNumber(energy, `C${e}`, row, source, ["quantity", "servings", "conversionFactor", "densityGPerMl"]);
    }
    if (!rawCount) line(energy, energyRow++, "Chưa có dòng xác nhận cơ sở sống sạch.");
  }
  for (const [sheet, last] of [[survey, surveyRow - 1], [energy, energyRow - 1]] as const) {
    sheet.views = [{ state: "normal", showGridLines: true, zoomScale: 100 }];
    sheet.eachRow(row => row.eachCell(cell => { cell.font = { ...font, ...(cell.font?.bold ? { bold: true } : {}) }; }));
    tableRow(sheet, 6, true); sheet.pageSetup.printTitlesRow = "1:4";
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(sheet.columnCount).letter}${Math.max(7, last)}`;
  }
}
