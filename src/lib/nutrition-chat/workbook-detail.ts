import type ExcelJS from "exceljs";
import { NUTRIENT_GROUPS } from "../nutrient-fields";
import type { ResolvedMenu } from "./contracts";
import { markAiNumber } from "./workbook-ai";

const FIRST = 7;
const NUTRIENT_FIRST = 9;
const SHEET = "Phan tich chi tiet";
const col = (n: number) => { let name = ""; while (n) { n--; name = String.fromCharCode(65 + n % 26) + name; n = Math.floor(n / 26); } return name; };
type DetailLine = { kind: "food" | "dish" | "meal" | "day" | "period"; inputs: number[] };

/** Same consecutive dish/meal/day presentation as the calculator, without converting legacy grams. */
function detailLines(menu: ResolvedMenu): DetailLine[] {
  const lines: DetailLine[] = [];
  let input = FIRST;
  for (const day of menu.days) {
    const dayInputs: number[] = [], mealInputs: number[] = [], dishInputs: number[] = [];
    const close = (kind: "dish" | "meal", inputs: number[]) => { if (inputs.length) lines.push({ kind, inputs: inputs.splice(0) }); };
    day.rows.forEach((row, i) => {
      const previous = day.rows[i - 1];
      if (previous && (previous.meal !== row.meal || previous.dish !== row.dish)) close("dish", dishInputs);
      if (previous && previous.meal !== row.meal) close("meal", mealInputs);
      lines.push({ kind: "food", inputs: [input] });
      dayInputs.push(input); mealInputs.push(input); dishInputs.push(input++);
    });
    close("dish", dishInputs); close("meal", mealInputs);
    if (dayInputs.length) lines.push({ kind: "day", inputs: dayInputs });
  }
  lines.push({ kind: "period", inputs: Array.from({ length: input - FIRST }, (_, i) => FIRST + i) });
  return lines;
}

export function nutritionDetailCellCount(menu: ResolvedMenu) {
  return (detailLines(menu).length + 6) * (menu.fields.length + NUTRIENT_FIRST);
}

/** Keep all summands at food grain: never include both a subtotal and its ingredients. */
function foodRanges(rows: number[]) {
  const spans: Array<[number, number]> = [];
  for (const row of rows) {
    const previous = spans.at(-1);
    if (previous && previous[1] + 1 === row) previous[1] = row;
    else spans.push([row, row]);
  }
  return spans;
}
function aggregate(fn: "SUM" | "COUNT", spans: Array<[number, number]>, column: string) {
  const ranges = spans.map(([first, last]) => `${column}$${first}:${column}$${last}`);
  // Excel functions accept at most 255 arguments, even for a 1,000-row menu.
  const chunks = [];
  for (let i = 0; i < ranges.length; i += 200) chunks.push(`${fn}(${ranges.slice(i, i + 200).join(",")})`);
  return chunks.length ? chunks.join("+") : "0";
}

/** A terminal reader of Nhap khau phan / Phan tich; it owns no nutrient conversion. */
export function addNutritionDetailSheet(workbook: ExcelJS.Workbook, menu: ResolvedMenu, inputCapacity: number) {
  const sheet = workbook.getWorksheet(SHEET)!;
  const input = workbook.getWorksheet("Nhap khau phan")!;
  const analysis = workbook.getWorksheet("Phan tich")!;
  const source = workbook.getWorksheet("_source")!;
  const rows = menu.days.flatMap(day => day.rows.map(row => ({ day, row })));
  const lines = detailLines(menu);
  const lastNutrient = NUTRIENT_FIRST + menu.fields.length - 1;
  const sourceColumn = lastNutrient + 1;
  const numberFormat = "#,##0.00;(#,##0.00);0.00";
  const partialFormat = '"≥"#,##0.00;"≥"(#,##0.00);"≥"0.00';
  const font = { name: "Times New Roman", size: 12, color: { argb: "000000" } };
  const border: Partial<ExcelJS.Borders> = Object.fromEntries(["top", "bottom", "left", "right"].map(edge => [edge, { style: "thin", color: { argb: "999999" } }]));
  const set = (r: number, c: number, formula: string, result: string | number | boolean) => { sheet.getCell(r, c).value = { formula, result }; };
  const valueAt = (r: number, c: number) => input.getCell(r, c).result ?? input.getCell(r, c).value;
  sheet.views = [{ state: "normal", showGridLines: true, zoomScale: 100 }];
  sheet.columns = [11, 12, 26, 34, 15, 10, 18, 12, ...menu.fields.map(() => 18), 28].map(width => ({ width, style: { font, numFmt: numberFormat } }));
  for (const [r, text] of [[1, "DINH DƯỠNG 2598"], [2, "BẢNG PHÂN TÍCH DINH DƯỠNG CHI TIẾT"], [3, menu.title], [4, "Sửa tại Nhap khau phan. —: thiếu số liệu; ≥: tổng một phần. Lượng nguồn giữ đúng g/ml; không tự coi là gam sống sạch."]] as const) {
    sheet.mergeCells(r, 1, r, 12); sheet.getCell(r, 1).value = text;
    sheet.getCell(r, 1).font = { ...font, bold: r < 3, size: r === 2 ? 15 : 12 };
    sheet.getCell(r, 1).alignment = { vertical: "middle", wrapText: true };
    sheet.getRow(r).height = r === 4 ? 36 : 28;
  }
  // One shared layout check. Quantity, servings, source, units and nutrients remain live.
  const end = FIRST + inputCapacity - 1;
  source.getCell("A1").value = { formula: `AND(SUMPRODUCT(--('Nhap khau phan'!B${FIRST}:D${end}<> '_input'!B${FIRST}:D${end}))=0,'Phan tich'!C98=${rows.length})`, result: true };
  sheet.mergeCells(5, 1, 5, 8);
  set(5, 1, `IF('_source'!A1,"Ngày · bữa · món · thực phẩm","Đã đổi ngày/bữa/món hoặc số dòng: xuất lại để sắp nhóm; tổng khẩu phần vẫn tự tính.")`, "Ngày · bữa · món · thực phẩm");
  sheet.getCell("A5").alignment = { wrapText: true, vertical: "middle" }; sheet.getRow(5).height = 36;
  // Group headings follow the existing nutrient registry, including distinct source units.
  let groupStart = NUTRIENT_FIRST;
  const groupFor = (key: string) => NUTRIENT_GROUPS.find(group => group.fields.some(field => field.key === key))?.title ?? "Chất dinh dưỡng";
  for (let i = 0; i < menu.fields.length; i++) {
    const current = groupFor(menu.fields[i].key);
    if (i === menu.fields.length - 1 || current !== groupFor(menu.fields[i + 1].key)) {
      const endColumn = NUTRIENT_FIRST + i;
      if (endColumn > groupStart) sheet.mergeCells(5, groupStart, 5, endColumn);
      sheet.getCell(5, groupStart).value = current; groupStart = endColumn + 1;
    }
  }
  sheet.getRow(6).values = ["Ngày", "Bữa", "Món ăn", "Thực phẩm / món\ncó số liệu", "Lượng nhập\n× số suất", "Đơn vị\nnhập", "Lượng nguồn\năn được", "Đơn vị\nnguồn", ...menu.fields.map(field => `${field.label}\n(${field.unit})`), "Nguồn"];
  sheet.getRow(6).height = 90;
  for (const r of [5, 6]) sheet.getRow(r).eachCell(cell => { cell.font = { ...font, bold: true }; cell.border = border; cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; });
  const outputFoods = new Map<number, number>();
  lines.forEach((line, i) => { if (line.kind === "food") outputFoods.set(line.inputs[0], FIRST + i); });
  let previousInput = 0;
  for (const [index, line] of lines.entries()) {
    const out = FIRST + index;
    sheet.getRow(out).height = line.kind === "food" ? 42 : 28;
    for (let c = 1; c <= sourceColumn; c++) {
      const cell = sheet.getCell(out, c);
      cell.font = { ...font, bold: line.kind !== "food" }; cell.border = border;
      cell.alignment = { vertical: "middle", horizontal: c === 5 || c === 7 || c >= NUTRIENT_FIRST && c <= lastNutrient ? "right" : "left", wrapText: c <= 4 || c === sourceColumn, shrinkToFit: false };
    }
    if (line.kind === "food") {
      const r = line.inputs[0], { day, row } = rows[r - FIRST];
      const prev = previousInput ? rows[previousInput - FIRST] : undefined;
      const ref = (c: string) => `'Nhap khau phan'!${c}${r}`;
      const dayRef = `INDEX('Ngay va muc tieu'!$C$7:$C$96,${ref("B")})`;
      set(out, 1, prev?.day.id === day.id ? `IF(${ref("B")}='Nhap khau phan'!B${previousInput},"",${dayRef})` : dayRef, prev?.day.id === day.id ? "" : day.label);
      const sameMeal = prev?.day.id === day.id && prev.row.meal === row.meal;
      set(out, 2, sameMeal ? `IF(AND(${ref("B")}='Nhap khau phan'!B${previousInput},EXACT(${ref("C")},'Nhap khau phan'!C${previousInput})),"",${ref("C")})` : ref("C"), sameMeal ? "" : row.meal);
      const sameDish = sameMeal && prev!.row.dish === row.dish;
      set(out, 3, sameDish ? `IF(AND(${ref("B")}='Nhap khau phan'!B${previousInput},EXACT(${ref("C")},'Nhap khau phan'!C${previousInput}),EXACT(${ref("D")},'Nhap khau phan'!D${previousInput})),"",${ref("D")})` : ref("D"), sameDish ? "" : row.dish);
      set(out, 4, `IF(${ref("O")}<>"",${ref("O")},${ref("S")})`, row.actualFoodName || row.food.name);
      set(out, 5, `IF(AND(ISNUMBER(${ref("G")}),ISNUMBER(${ref("I")})),${ref("G")}*${ref("I")},"—")`, row.quantity === null ? "—" : row.quantity * row.servings);
      set(out, 6, ref("H"), row.unit);
      set(out, 7, `IF(ISNUMBER(${ref("W")}),${ref("W")},"—")`, row.referenceAmount ?? "—");
      set(out, 8, ref("U"), row.food.unit);
      set(out, sourceColumn, ref("T"), row.food.source.label);
      menu.fields.forEach((_, f) => { const value = valueAt(r, 29 + f); set(out, NUTRIENT_FIRST + f, `IF(ISNUMBER(${ref(col(29 + f))}),${ref(col(29 + f))},"—")`, typeof value === "number" ? value : "—"); });
      markAiNumber(sheet, `E${out}`, row, r, ["quantity", "servings"], numberFormat);
      previousInput = r;
    } else {
      sheet.getCell(out, 4).value = { dish: "Cộng món", meal: "Cộng bữa", day: "TỔNG NGÀY", period: "TỔNG KHẨU PHẦN" }[line.kind];
      const spans = foodRanges(line.inputs.map(r => outputFoods.get(r)!));
      menu.fields.forEach((_, f) => {
        const c = NUTRIENT_FIRST + f, letter = col(c);
        if (line.kind === "period") {
          const value = analysis.getCell(98, 4 + f * 2).result;
          set(out, c, `IF(ISNUMBER('Phan tich'!${col(4 + f * 2)}98),'Phan tich'!${col(4 + f * 2)}98,"—")`, typeof value === "number" ? value : "—");
          sheet.addConditionalFormatting({ ref: `${letter}${out}`, rules: [{ type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${letter}${out}),INDIRECT("'Phan tich'!${col(5 + f * 2)}98")>0)`], style: { numFmt: partialFormat } }] });
        } else {
          const values = line.inputs.map(r => valueAt(r, 29 + f)).filter((v): v is number => typeof v === "number");
          set(out, c, `IF(NOT('_source'!$A$1),"—",IF((${aggregate("COUNT", spans, letter)})=0,"—",${aggregate("SUM", spans, letter)}))`, values.length ? values.reduce((a, b) => a + b, 0) : "—");
        }
      });
      if (line.kind !== "period") sheet.addConditionalFormatting({ ref: `${col(NUTRIENT_FIRST)}${out}:${col(lastNutrient)}${out}`, rules: [{ type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${col(NUTRIENT_FIRST)}${out}),(${aggregate("COUNT", spans, col(NUTRIENT_FIRST))})<${line.inputs.length})`], style: { numFmt: partialFormat } }] });
      if (line.kind === "day" || line.kind === "period") sheet.getRow(out).eachCell(cell => { cell.border = { ...border, top: { style: "double", color: { argb: "000000" } } }; });
    }
  }
  sheet.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: false, scale: 85,
    margins: { left: 0.55, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    printTitlesRow: "5:6", printTitlesColumn: "A:D", printArea: `A1:${col(sourceColumn)}${FIRST + lines.length - 1}` };
  sheet.headerFooter.oddFooter = "&L Dinh dưỡng 2598 &RTrang &P / &N";
}
