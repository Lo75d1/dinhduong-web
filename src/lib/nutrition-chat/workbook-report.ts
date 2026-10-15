import type ExcelJS from "exceljs";
import { ALL_NUTRIENT_FIELDS, CORE_CALC_FIELDS, NUTRIENT_GROUPS, SOURCE_ONLY_NUTRIENT_FIELDS } from "../nutrient-fields";
import type { NutritionFood, ResolvedMenu } from "./contracts";
import { getExchangeRule } from "@/app/tinh-khau-phan/exchange-units";

export type NutritionReportMeta = {
  subjectName?: string; subjectGroup?: string; clinicalCourse?: string;
  authorName?: string; authorRole?: string; authorOrganization?: string; reportDate?: string; menuNote?: string;
};
export type NutritionMedicationLine = { meal: string; name: string; dose: string; timing: string; note: string };
export type NutritionWorkbookOptions = { complete?: boolean; meta?: NutritionReportMeta; medications?: NutritionMedicationLine[] };
const FIRST = 7;
const TOTAL = 98;
const AVERAGE = 99;
const column = (n: number) => { let name = ""; while (n) { n--; name = String.fromCharCode(65 + n % 26) + name; n = Math.floor(n / 26); } return name; };
const numberFormat = '#,##0.00;(#,##0.00);0.00';
const font = { name: "Times New Roman", size: 12, color: { argb: "000000" } };
const border: Partial<ExcelJS.Borders> = Object.fromEntries(["top", "bottom", "left", "right"].map(edge => [edge, { style: "thin", color: { argb: "808080" } }]));
function calc(cell: ExcelJS.Cell, expression: string, value: string | number | null = "") {
  cell.value = { formula: expression, result: value ?? "—" };
}

/** Shared print style for web and conversation exports. No frozen or split panes. */
export function reportSheet(sheet: ExcelJS.Worksheet, title: string, headers: string[], widths: number[]) {
  sheet.views = [{ state: "normal", showGridLines: false, zoomScale: 85 }];
  sheet.properties.defaultRowHeight = 24;
  sheet.columns = headers.map((_, index) => ({ width: widths[index] ?? 18, style: { font, alignment: { vertical: "middle" }, numFmt: numberFormat } }));
  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getCell(1, 1).value = "DINH DƯỠNG 2598";
  sheet.getCell(1, 1).font = { ...font, bold: true };
  sheet.mergeCells(2, 1, 2, headers.length);
  sheet.getCell(2, 1).value = title;
  sheet.getCell(2, 1).font = { ...font, bold: true, size: 15 };
  sheet.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 32;
  sheet.getRow(6).values = headers;
  sheet.getRow(6).height = 38;
  sheet.getRow(6).eachCell(cell => { cell.font = { ...font, bold: true }; cell.border = border; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
  sheet.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.55, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }, printTitlesRow: "1:6", horizontalCentered: true };
  sheet.headerFooter.oddFooter = '&L&D&C Dinh dưỡng 2598 &RTrang &P / &N';
}
function body(sheet: ExcelJS.Worksheet, last: number) {
  for (let row = FIRST; row <= last; row++) {
    sheet.getRow(row).height = 30;
    sheet.getRow(row).eachCell({ includeEmpty: true }, cell => {
      cell.font = font; cell.border = border;
      cell.alignment = { vertical: "middle", wrapText: true, horizontal: typeof cell.value === "number" || typeof cell.result === "number" ? "right" : "left" };
    });
  }
  sheet.pageSetup.printArea = `A1:${column(sheet.columnCount)}${Math.max(FIRST, last)}`;
}
function context(sheet: ExcelJS.Worksheet, row: number, text: string) {
  sheet.mergeCells(row, 1, row, sheet.columnCount);
  sheet.getCell(row, 1).value = text;
  sheet.getCell(row, 1).font = font;
  sheet.getCell(row, 1).alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(row).height = 30;
}

export function addNutritionReportSheets(workbook: ExcelJS.Workbook, menu: ResolvedMenu, catalogue: NutritionFood[], options: NutritionWorkbookOptions, build: { inputCapacity: number; sourceFields: number }) {
  const report = workbook.getWorksheet("Thanh phan day du")!;
  const summary = workbook.getWorksheet("Bao cao")!;
  const plan = workbook.getWorksheet("Thuc don")!;
  const sources = workbook.getWorksheet("Nguon doi soat")!;
  workbook.views = [{ x: 0, y: 0, width: 14000, height: 9000, firstSheet: 0, activeTab: 0, visibility: "visible" }];
  const headers = ["Nhóm / chất dinh dưỡng", "Đơn vị", "Tổng cả kỳ", "Trung bình / ngày", "Mốc / ngày", "Tỷ lệ (%)", "Dòng thiếu", "Kết quả / ghi chú"];
  const widths = [35, 10, 16, 18, 16, 14, 12, 37];
  reportSheet(report, "PHỤ LỤC THÀNH PHẦN DINH DƯỠNG ĐẦY ĐỦ", headers, widths);
  const meta = options.meta ?? {};
  const profile = menu.input.profile;
  const profileText = profile ? `${profile.gender}; ${profile.age} ${profile.ageUnit === "thang" ? "tháng" : "tuổi"}; ${profile.weight || "—"} kg; ${profile.height || "—"} cm` : "Chưa cung cấp hồ sơ";
  context(report, 3, `${menu.title}. ${meta.subjectName ? `Người được đánh giá: ${meta.subjectName}. ` : ""}${profileText}.`);
  context(report, 4, `${meta.authorName ? `Người lập: ${meta.authorName}${meta.authorRole ? ` (${meta.authorRole})` : ""}. ` : ""}${meta.authorOrganization || ""}${meta.reportDate ? `; ngày lập: ${meta.reportDate}` : ""}`.trim() || `Ngày xuất: ${menu.generatedAt.slice(0, 10)}.`);
  calc(report.getCell("A5"), `'Phan tich'!A4`, "Chưa sửa đầu vào; kết quả tại thời điểm xuất.");
  report.mergeCells("A5:H5"); report.getCell("A5").alignment = { wrapText: true }; report.getRow(5).height = 28;
  const dataDays = menu.days.filter(day => day.rows.length).length;
  const structureNotice = `OR('Phan tich'!C98<>${menu.days.reduce((sum, day) => sum + day.rows.length, 0)},'Phan tich'!C99<>${dataDays})`;
  calc(report.getCell("A5"), `IF(${structureNotice},"Đã thêm/bớt dòng hoặc ngày. Tổng tự tính lại; cần xuất lại để cập nhật phạm vi bản in chi tiết.",'Phan tich'!A4)`, "Chưa sửa đầu vào; kết quả tại thời điểm xuất.");
  const targetLast = FIRST + 89;
  const fieldRows = new Map<string, number>();
  let output = FIRST;
  for (const group of NUTRIENT_GROUPS) {
    report.mergeCells(output, 1, output, 8);
    report.getCell(output, 1).value = group.title.toLocaleUpperCase("vi");
    report.getRow(output).font = { ...font, bold: true };
    output++;
    for (const field of group.fields) {
      const index = menu.fields.findIndex(item => item.key === field.key);
      if (index < 0) continue;
      const row = output++;
      fieldRows.set(field.key, row);
      const total = menu.totals[field.key];
      const avg = total?.value == null || !dataDays ? null : total.value / dataDays;
      const target = menu.targets.find(item => item.key === field.key && item.value !== null);
      const sourceValue = `'Phan tich'!${column(4 + index * 2)}${TOTAL}`;
      const sourceAverage = `'Phan tich'!${column(4 + index * 2)}${AVERAGE}`;
      report.getCell(row, 1).value = field.label; report.getCell(row, 2).value = field.unit;
      calc(report.getCell(row, 3), `IF(ISNUMBER(${sourceValue}),${sourceValue},"—")`, total?.value ?? "—");
      calc(report.getCell(row, 4), `IF(ISNUMBER(${sourceAverage}),${sourceAverage},"—")`, avg ?? "—");
      const keys = `'Ngay va muc tieu'!$E$${FIRST}:$E$${targetLast}`;
      const values = `'Ngay va muc tieu'!$F$${FIRST}:$F$${targetLast}`;
      const targetIndex = `MATCH("${field.key}",${keys},0)`;
      calc(report.getCell(row, 5), `IF(COUNTIF(${keys},"${field.key}")=0,"—",IF(COUNT(INDEX(${values},${targetIndex}))=0,"—",INDEX(${values},${targetIndex})))`, target?.value ?? "—");
      calc(report.getCell(row, 7), `'Phan tich'!${column(5 + index * 2)}${TOTAL}`, total?.missingRows.length ?? 0);
      calc(report.getCell(row, 6), `IF(OR(NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row})),E${row}<=0,G${row}>0),"—",D${row}/E${row})`, avg !== null && target?.value && !total?.incomplete ? avg / target.value : "—");
      report.getCell(row, 6).numFmt = "0.0%";
      calc(report.getCell(row, 8), `IF(NOT(ISNUMBER(C${row})),"Chưa có số liệu nguồn",IF(G${row}>0,"Tổng một phần; chưa đủ để đối chiếu",IF(NOT(ISNUMBER(E${row})),"Chưa đặt mốc đối chiếu","Đủ dữ liệu; xem nguồn mốc ở Doi chieu")))`, total?.value == null ? "Chưa có số liệu nguồn" : total.incomplete ? "Tổng một phần; chưa đủ để đối chiếu" : target ? "Đủ dữ liệu; xem nguồn mốc ở Doi chieu" : "Chưa đặt mốc đối chiếu");
    }
  }
  body(report, output - 1);
  report.getColumn(7).numFmt = "0";
  for (let row = FIRST; row < output; row++) if (report.getCell(row, 1).isMerged) report.getCell(row, 1).font = { ...font, bold: true };
  context(report, output, "Tổng một phần chỉ cộng các giá trị đã biết. Dấu — là chưa có dữ liệu hoặc chưa có mốc; 0 là giá trị bằng 0. Trung bình chia cho số ngày có nhập thực phẩm.");
  report.getRow(output).height = 38;
  const macroColumn = 4 + menu.fields.length * 2;
  for (let i = 0; i < 3; i++) {
    report.getCell(output + 1 + i, 1).value = ["Năng lượng từ đạm", "Năng lượng từ béo", "Năng lượng từ bột đường"][i];
    report.getCell(output + 1 + i, 2).value = "%";
    const ref = `'Phan tich'!${column(macroColumn + i)}${TOTAL}`;
    const key = ["proteinG", "lipidG", "glucidG"][i];
    const denominator = ["proteinG", "lipidG", "glucidG"].reduce((sum, k) => sum + (menu.totals[k]?.value ?? 0) * (k === "lipidG" ? 9 : 4), 0);
    const missing = ["proteinG", "lipidG", "glucidG"].some(k => menu.totals[k]?.incomplete || menu.totals[k]?.value == null);
    calc(report.getCell(output + 1 + i, 3), `IF(ISNUMBER(${ref}),${ref},"—")`, !missing && denominator ? menu.totals[key].value! * (i === 1 ? 9 : 4) / denominator : "—");
    report.getCell(output + 1 + i, 3).numFmt = "0.0%";
  }
  let note = output + 5;
  for (const text of [meta.subjectGroup && `Nhóm / mục tiêu: ${meta.subjectGroup}`, meta.clinicalCourse && `Theo dõi: ${meta.clinicalCourse}`, meta.menuNote && `Ghi chú: ${meta.menuNote}`, menu.aiComment && `Nhận xét tại thời điểm xuất: ${menu.aiComment}`].filter((text): text is string => Boolean(text))) {
    for (let offset = 0; offset < text.length; offset += 1000) {
      const part = text.slice(offset, offset + 1000);
      context(report, note, part); report.getRow(note).height = Math.max(30, Math.ceil(part.length / 130) * 18); note++;
    }
  }
  report.pageSetup.printArea = `A1:H${note}`;

  reportSheet(summary, "BÁO CÁO PHÂN TÍCH KHẨU PHẦN", headers, widths);
  for (const r of [3, 4]) context(summary, r, String(report.getCell(r, 1).value ?? ""));
  context(summary, 5, "");
  calc(summary.getCell("A5"), `'Thanh phan day du'!A5`, "Chưa sửa đầu vào; kết quả tại thời điểm xuất.");
  const mainKeys = new Set([...CORE_CALC_FIELDS.map(field => field.key), ...(menu.input.fields ?? []), "vitDMcg", "vitEMg", "vitKMcg", "vitB5Mg", "vitB6Mg", "folateTotalMcg", "folateDfeMcg", "vitB12Mcg", "cholesterolMg", "purinMg", "seleniumMcg"]);
  let mainRow = FIRST;
  for (const group of NUTRIENT_GROUPS) {
    const selected = group.fields.filter(field => mainKeys.has(field.key));
    if (!selected.length) continue;
    summary.mergeCells(mainRow, 1, mainRow, 8); summary.getCell(mainRow++, 1).value = group.title.toLocaleUpperCase("vi");
    for (const field of selected) {
      const sourceRow = fieldRows.get(field.key)!;
      summary.getCell(mainRow, 1).value = field.label; summary.getCell(mainRow, 2).value = field.unit;
      for (let c = 3; c <= 8; c++) {
        calc(summary.getCell(mainRow, c), `'Thanh phan day du'!${column(c)}${sourceRow}`, report.getCell(sourceRow, c).result as string | number | null);
        summary.getCell(mainRow, c).numFmt = report.getCell(sourceRow, c).numFmt;
      }
      mainRow++;
    }
  }
  body(summary, mainRow - 1); summary.getColumn(7).numFmt = "0";
  for (let r = FIRST; r < mainRow; r++) if (summary.getCell(r, 1).isMerged) summary.getCell(r, 1).font = { ...font, bold: true };
  for (let i = 0; i < 3; i++) {
    summary.getCell(mainRow, 1).value = report.getCell(output + 1 + i, 1).value;
    summary.getCell(mainRow, 2).value = "%";
    calc(summary.getCell(mainRow, 3), `'Thanh phan day du'!C${output + 1 + i}`, report.getCell(output + 1 + i, 3).result as string | number | null);
    summary.getCell(mainRow++, 3).numFmt = "0.0%";
  }
  context(summary, mainRow++, "Bảng này trình bày các chỉ tiêu chính và chất đã chọn. Toàn bộ 160 trường xem tại Thanh phan day du; theo từng ngày xem Dinh duong theo ngay nếu có.");
  context(summary, mainRow++, "Dấu — là chưa có số liệu hoặc mốc. Tổng một phần chỉ gồm các dòng đã biết. Trung bình chia cho ngày có nhập; dòng thiếu không được coi bằng 0.");
  for (const text of [meta.subjectGroup && `Nhóm / mục tiêu: ${meta.subjectGroup}`, meta.clinicalCourse && `Theo dõi: ${meta.clinicalCourse}`, meta.menuNote && `Ghi chú: ${meta.menuNote}`].filter((text): text is string => Boolean(text))) for (let offset = 0; offset < text.length; offset += 1000) {
    const part = text.slice(offset, offset + 1000); context(summary, mainRow, part); summary.getRow(mainRow++).height = Math.max(30, Math.ceil(part.length / 130) * 18);
  }
  summary.pageSetup.printArea = `A1:H${mainRow - 1}`;

  reportSheet(plan, "CHI TIẾT THỰC ĐƠN VÀ KHẨU PHẦN", ["Ngày / bữa", "Món ăn", "Thực phẩm", "Lượng / suất", "Đơn vị", "Số suất", "Ăn được (g)", "Nguồn / ghi chú"], [22, 29, 37, 14, 10, 10, 16, 40]);
  context(plan, 3, menu.title);
  context(plan, 4, "Sửa lượng, số suất hoặc mã thực phẩm tại Nhap khau phan. Bảng này tự cập nhật theo dữ liệu nhập.");
  context(plan, 5, "Định lượng công thức gốc và lượng thực dùng là hai thông tin riêng. Quy đổi thiếu nguồn được ghi —.");
  calc(plan.getCell("A5"), `IF(${structureNotice},"Đã thay đổi số dòng/ngày; cần xuất lại để bảng chi tiết bao phủ đủ đầu vào mới.","Định lượng công thức gốc và lượng thực dùng là hai thông tin riêng. Quy đổi thiếu nguồn được ghi —.")`, "Định lượng công thức gốc và lượng thực dùng là hai thông tin riêng. Quy đổi thiếu nguồn được ghi —.");
  const rows = menu.days.flatMap(day => day.rows.map(row => ({ day, row })));
  rows.forEach(({ day, row }, index) => {
    const targetRow = FIRST + index;
    const inputRow = FIRST + index;
    const ref = (c: string) => `'Nhap khau phan'!${c}${inputRow}`;
    const dayRef = `INDEX('Ngay va muc tieu'!$C$7:$C$96,${ref("B")})`;
    calc(plan.getCell(targetRow, 1), `${dayRef}&" / "&${ref("C")}`, `${day.label} / ${row.meal}`);
    calc(plan.getCell(targetRow, 2), ref("D"), row.dish);
    calc(plan.getCell(targetRow, 3), `IF(${ref("O")}<>"",${ref("O")},${ref("S")})`, row.actualFoodName || row.food.name);
    for (const [c, inputColumn, value] of [[4, "G", row.quantity], [5, "H", row.unit], [6, "I", row.servings], [7, "X", row.edibleGrams]] as const) calc(plan.getCell(targetRow, c), `IF(ISNUMBER(${ref(inputColumn)}),${ref(inputColumn)},${inputColumn === "H" ? ref(inputColumn) : '"—"'})`, value);
    calc(plan.getCell(targetRow, 8), `${ref("T")}&IF(${ref("Z")}="","","; "&${ref("Z")})&IF(${ref("AB")}="","","; "&${ref("AB")})`, [row.food.source.label, ...row.warnings, row.note].filter(Boolean).join("; "));
    plan.getRow(targetRow).height = Math.max(36, Math.ceil(Math.max(row.food.name.length / 35, row.dish.length / 27, (row.food.source.label.length + (row.note?.length ?? 0)) / 38)) * 17);
  });
  body(plan, FIRST + rows.length - 1);
  rows.forEach(({ row }, i) => { plan.getRow(FIRST + i).height = Math.max(36, Math.ceil(Math.max(row.food.name.length / 35, row.dish.length / 27, (row.food.source.label.length + (row.note?.length ?? 0)) / 38)) * 17); });
  const exchanges = workbook.addWorksheet("Nhom thuc pham");
  reportSheet(exchanges, "NHÓM THỰC PHẨM VÀ ĐƠN VỊ ĂN", ["Nhóm thực phẩm", "Số dòng", "Ăn được (g)", "Năng lượng (kcal)", "Đạm (g)", "Béo (g)", "Bột đường (g)", "Đơn vị ăn", "Ghi chú quy đổi"], [34, 10, 16, 19, 14, 14, 17, 15, 42]);
  context(exchanges, 3, "Nhóm thực phẩm theo phân loại đang có trong kho; có nhóm được suy luận theo tên, cần kiểm tra khi sử dụng.");
  context(exchanges, 4, "Đơn vị ăn dùng quy tắc hiện có trên website; không quy đổi khi chất dùng làm căn cứ còn thiếu.");
  context(exchanges, 5, "Danh sách giữ các nhóm có trong dữ liệu nhúng để bảng tiếp tục tính đúng khi đổi nguyên liệu.");
  const groups = [...new Set([...catalogue.map(food => food.foodGroup || "Chưa phân nhóm"), ...rows.map(({ row }) => row.food.foodGroup || "Chưa phân nhóm")])];
  const groupRange = `'_source'!$${column(build.sourceFields + 6)}$7:$${column(build.sourceFields + 6)}$${FIRST + build.inputCapacity - 1}`;
  const inputRange = (c: string) => `'Nhap khau phan'!$${c}$7:$${c}$${FIRST + build.inputCapacity - 1}`;
  groups.forEach((group, i) => {
    const r = FIRST + i, used = rows.filter(({ row }) => (row.food.foodGroup || "Chưa phân nhóm") === group), rule = getExchangeRule(group);
    exchanges.getCell(r, 1).value = group;
    calc(exchanges.getCell(r, 2), `COUNTIF(${groupRange},A${r})`, used.length); exchanges.getCell(r, 2).numFmt = "0";
    const metrics = [{ key: "edibleGrams", c: 3, inputColumn: "X" }, ...["energyKcal", "proteinG", "lipidG", "glucidG"].map((key, j) => ({ key, c: j + 4, inputColumn: column(29 + menu.fields.findIndex(field => field.key === key)) }))];
    metrics.forEach(metric => {
      const values = inputRange(metric.inputColumn);
      const known = used.filter(({ row }) => metric.key === "edibleGrams" ? row.edibleGrams !== null : row.referenceAmount === 0 || row.referenceAmount !== null && row.food.nutrients[metric.key] != null);
      const cached = known.length ? known.reduce((sum, { row }) => sum + (metric.key === "edibleGrams" ? row.edibleGrams! : row.referenceAmount === 0 ? 0 : row.referenceAmount! * row.food.nutrients[metric.key]! / 100), 0) : "—";
      calc(exchanges.getCell(r, metric.c), `IF(OR(B${r}=0,SUMPRODUCT(--(${groupRange}=A${r}),--ISNUMBER(${values}))<B${r}),"—",SUMIF(${groupRange},A${r},${values}))`, known.length === used.length ? cached : "—");
    });
    const driver = rule?.type === "glucid" ? "G" : rule?.type === "protein" ? "E" : rule?.type === "lipid" ? "F" : rule?.type === "qty" ? "C" : null;
    const known = used.filter(({ row }) => driver === "C" ? row.edibleGrams !== null : driver ? row.referenceAmount === 0 || row.referenceAmount !== null && row.food.nutrients[driver === "G" ? "glucidG" : driver === "E" ? "proteinG" : "lipidG"] != null : false);
    const base = driver && known.length === used.length && used.length ? known.reduce((sum, { row }) => sum + (driver === "C" ? row.edibleGrams! : row.referenceAmount === 0 ? 0 : row.referenceAmount! * row.food.nutrients[driver === "G" ? "glucidG" : driver === "E" ? "proteinG" : "lipidG"]! / 100), 0) : null;
    calc(exchanges.getCell(r, 8), driver ? `IF(ISNUMBER(${driver}${r}),${driver}${r}/${rule!.divisor},"—")` : '"—"', base !== null ? base / rule!.divisor : "—");
    exchanges.getCell(r, 9).value = rule?.unitText || "Chưa có quy tắc quy đổi";
  });
  body(exchanges, FIRST + groups.length - 1); exchanges.getColumn(2).numFmt = "0";
  calc(exchanges.getCell("A4"), `IF(SUM(B7:B${FIRST + groups.length - 1})<'Phan tich'!C98,"Có nhóm mới chưa nằm trong bảng này; xuất lại để cập nhật danh sách nhóm.","Đơn vị ăn dùng quy tắc hiện có trên website; không quy đổi khi chất dùng làm căn cứ còn thiếu.")`, "Đơn vị ăn dùng quy tắc hiện có trên website; không quy đổi khi chất dùng làm căn cứ còn thiếu.");

  if (menu.days.length > 1) {
    const daily = workbook.getWorksheet("Dinh duong theo ngay")!;
    reportSheet(daily, "THÀNH PHẦN DINH DƯỠNG THEO NGÀY", ["Ngày", "Chất dinh dưỡng", "Đơn vị", "Số lượng", "Mốc / ngày", "Tỷ lệ (%)", "Dòng thiếu", "Ghi chú"], [20, 35, 10, 16, 16, 14, 12, 37]);
    context(daily, 3, menu.title);
    context(daily, 4, "Mỗi ngày được tính riêng; ngày chưa nhập không được coi là 0. Tổng một phần chưa đủ để đối chiếu nhu cầu.");
    context(daily, 5, "Mốc và nguồn chỉnh ở Ngay va muc tieu; các chỉ tiêu chưa có số liệu vẫn được ghi rõ.");
    let out = FIRST;
    menu.days.forEach((day, dayIndex) => {
      ALL_NUTRIENT_FIELDS.forEach(field => {
        const row = out++;
        const index = menu.fields.findIndex(selected => selected.key === field.key);
        const metric = menu.dayTotals[dayIndex].totals[field.key];
        const target = menu.targets.find(target => target.key === field.key && target.value !== null);
        const value = `'Phan tich'!${column(4 + index * 2)}${FIRST + dayIndex}`;
        calc(daily.getCell(row, 1), `'Ngay va muc tieu'!C${FIRST + dayIndex}`, day.label);
        daily.getCell(row, 2).value = field.label; daily.getCell(row, 3).value = field.unit;
        calc(daily.getCell(row, 4), `IF(ISNUMBER(${value}),${value},"—")`, metric?.value ?? "—");
        const targetIndex = `MATCH("${field.key}",'Ngay va muc tieu'!$E$7:$E$96,0)`;
        calc(daily.getCell(row, 5), `IFERROR(IF(COUNT(INDEX('Ngay va muc tieu'!$F$7:$F$96,${targetIndex}))=0,"—",INDEX('Ngay va muc tieu'!$F$7:$F$96,${targetIndex})),"—")`, target?.value ?? "—");
        calc(daily.getCell(row, 7), `'Phan tich'!${column(5 + index * 2)}${FIRST + dayIndex}`, metric?.missingRows.length ?? 0);
        calc(daily.getCell(row, 6), `IF(OR(NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row})),E${row}<=0,G${row}>0),"—",D${row}/E${row})`, metric?.value != null && target?.value && !metric.incomplete ? metric.value / target.value : "—");
        daily.getCell(row, 6).numFmt = "0.0%";
        calc(daily.getCell(row, 8), `IF(NOT(ISNUMBER(D${row})),"Chưa có số liệu nguồn",IF(G${row}>0,"Tổng một phần; chưa đủ để đối chiếu",IF(NOT(ISNUMBER(E${row})),"Chưa đặt mốc đối chiếu","Đủ dữ liệu; nguồn mốc ở Doi chieu")))`, !day.rows.length ? "Ngày chưa nhập thực phẩm" : metric?.value == null ? "Chưa có số liệu nguồn" : metric.incomplete ? "Tổng một phần; chưa đủ để đối chiếu" : target ? "Đủ dữ liệu; nguồn mốc ở Doi chieu" : "Chưa đặt mốc đối chiếu");
      });
      if (dayIndex < menu.days.length - 1) daily.getRow(out - 1).addPageBreak();
    });
    body(daily, out - 1);
    daily.getColumn(7).numFmt = "0";
    calc(daily.getCell("A5"), `IF(${structureNotice},"Đã thay đổi số dòng/ngày; cần xuất lại để bảng theo ngày bao phủ đủ đầu vào mới.","Mốc và nguồn chỉnh ở Ngay va muc tieu; các chỉ tiêu chưa có số liệu vẫn được ghi rõ.")`, "Mốc và nguồn chỉnh ở Ngay va muc tieu; các chỉ tiêu chưa có số liệu vẫn được ghi rõ.");
  }

  reportSheet(sources, "NGUỒN SỐ LIỆU VÀ ĐỐI SOÁT", ["Nội dung", "Tên / mã", "Nguồn", "Cơ sở", "Giá trị / thông tin"], [24, 38, 40, 18, 60]);
  context(sources, 3, `Phiên bản dữ liệu: ${menu.dataVersion}. Xuất: ${menu.generatedAt}.`);
  context(sources, 4, "Đồng mg VDD và µg RNI giữ riêng; Vitamin A RAE, RE và số nguồn RNI không tự coi tương đương.");
  context(sources, 5, "Hai trường nguồn chưa rõ đơn vị/tên được giữ bên dưới để đối soát và không cộng vào khẩu phần.");
  let sourceRow = FIRST;
  for (const food of [...new Map(rows.map(({ row }) => [row.food.id, row.food])).values()]) {
    sources.getRow(sourceRow++).values = ["Thực phẩm", `${food.name} [${food.id}]`, food.source.label + (food.source.url ? `; ${food.source.url}` : ""), `100 ${food.unit}`, food.qualityWarnings?.join("; ") || "Số liệu theo nguồn; phần thiếu giữ trống trong bảng dữ liệu."];
  }
  for (const item of menu.targets.filter(target => target.value !== null)) sources.getRow(sourceRow++).values = ["Mốc đối chiếu / ngày", item.key, item.source || "Chưa ghi nguồn", item.isUpperLimit ? "Giới hạn trên" : "Mốc mục tiêu", item.value];
  const selectedIds = new Set(rows.map(({ row }) => row.foodId));
  for (const food of catalogue.filter(food => selectedIds.has(food.id))) for (const field of SOURCE_ONLY_NUTRIENT_FIELDS) {
    const value = food.sourceOnlyNutrients?.[field.key];
    sources.getRow(sourceRow++).values = [field.label, food.name, `${food.source.label}. ${field.note}`, `${field.unit}/100 ${food.unit}`, value ?? "—"];
  }
  for (const { row } of rows.filter(item => item.row.recipeSource.dishId || item.row.replacedFromFoodId)) sources.getRow(sourceRow++).values = ["Công thức / thay nguyên liệu", row.dish, row.recipeSource.label, row.recipeSource.dishId || "Bản riêng", `Dòng ${row.id}${row.replacedFromFoodId ? `; thay từ ${row.replacedFromFoodId} sang ${row.food.id}` : ""}`];
  if (menu.savedRecord) sources.getRow(sourceRow++).values = ["Bản đã lưu", menu.savedRecord.id, "Tài khoản chủ sở hữu", `Phiên bản ${menu.savedRecord.revision}`, "Sửa Excel không tự đồng bộ; nhập lại qua bước xem trước để lưu."];
  body(sources, sourceRow - 1);
  for (let r = FIRST; r < sourceRow; r++) {
    const lines = Math.max(...[24, 38, 40, 18, 60].map((width, i) => Math.ceil(String(sources.getCell(r, i + 1).value ?? "").length / (width - 2))));
    sources.getRow(r).height = Math.max(36, Math.min(400, lines * 16 + 8));
  }

  if (options.medications?.length) {
    const medications = workbook.addWorksheet("Thuoc TPBS");
    reportSheet(medications, "THUỐC VÀ THỰC PHẨM BỔ SUNG THEO BỮA", ["Bữa", "Tên", "Liều lượng", "Thời điểm", "Ghi chú"], [20, 38, 25, 35, 42]);
    context(medications, 3, "Lịch theo dõi do người dùng nhập; không cộng vào dinh dưỡng khẩu phần.");
    options.medications.forEach((item, i) => { medications.getRow(FIRST + i).values = [item.meal, item.name, item.dose, item.timing, item.note]; });
    body(medications, FIRST + options.medications.length - 1);
  }
  return { report: summary, detail: report, plan, sources, nutrientCount: ALL_NUTRIENT_FIELDS.length };
}
