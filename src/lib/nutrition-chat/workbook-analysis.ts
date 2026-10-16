import type ExcelJS from "exceljs";
import type { ResolvedMenu } from "./contracts";
import type { NutritionWorkbookOptions } from "./workbook-report";
import { assessWhoGrowth, WHO_GROWTH_ENTRIES } from "../who-growth";

type Style = (sheet: ExcelJS.Worksheet, title: string, headers: string[], widths: number[]) => void;
const FIRST = 7, TOTAL = 98, AVERAGE = 99;
const col = (n: number) => { let result = ""; while (n) { n--; result = String.fromCharCode(65 + n % 26) + result; n = Math.floor(n / 26); } return result; };
const font = { name: "Times New Roman", size: 12, color: { argb: "000000" } };
const border: Partial<ExcelJS.Borders> = Object.fromEntries(["top", "bottom", "left", "right"].map(edge => [edge, { style: "thin", color: { argb: "999999" } }]));
const literal = (cell: string) => `"="&SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${cell},"~","~~"),"*","~*"),"?","~?")`;
const cellValue = (cell: ExcelJS.Cell) => typeof cell.result === "number" ? cell.result : typeof cell.value === "number" ? cell.value : null;
const status = (value: number | null, target: number | null, missing: boolean, upper = false, energy = false) => missing || value === null || target === null || target <= 0 ? "Chưa đủ cơ sở" : upper ? value > target * 1.1 ? "Vượt" : "Đạt" : value < target * .9 ? "Thiếu" : energy && value > target * 1.1 ? "Vượt" : "Đạt";
const statusFormula = (value: string, target: string, missing: string, upper = false, energy = false) => `IF(OR(NOT(ISNUMBER(${value})),NOT(ISNUMBER(${target})),${target}<=0,${missing}),"Chưa đủ cơ sở",${upper ? `IF(${value}>${target}*1.1,"Vượt","Đạt")` : `IF(${value}<${target}*0.9,"Thiếu",${energy ? `IF(${value}>${target}*1.1,"Vượt","Đạt")` : '"Đạt"'})`})`;

export function nutritionAnalysisCellCount(menu: ResolvedMenu, groupCount = 0) {
  const rows = menu.days.flatMap(day => day.rows);
  return (new Set(rows.map(row => row.meal)).size + new Set(rows.map(row => row.dish)).size + 12) * 12 + (menu.days.length + 45) * 10 + menu.fields.length * 8 + Math.min(1000, Math.max(50, rows.length + 30)) * 5 + groupCount * (12 + Math.ceil(menu.days.length / 15));
}

/** Supplemental readers for web analysis tables; all nutrients still come from the existing input build. */
export function addNutritionAnalysisTables(workbook: ExcelJS.Workbook, menu: ResolvedMenu, options: NutritionWorkbookOptions, build: { inputCapacity: number; sourceFields: number }, style: Style) {
  const balance = workbook.getWorksheet("Can doi nang luong")!, contribution = workbook.getWorksheet("Dong gop bua mon")!;
  const analysis = workbook.getWorksheet("Phan tich")!, source = workbook.getWorksheet("_source")!, input = workbook.getWorksheet("Nhap khau phan")!;
  const rows = menu.days.flatMap(day => day.rows.map(row => ({ day, row })));
  const end = FIRST + build.inputCapacity - 1;
  const range = (c: string) => `'Nhap khau phan'!$${c}$7:$${c}$${end}`;
  const active = `--((LEN(${range("E")})+LEN(${range("F")}))>0)`;
  const fieldIndex = (key: string) => menu.fields.findIndex(field => field.key === key);
  const nutrientRange = (key: string) => range(col(29 + fieldIndex(key)));
  const analysisRef = (key: string, row: number, missing = false) => `'Phan tich'!${col(4 + fieldIndex(key) * 2 + (missing ? 1 : 0))}${row}`;
  const known = (indices: number[], key: string) => indices.map(index => cellValue(input.getCell(FIRST + index, 29 + fieldIndex(key)))).filter((value): value is number => value !== null);
  const numeric = (sheet: ExcelJS.Worksheet, row: number, c: number, formula: string, value: number | string | null) => { sheet.getCell(row, c).value = { formula, result: value ?? "—" }; };
  const markPartial = (sheet: ExcelJS.Worksheet, address: string, missing: string) => sheet.addConditionalFormatting({ ref: address, rules: [{ type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${address}),${missing})`], style: { numFmt: '"≥"#,##0.00;"≥"(#,##0.00);"≥"0.00' } }] });
  const header = (sheet: ExcelJS.Worksheet, row: number, title: string, labels: string[]) => {
    sheet.mergeCells(row, 1, row, labels.length); sheet.getCell(row, 1).value = title; sheet.getCell(row, 1).font = { ...font, bold: true }; sheet.getRow(row).height = 28;
    sheet.getRow(++row).values = labels; sheet.getRow(row).height = 46;
    sheet.getRow(row).eachCell(cell => { cell.font = { ...font, bold: true }; cell.border = border; cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; });
    return row + 1;
  };
  const body = (sheet: ExcelJS.Worksheet, first: number, last: number, columns: number) => { for (let r = first; r <= last; r++) {
    let lines = 1;
    for (let c = 1; c <= columns; c++) {
      const cell = sheet.getCell(r, c), text = cell.result ?? cell.value;
      if (typeof text === "string" && !cell.isMerged) lines = Math.max(lines, Math.ceil(text.length / ((sheet.getColumn(c).width ?? 18) * 1.05)));
      cell.font = font; cell.border = border; cell.alignment = { vertical: "middle", horizontal: typeof cellValue(cell) === "number" ? "right" : "left", wrapText: cellValue(cell) === null, shrinkToFit: false };
    }
    sheet.getRow(r).height = Math.min(409, Math.max(24, lines * 16 + 8));
  } };
  const note = (sheet: ExcelJS.Worksheet, row: number, text: string, columns: number) => { sheet.mergeCells(row, 1, row, columns); sheet.getCell(row, 1).value = text; sheet.getCell(row, 1).font = font; sheet.getCell(row, 1).alignment = { wrapText: true }; sheet.getRow(row).height = 34; };
  // Reusable counts at input grain, never a duplicate nutrient calculation.
  const helper = build.sourceFields + 7;
  const helperRange = (offset: number) => `'_source'!$${col(helper + offset)}$7:$${col(helper + offset)}$${end}`;
  const groupRange = `'_source'!$${col(build.sourceFields + 6)}$7:$${col(build.sourceFields + 6)}$${end}`;
  for (let i = 0; i < build.inputCapacity; i++) {
    const r = FIRST + i, ref = (c: string) => `'Nhap khau phan'!${c}${r}`;
    const inUse = `OR(${ref("E")}<>"",${ref("F")}<>"")`;
    const foodCriteria = `--(${range("E")}=${ref("E")} ),--(${range("F")}=${ref("F")})`;
    const formulas = [
      `IF(AND(${inUse},ISNUMBER(${ref("G")}),${ref("G")}>0),1/SUMPRODUCT(--(${range("B")}=${ref("B")}),--(${range("C")}=${ref("C")}),${active},--ISNUMBER(${range("G")}),--(${range("G")}>0)),0)`,
      `IF(${inUse},1/SUMPRODUCT(${foodCriteria}),0)`,
      `IF(${inUse},1/SUMPRODUCT(${foodCriteria},--(${range("D")}=${ref("D")})),0)`,
      `IF(${inUse},1/SUMPRODUCT(--(${groupRange}='_source'!${col(build.sourceFields + 6)}${r}),--(${range("B")}=${ref("B")}),${active}),0)`,
      `IF(${inUse},1/SUMPRODUCT(--(${range("D")}=${ref("D")}),${active}),0)`,
    ];
    formulas.forEach((formula, offset) => { source.getCell(r, helper + offset).value = { formula }; });
  }
  const mealColumn = 4 + menu.fields.length * 2 + 6;
  analysis.getCell(6, mealColumn).value = "Số bữa có dùng"; analysis.getColumn(mealColumn).width = 18;
  for (let i = 0; i < 90; i++) {
    const r = FIRST + i, day = menu.days[i];
    const count = day?.rows.length && day.rows.every(row => row.quantity !== null) ? new Set(day.rows.filter(row => row.quantity! > 0).map(row => row.meal)).size : null;
    analysis.getCell(r, mealColumn).value = { formula: `IF(C${r}=0,"",IF(SUMPRODUCT(--(${range("B")}=A${r}),${active},--ISNUMBER(${range("G")}))<>C${r},"",ROUND(SUMIFS(${helperRange(0)},${range("B")},A${r}),0)))`, ...(count !== null ? { result: count } : {}) };
  }

  style(balance, "CÂN ĐỐI NĂNG LƯỢNG VÀ HỒ SƠ", ["Ngày", "Kcal", "Mục tiêu", "Chênh lệch", "% mục tiêu", "Đạm (g)", "Béo (g)", "Bột đường (g)", "Số bữa", "Đánh giá"], [24, 15, 16, 16, 14, 13, 13, 14, 13, 30]);
  balance.views = [{ state: "normal", showGridLines: true, zoomScale: 100 }]; balance.pageSetup.printTitlesRow = "1:4";
  note(balance, 3, menu.title, 10);
  note(balance, 4, options.reportContext?.kitchenMode ? "Bếp tập thể: so với nhu cầu cả ngày chỉ để tham khảo; không kết luận thiếu hụt của người ăn." : "Đánh giá số học theo ngưỡng đang dùng trên web. Thiếu nguồn hoặc mục tiêu: chưa đủ cơ sở.", 10);
  numeric(balance, 5, 1, `'Phan tich'!A4`, "Chưa sửa đầu vào; nhận xét tại thời điểm xuất."); balance.mergeCells("A5:J5");
  const macroColumn = 4 + menu.fields.length * 2;
  menu.days.forEach((day, i) => {
    const r = FIRST + i, totals = menu.dayTotals[i].totals;
    numeric(balance, r, 1, `'Ngay va muc tieu'!C${r}`, day.label);
    ["energyKcal", "proteinG", "lipidG", "glucidG"].forEach((key, j) => {
      numeric(balance, r, j ? j + 5 : 2, `IF(ISNUMBER(${analysisRef(key, r)}),${analysisRef(key, r)},"—")`, totals[key]?.value ?? null);
      markPartial(balance, `${col(j ? j + 5 : 2)}${r}`, `INDIRECT("${analysisRef(key, r, true)}")>0`);
    });
    const goal = day.rows.length ? menu.targets.find(t => t.key === "energyKcal")?.value ?? null : null;
    numeric(balance, r, 3, `IF('Phan tich'!C${r}=0,"—",IF(ISNUMBER('Phan tich'!${col(macroColumn + 3)}${r}),'Phan tich'!${col(macroColumn + 3)}${r},"—"))`, goal);
    numeric(balance, r, 4, `IF(OR(NOT(ISNUMBER(B${r})),NOT(ISNUMBER(C${r})),${analysisRef("energyKcal", r, true)}>0),"—",B${r}-C${r})`, goal !== null && !totals.energyKcal.incomplete && totals.energyKcal.value !== null ? totals.energyKcal.value - goal : null);
    numeric(balance, r, 5, `IF(OR(NOT(ISNUMBER(B${r})),NOT(ISNUMBER(C${r})),C${r}<=0,${analysisRef("energyKcal", r, true)}>0),"—",B${r}/C${r})`, goal && !totals.energyKcal.incomplete && totals.energyKcal.value !== null ? totals.energyKcal.value / goal : null); balance.getCell(r, 5).numFmt = "0.0%";
    numeric(balance, r, 9, `IF(ISNUMBER('Phan tich'!${col(mealColumn)}${r}),'Phan tich'!${col(mealColumn)}${r},"—")`, cellValue(analysis.getCell(r, mealColumn)));
    balance.getCell(r, 9).numFmt = "0";
    numeric(balance, r, 10, options.reportContext?.kitchenMode ? '"Tham khảo cả ngày"' : statusFormula(`B${r}`, `C${r}`, `${analysisRef("energyKcal", r, true)}>0`, false, true), options.reportContext?.kitchenMode ? "Tham khảo cả ngày" : status(totals.energyKcal.value, goal, totals.energyKcal.incomplete, false, true));
  });
  body(balance, FIRST, FIRST + menu.days.length - 1, 10);
  let out = FIRST + menu.days.length + 2;
  out = header(balance, out, "TỔNG QUAN TOÀN KỲ", Array(10).fill(""));
  balance.mergeCells(out - 1, 1, out - 1, 3); balance.mergeCells(out - 1, 6, out - 1, 8);
  for (const [c, text] of [[1, "Chỉ tiêu"], [4, "Số lượng"], [5, "Đơn vị"], [6, "Chỉ tiêu"], [9, "Số lượng"], [10, "Đơn vị"]] as const) balance.getCell(out - 1, c).value = text;
  const summaryStart = out;
  const target = menu.targets.find(t => t.key === "energyKcal")?.value ?? null;
  const sumMetrics: Array<[string, string, number | string | null, string]> = [
    ["Ngày có đầu vào", "'Phan tich'!C99", menu.days.filter(day => day.rows.length).length, "ngày"],
    ["Ngày chưa nhập", `${menu.days.length}-'Phan tich'!C99`, menu.days.filter(day => !day.rows.length).length, "ngày"],
    ["Tổng năng lượng", analysisRef("energyKcal", TOTAL), menu.totals.energyKcal.value, "kcal"],
    ["Trung bình/ngày", analysisRef("energyKcal", AVERAGE), menu.analysis.averageEnergyKcal, "kcal/ngày"],
    ["Nhu cầu cả kỳ", `'Phan tich'!${col(macroColumn + 3)}98`, menu.analysis.targetPeriodKcal, "kcal"],
    ["Chênh năng lượng kỳ", `'Phan tich'!${col(macroColumn + 5)}98`, menu.analysis.periodGapKcal, "kcal"],
    ["Chênh bình quân/ngày", `IF(ISNUMBER('Phan tich'!${col(macroColumn + 5)}98),IF('Phan tich'!C99>0,'Phan tich'!${col(macroColumn + 5)}98/'Phan tich'!C99,"—"),"—")`, menu.analysis.averageGapKcal, "kcal/ngày"],
    ["Thực phẩm khác nhau", `ROUND(SUM(${helperRange(1)}),0)`, new Set(rows.map(({ row }) => row.food.id)).size, "thực phẩm"],
    ["Món khác nhau", `ROUND(SUM(${helperRange(4)}),0)`, new Set(rows.map(({ row }) => row.dish)).size, "món"],
    ["Nhóm đã phân loại", `COUNTIFS('Nhom thuc pham'!B7:B${workbook.getWorksheet("Nhom thuc pham")!.rowCount},">0",'Nhom thuc pham'!A7:A${workbook.getWorksheet("Nhom thuc pham")!.rowCount},"<>Chưa phân nhóm")`, new Set(rows.flatMap(({ row }) => row.food.foodGroup ? [row.food.foodGroup] : [])).size, "nhóm"],
    ["TB nhóm đã phân loại/ngày", `IF('Phan tich'!C99=0,"—",SUMIFS('Nhom thuc pham'!K7:K${workbook.getWorksheet("Nhom thuc pham")!.rowCount},'Nhom thuc pham'!A7:A${workbook.getWorksheet("Nhom thuc pham")!.rowCount},"<>Chưa phân nhóm")/'Phan tich'!C99)`, menu.analysis.dataDayCount ? menu.days.reduce((sum, day) => sum + new Set(day.rows.flatMap(row => row.food.foodGroup ? [row.food.foodGroup] : [])).size, 0) / menu.analysis.dataDayCount : null, "nhóm/ngày"],
    ["Dòng chưa phân nhóm", `SUMPRODUCT(${active},--((${groupRange}="")+(${groupRange}="Chưa phân nhóm")>0))`, rows.filter(({ row }) => !row.food.foodGroup).length, "dòng"],
  ];
  for (const label of ["Đạt", "Thiếu", "Vượt", "Chưa đủ cơ sở"]) sumMetrics.push([`Ngày ${label.toLocaleLowerCase("vi")}`, options.reportContext?.kitchenMode ? '"—"' : `COUNTIFS(J${FIRST}:J${FIRST + menu.days.length - 1},"${label}",'Phan tich'!C${FIRST}:C${FIRST + menu.days.length - 1},">0")`, options.reportContext?.kitchenMode ? "—" : menu.dayTotals.filter(day => day.hasData && status(day.totals.energyKcal.value, target, day.totals.energyKcal.incomplete, false, true) === label).length, "ngày"]);
  const half = Math.ceil(sumMetrics.length / 2);
  sumMetrics.forEach(([label, expr, value, unit], i) => {
    const r = out + i % half, c = i < half ? 1 : 6;
    balance.mergeCells(r, c, r, c + 2); balance.getCell(r, c).value = label;
    numeric(balance, r, c + 3, `IF(ISNUMBER(${expr}),${expr},"—")`, value); balance.getCell(r, c + 4).value = unit;
    if (["ngày", "thực phẩm", "món", "nhóm", "dòng"].includes(unit)) balance.getCell(r, c + 3).numFmt = "0";
  });
  out += half; body(balance, summaryStart, out - 1, 10);
  balance.getRow(out + 1).addPageBreak();
  out = header(balance, out + 2, "HỒ SƠ DÙNG ĐỂ ĐỐI CHIẾU", ["Thông tin", "Giá trị", "Đơn vị"]);
  const profile = menu.input.profile, weight = profile ? Number(profile.weight) : 0;
  const activityLabels = { sedentary: "Tĩnh tại", light: "Nhẹ", moderate: "Trung bình", heavy: "Nặng", very_heavy: "Rất nặng" };
  const physiologyLabels = { normal: "Bình thường", pregnant_1: "Có thai 3 tháng đầu", pregnant_2: "Có thai 3 tháng giữa", pregnant_3: "Có thai 3 tháng cuối", lactating_1: "Cho con bú 6 tháng đầu", lactating_2: "Cho con bú 6 tháng sau" };
  const weightRow = out + 2;
  for (const [label, value, unit] of [["Tuổi", profile?.age ? Number(profile.age) : "—", profile?.ageUnit === "thang" ? "tháng" : "tuổi"], ["Giới", profile?.gender ?? "—", ""], ["Cân nặng", weight > 0 ? weight : "—", "kg"], ["Chiều cao", profile?.height ? Number(profile.height) : "—", "cm"], ["Hoạt động", profile ? activityLabels[profile.activityLevel] : "—", ""], ["Sinh lý", profile ? physiologyLabels[profile.physiology] : "—", ""]]) { balance.getRow(out++).values = [label, value, unit]; }
  body(balance, out - 6, out - 1, 3);
  out = header(balance, out + 2, "CÂN ĐỐI P:L:G VÀ CHỈ SỐ TRÊN CÂN NẶNG", ["Chất", "Tổng (g)", "TB g/ngày", "Năng lượng (kcal)", "% năng lượng", "Mốc thấp (%)", "Mốc cao (%)", "g/kg/ngày", "Đánh giá"]);
  const macroStart = out;
  const macroMissing = ["proteinG", "lipidG", "glucidG"].map(key => `${analysisRef(key, TOTAL, true)}>0`).join(",");
  for (const [i, key] of ["proteinG", "lipidG", "glucidG"].entries()) {
    const r = out++, metric = menu.analysis.macros.find(m => m.key === key), factor = i === 1 ? 9 : 4, total = menu.totals[key];
    balance.getCell(r, 1).value = ["Đạm", "Béo", "Bột đường"][i];
    numeric(balance, r, 2, `IF(ISNUMBER(${analysisRef(key, TOTAL)}),${analysisRef(key, TOTAL)},"—")`, total.value);
    numeric(balance, r, 3, `IF(OR(NOT(ISNUMBER(B${r})),'Phan tich'!C99=0),"—",B${r}/'Phan tich'!C99)`, total.value !== null && menu.analysis.dataDayCount ? total.value / menu.analysis.dataDayCount : null);
    numeric(balance, r, 4, `IF(ISNUMBER(B${r}),B${r}*${factor},"—")`, total.value !== null ? total.value * factor : null);
    for (const c of [2, 3, 4]) markPartial(balance, `${col(c)}${r}`, `INDIRECT("${analysisRef(key, TOTAL, true)}")>0`);
    numeric(balance, r, 5, `IF(OR(${macroMissing},COUNT(D${macroStart}:D${macroStart + 2})<>3,SUM(D${macroStart}:D${macroStart + 2})<=0),"—",D${r}/SUM(D${macroStart}:D${macroStart + 2}))`, metric?.energySharePct !== null && metric?.energySharePct !== undefined ? metric.energySharePct / 100 : null); balance.getCell(r, 5).numFmt = "0.0%";
    balance.getCell(r, 6).value = metric?.recommendedMinPct ?? "—"; balance.getCell(r, 7).value = metric?.recommendedMaxPct ?? "—";
    numeric(balance, r, 8, `IF(OR(NOT(ISNUMBER(C${r})),${analysisRef(key, TOTAL, true)}>0,NOT(ISNUMBER($B$${weightRow})),$B$${weightRow}<=0),"—",C${r}/$B$${weightRow})`, weight > 0 && !total.incomplete && total.value !== null && menu.analysis.dataDayCount ? total.value / menu.analysis.dataDayCount / weight : null);
    numeric(balance, r, 9, `IF(OR(NOT(ISNUMBER(E${r})),NOT(ISNUMBER(F${r})),NOT(ISNUMBER(G${r}))),"Chưa đủ cơ sở",IF(E${r}*100<F${r},"Thiếu",IF(E${r}*100>G${r},"Vượt","Đạt")))`, metric?.energySharePct == null || metric.recommendedMinPct === null || metric.recommendedMaxPct === null ? "Chưa đủ cơ sở" : metric.energySharePct < metric.recommendedMinPct ? "Thiếu" : metric.energySharePct > metric.recommendedMaxPct ? "Vượt" : "Đạt");
  }
  body(balance, macroStart, out - 1, 9);
  const energyPerKg = out++;
  balance.getCell(energyPerKg, 1).value = "Kcal/kg/ngày";
  numeric(balance, energyPerKg, 2, `IF(OR(NOT(ISNUMBER(${analysisRef("energyKcal", AVERAGE)})),${analysisRef("energyKcal", TOTAL, true)}>0,NOT(ISNUMBER($B$${weightRow})),$B$${weightRow}<=0),"—",${analysisRef("energyKcal", AVERAGE)}/$B$${weightRow})`, weight > 0 && !menu.totals.energyKcal.incomplete && menu.analysis.averageEnergyKcal !== null ? menu.analysis.averageEnergyKcal / weight : null);
  const ageMonths = profile ? Number(profile.age) * (profile.ageUnit === "thang" ? 1 : 12) : 0;
  if (ageMonths > 0 && ageMonths <= 228) {
    const growth = assessWhoGrowth(WHO_GROWTH_ENTRIES.filter(entry => entry.sex === (profile?.gender === "Nữ" ? "Nu" : "Nam")), ageMonths, weight, Number(profile?.height));
    balance.getRow(out + 1).addPageBreak();
    out = header(balance, out + 2, "Z-SCORE TRẺ EM · CHUẨN WHO", ["Chỉ số", "Thực tế", "Đơn vị", "Z-score", "Diễn giải", "Nguồn"]);
    const first = out;
    balance.mergeCells(out - 1, 6, out - 1, 10);
    for (const item of growth) { balance.getRow(out).values = [item.label, item.value, item.unit, item.score, item.status, item.source]; balance.mergeCells(out, 6, out, 10); out++; }
    if (!growth.length) note(balance, out++, "Chưa đủ cân nặng, chiều cao hoặc chuẩn nguồn phù hợp; không tự điền Z-score.", 10);
    else body(balance, first, out - 1, 6);
  }
  balance.pageSetup.printArea = `A1:J${out}`;

  style(contribution, "ĐÓNG GÓP CỦA BỮA VÀ MÓN TRONG TOÀN KỲ", ["Bữa", "Ngày có bữa", "Tổng kcal", "TB kcal/ngày", "% toàn kỳ", "% mục tiêu", "Mục tiêu kcal", "Chênh kcal", "Đạm (g)", "Béo (g)", "Bột đường (g)", "Đánh giá"], [25, 11, 15, 16, 12, 12, 16, 16, 13, 13, 14, 26]);
  contribution.views = [{ state: "normal", showGridLines: true, zoomScale: 100 }]; contribution.pageSetup.printTitlesRow = "1:4";
  note(contribution, 3, menu.title, 12);
  const shares = options.reportContext?.mealShares ?? {};
  const mealNames = [...new Set(rows.map(({ row }) => row.meal))];
  const validShares = mealNames.length > 0 && Object.keys(shares).every(meal => mealNames.includes(meal)) && Math.abs(mealNames.reduce((sum, name) => sum + (shares[name] ?? 0), 0) - 100) <= .5;
  note(contribution, 4, validShares ? "Mục tiêu từng bữa do người dùng nhập trên web; tổng tỷ lệ bằng 100%." : "Chưa có bộ mục tiêu từng bữa đủ 100%; không tự chia tỷ lệ hoặc kết luận theo bữa.", 12);
  numeric(contribution, 5, 1, `IF('_source'!A1,"Nhóm theo tên bữa/món trong toàn kỳ","Đã đổi ngày/bữa/món hoặc số dòng; xuất lại để cập nhật danh sách nhóm.")`, "Nhóm theo tên bữa/món trong toàn kỳ"); contribution.mergeCells("A5:L5");
  const metricFor = (r: number, c: number, key: string, kind: "C" | "D", indices: number[]) => {
    const values = known(indices, key), criteria = `${range(kind)},${literal(`A${r}`)}`;
    numeric(contribution, r, c, `IF(COUNTIFS(${range(kind)},${literal(`A${r}`)})=0,"—",IF(SUMPRODUCT(--(${range(kind)}=A${r}),--ISNUMBER(${nutrientRange(key)}))=0,"—",SUMIFS(${nutrientRange(key)},${criteria})))`, values.length ? values.reduce((a, b) => a + b, 0) : null);
    const group = `INDIRECT("${range(kind)}")`, nutrients = `INDIRECT("${nutrientRange(key)}")`, e = `INDIRECT("${range("E")}")`, f = `INDIRECT("${range("F")}")`;
    markPartial(contribution, `${col(c)}${r}`, `SUMPRODUCT(--(${group}=A${r}),--((LEN(${e})+LEN(${f}))>0))>SUMPRODUCT(--(${group}=A${r}),--ISNUMBER(${nutrients}))`);
  };
  for (const [i, meal] of mealNames.entries()) {
    const r = FIRST + i, indices = rows.flatMap(({ row }, j) => row.meal === meal ? [j] : []), energy = known(indices, "energyKcal"), complete = energy.length === indices.length;
    contribution.getCell(r, 1).value = meal;
    numeric(contribution, r, 2, `COUNTIF('Theo bua'!$C$7:$C$${end},${literal(`A${r}`)})`, new Set(indices.map(j => rows[j].day.id)).size);
    contribution.getCell(r, 2).numFmt = "0";
    metricFor(r, 3, "energyKcal", "C", indices);
    const cached = energy.length ? energy.reduce((a, b) => a + b, 0) : null;
    numeric(contribution, r, 4, `IF(OR(NOT(ISNUMBER(C${r})),'Phan tich'!C99=0),"—",C${r}/'Phan tich'!C99)`, cached !== null && menu.analysis.dataDayCount ? cached / menu.analysis.dataDayCount : null);
    numeric(contribution, r, 5, `IF(OR(NOT(ISNUMBER(C${r})),NOT(ISNUMBER(${analysisRef("energyKcal", TOTAL)})),${analysisRef("energyKcal", TOTAL)}<=0,${analysisRef("energyKcal", TOTAL, true)}>0),"—",C${r}/${analysisRef("energyKcal", TOTAL)})`, complete && !menu.totals.energyKcal.incomplete && menu.totals.energyKcal.value ? cached! / menu.totals.energyKcal.value : null); contribution.getCell(r, 5).numFmt = "0.0%";
    contribution.getCell(r, 6).value = validShares ? (shares[meal] ?? 0) / 100 : "—"; contribution.getCell(r, 6).numFmt = "0.0%";
    numeric(contribution, r, 7, `IF(OR(NOT(ISNUMBER(F${r})),NOT(ISNUMBER('Phan tich'!${col(macroColumn + 3)}98))),"—",F${r}*'Phan tich'!${col(macroColumn + 3)}98)`, validShares && target !== null ? (shares[meal] ?? 0) / 100 * target * menu.analysis.dataDayCount : null);
    const missing = `SUMPRODUCT(--(${range("C")}=A${r}),${active})<>SUMPRODUCT(--(${range("C")}=A${r}),--ISNUMBER(${nutrientRange("energyKcal")}))`;
    const mealGoal = validShares && target !== null ? (shares[meal] ?? 0) / 100 * target * menu.analysis.dataDayCount : null;
    numeric(contribution, r, 8, `IF(OR(NOT(ISNUMBER(C${r})),NOT(ISNUMBER(G${r})),${missing}),"—",C${r}-G${r})`, complete && cached !== null && mealGoal !== null ? cached - mealGoal : null);
    ["proteinG", "lipidG", "glucidG"].forEach((key, j) => metricFor(r, 9 + j, key, "C", indices));
    numeric(contribution, r, 12, statusFormula(`C${r}`, `G${r}`, missing, false, true), status(cached, mealGoal, !complete, false, true));
  }
  body(contribution, FIRST, FIRST + mealNames.length - 1, 12);
  out = header(contribution, FIRST + mealNames.length + 2, "MÓN ĐÓNG GÓP TRONG TOÀN KỲ", ["Món", "Lần xuất hiện", "Thực phẩm", "Tổng kcal", "% toàn kỳ", "Đạm (g)", "Béo (g)", "Bột đường (g)", "Natri (mg)"]);
  const dishStart = out;
  for (const dish of [...new Set(rows.map(({ row }) => row.dish))]) {
    const r = out++, indices = rows.flatMap(({ row }, i) => row.dish === dish ? [i] : []);
    contribution.getCell(r, 1).value = dish;
    numeric(contribution, r, 2, `COUNTIF('Theo mon'!$D$7:$D$${end},${literal(`A${r}`)})`, new Set(indices.map(i => `${rows[i].day.id}\0${rows[i].row.meal}`)).size);
    numeric(contribution, r, 3, `ROUND(SUMIFS(${helperRange(2)},${range("D")},${literal(`A${r}`)}),0)`, new Set(indices.map(i => rows[i].row.food.id)).size);
    contribution.getCell(r, 2).numFmt = "0"; contribution.getCell(r, 3).numFmt = "0";
    ["energyKcal", "proteinG", "lipidG", "glucidG", "sodiumMg"].forEach((key, j) => metricFor(r, j ? j + 5 : 4, key, "D", indices));
    const values = known(indices, "energyKcal");
    numeric(contribution, r, 5, `IF(OR(NOT(ISNUMBER(D${r})),NOT(ISNUMBER(${analysisRef("energyKcal", TOTAL)})),${analysisRef("energyKcal", TOTAL)}<=0,${analysisRef("energyKcal", TOTAL, true)}>0),"—",D${r}/${analysisRef("energyKcal", TOTAL)})`, values.length === indices.length && !menu.totals.energyKcal.incomplete && menu.totals.energyKcal.value ? values.reduce((a, b) => a + b, 0) / menu.totals.energyKcal.value : null); contribution.getCell(r, 5).numFmt = "0.0%";
  }
  body(contribution, dishStart, out - 1, 9);
  contribution.pageSetup.printArea = `A1:L${out}`;

  const groups = workbook.getWorksheet("Nhom thuc pham")!;
  groups.getCell("J6").value = "% năng lượng toàn kỳ"; groups.getCell("K6").value = "Ngày có nhóm"; groups.getCell("L6").value = "Ngày sử dụng\n(số thứ tự)";
  groups.getColumn(10).width = 19; groups.getColumn(11).width = 16; groups.getColumn(12).width = 24;
  groups.getRow(6).eachCell(cell => { cell.font = { ...font, bold: true }; cell.border = border; cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; });
  for (let r = FIRST; r <= groups.rowCount; r++) {
    const group = String(groups.getCell(r, 1).value ?? "");
    const used = rows.filter(({ row }) => (row.food.foodGroup || "Chưa phân nhóm") === group);
    const energy = used.map(({ row }) => cellValue(input.getCell(FIRST + rows.findIndex(item => item.row.id === row.id), 29 + fieldIndex("energyKcal"))));
    const full = used.length > 0 && energy.every(value => value !== null) && !menu.totals.energyKcal.incomplete && menu.totals.energyKcal.value;
    numeric(groups, r, 10, `IF(OR(B${r}=0,NOT(ISNUMBER(D${r})),NOT(ISNUMBER(${analysisRef("energyKcal", TOTAL)})),${analysisRef("energyKcal", TOTAL)}<=0,${analysisRef("energyKcal", TOTAL, true)}>0),"—",D${r}/${analysisRef("energyKcal", TOTAL)})`, full ? energy.reduce<number>((sum, value) => sum + value!, 0) / menu.totals.energyKcal.value! : null); groups.getCell(r, 10).numFmt = "0.0%";
    numeric(groups, r, 11, `ROUND(SUMIFS(${helperRange(3)},${groupRange},${literal(`A${r}`)}),0)`, new Set(used.map(item => item.day.id)).size); groups.getCell(r, 11).numFmt = "0";
    const dayChunks: string[] = [];
    for (let first = 0; first < menu.days.length; first += 15) {
      const cell = source.getCell(r, helper + 5 + first / 15), parts: string[] = [];
      const cached: string[] = [];
      menu.days.slice(first, first + 15).forEach((day, i) => {
        const number = first + i + 1;
        parts.push(`IF(COUNTIFS(${groupRange},${literal(`'Nhom thuc pham'!A${r}`)},${range("B")},${number})>0,"${number}; ","")`);
        if (used.some(item => item.day.id === day.id)) cached.push(`${number}; `);
      });
      cell.value = { formula: parts.join("&"), result: cached.join("") }; dayChunks.push(`'_source'!${cell.address}`);
    }
    const joined = dayChunks.join("&");
    numeric(groups, r, 12, `IF(LEN(${joined})=0,"—",LEFT(${joined},LEN(${joined})-2))`, menu.days.flatMap((day, i) => used.some(item => item.day.id === day.id) ? [i + 1] : []).join("; ") || "—");
    for (const c of [10, 11, 12]) { const cell = groups.getCell(r, c); cell.font = font; cell.border = border; cell.alignment = { horizontal: c === 12 ? "left" : "right", vertical: "middle", wrapText: c === 12 }; }
  }
  groups.pageSetup.printArea = `A1:L${groups.rowCount}`;

  // Append the web's comparable/achieved-day table to the existing full nutrient report.
  const report = workbook.getWorksheet("Thanh phan day du")!;
  const nutrientRows = new Map<string, number>();
  report.eachRow((row, number) => {
    for (const field of menu.fields) if (!nutrientRows.has(field.key) && row.getCell(1).value === field.label && row.getCell(2).value === field.unit) nutrientRows.set(field.key, number);
  });
  out = header(report, report.rowCount + 3, "ĐỐI CHIẾU KHUYẾN NGHỊ THEO NGÀY", ["Chất", "Đơn vị", "Nhu cầu cả kỳ", "Ngày đủ cơ sở", "Ngày đạt", "Đánh giá", "Loại mốc", "Nguồn mốc"]);
  const responseStart = out;
  for (const field of menu.fields) {
    const r = out++, f = fieldIndex(field.key), target = menu.targets.find(t => t.key === field.key), missing = analysisRef(field.key, TOTAL, true);
    const values = `'Phan tich'!$${col(4 + f * 2)}$7:$${col(4 + f * 2)}$96`, misses = `'Phan tich'!$${col(5 + f * 2)}$7:$${col(5 + f * 2)}$96`;
    const keys = "'Ngay va muc tieu'!$E$7:$E$96", match = `MATCH("${field.key}",${keys},0)`, upperLookup = `IF(COUNTIF(${keys},"${field.key}")=0,FALSE,INDEX('Ngay va muc tieu'!$H$7:$H$96,${match})="Có")`;
    const goal = `$E$${nutrientRows.get(field.key)!}`, upper = `G${r}="Giới hạn trên"`;
    report.getCell(r, 1).value = field.label; report.getCell(r, 2).value = field.unit;
    numeric(report, r, 3, `IF(ISNUMBER(${goal}),(${goal})*'Phan tich'!C99,"—")`, target?.value != null ? target.value * menu.analysis.dataDayCount : null);
    const comparable = menu.dayTotals.filter(day => day.hasData && !day.totals[field.key].incomplete && day.totals[field.key].value !== null && (target?.value ?? 0) > 0);
    const eligible = `SUMPRODUCT(--('Phan tich'!$C$7:$C$96>0),--ISNUMBER(${values}),--(${misses}=0)`;
    numeric(report, r, 4, `IF(OR(NOT(ISNUMBER(${goal})),(${goal})<=0),"—",${eligible}))`, (target?.value ?? 0) > 0 ? comparable.length : null);
    const achieved = comparable.filter(day => status(day.totals[field.key].value, target!.value, false, target?.isUpperLimit, field.key === "energyKcal") === "Đạt").length;
    const belowUpper = `${eligible},--(${values}<=${goal}*1.1))`, meetsMinimum = `${eligible},--(${values}>=${goal}*0.9)${field.key === "energyKcal" ? `,--(${values}<=${goal}*1.1)` : ""})`;
    numeric(report, r, 5, `IF(OR(NOT(ISNUMBER(D${r})),D${r}=0),"—",IF(${upper},${belowUpper},${meetsMinimum}))`, comparable.length ? achieved : null);
    const avg = analysisRef(field.key, AVERAGE);
    numeric(report, r, 6, `IF(${upper},${statusFormula(avg, `(${goal})`, `${missing}>0`, true)},${statusFormula(avg, `(${goal})`, `${missing}>0`, false, field.key === "energyKcal")})`, status(menu.totals[field.key].value !== null && menu.analysis.dataDayCount ? menu.totals[field.key].value! / menu.analysis.dataDayCount : null, target?.value ?? null, menu.totals[field.key].incomplete, target?.isUpperLimit, field.key === "energyKcal"));
    numeric(report, r, 7, `IF(${upperLookup},"Giới hạn trên","Mức đáp ứng")`, target?.isUpperLimit ? "Giới hạn trên" : "Mức đáp ứng");
    numeric(report, r, 8, `IF(COUNTIF(${keys},"${field.key}")=0,"Chưa có mốc",INDEX('Ngay va muc tieu'!$G$7:$G$96,${match}))`, target?.source ?? "Chưa có mốc");
  }
  body(report, responseStart, out - 1, 8);
  for (let r = responseStart; r < out; r++) { report.getCell(r, 4).numFmt = "0"; report.getCell(r, 5).numFmt = "0"; }
  report.pageSetup.printArea = `A1:H${out - 1}`;
  return { helperRange, groupRange };
}
