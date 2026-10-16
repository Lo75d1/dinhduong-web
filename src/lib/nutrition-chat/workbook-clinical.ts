import type ExcelJS from "exceljs";
import type { ResolvedMenu } from "./contracts";
import { CLINICAL_TARGET_LABELS, DIET_STATUS_LABELS, dietRangeText } from "./clinical";

const font = { name: "Times New Roman", size: 12, color: { argb: "000000" } };
const col = (n: number) => { let s = ""; while (n) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); } return s; };
/** Append one clinical section to the existing report; link the existing nutrient calculation. */
export function appendClinicalWorkbookSection(sheet: ExcelJS.Worksheet, menu: ResolvedMenu, start: number, inputCapacity: number) {
  const assessment = menu.clinicalAssessment;
  if (!assessment) return start;
  let row = start + 1;
  sheet.getRow(row - 1).addPageBreak();
  const line = (text: string, bold = false) => {
    for (let offset = 0; offset < Math.max(1, text.length); offset += 900) {
      const part = text.slice(offset, offset + 900);
      sheet.mergeCells(row, 1, row, 8); const cell = sheet.getCell(row, 1); cell.value = part; cell.font = { ...font, bold }; cell.alignment = { wrapText: true, vertical: "middle" };
      sheet.getRow(row++).height = Math.max(24, Math.ceil(part.length / 115) * 17);
    }
  };
  line("ĐỐI CHIẾU CHẾ ĐỘ ĂN BỆNH LÝ", true);
  const { context, diet } = assessment;
  if (context.conditions?.length) line(`Tình trạng đã cung cấp: ${context.conditions.join("; ")}.`);
  if (context.notes) line(`Thông tin/chỉ định đã cung cấp: ${context.notes}`);
  if (!diet) { line("Chưa chọn mã; chưa đối chiếu bệnh lý."); return row; }
  line(`${diet.code} — ${diet.name}. ${CLINICAL_TARGET_LABELS[diet.targetGroup] || diet.targetGroup} · ${diet.diseaseGroup}. ${context.selection === "prescribed" ? "Chỉ định do người dùng cung cấp" : context.selection === "proposed" ? "Mã đang đề xuất, chưa chốt" : "Người dùng chọn/xác nhận"}.`, true);
  line(assessment.notice);
  const header = row++;
  sheet.getRow(header).values = ["Chỉ tiêu", "Đơn vị/ngày", "TB/ngày có dữ liệu", "Mốc thấp", "Mốc cao", "Ngày đủ cơ sở", "Ngày trong khoảng", "Đối chiếu tham khảo"];
  const border: Partial<ExcelJS.Borders> = Object.fromEntries(["top", "bottom", "left", "right"].map(side => [side, { style: "thin", color: { argb: "808080" } }]));
  sheet.getRow(header).height = 42;
  sheet.getRow(header).eachCell(cell => { cell.font = { ...font, bold: true }; cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" }; cell.border = border; });
  const last = 6 + inputCapacity;
  const estimated = `OR(${menu.days.some(day => day.rows.some(item => item.recipeSource.kind === "ai")) ? "TRUE" : "FALSE"},COUNTIF('Nhap khau phan'!$O$7:$O$${last},"?*")>0,COUNTIF('Nhap khau phan'!$R$7:$R$${last},"unknown")>0)`;
  const eligible = context.targetGroup === diet.targetGroup && (context.selection === "user_confirmed" || context.selection === "prescribed");
  for (const metric of assessment.metrics.filter(metric => metric.key !== "meals")) {
    const r = row++, index = menu.fields.findIndex(field => field.key === metric.key), valueColumn = col(4 + index * 2), missingColumn = col(5 + index * 2);
    const source = `'Phan tich'!${valueColumn}`, missing = `'Phan tich'!${missingColumn}`, numbers = `${source}$7:$${valueColumn}$96`, missingNumbers = `${missing}$7:$${missingColumn}$96`;
    const hasRange = metric.min !== null || metric.max !== null;
    sheet.getRow(r).values = [metric.label, metric.unit, null, metric.min ?? "—", metric.max ?? "—", null, null, null];
    const formula = (column: number, expression: string, result: string | number | null) => { sheet.getCell(r, column).value = { formula: expression, result: result ?? "—" }; };
    formula(3, index < 0 ? '"—"' : `IF(OR(${missing}$98>0,NOT(ISNUMBER(${source}$99))),"—",${source}$99)`, metric.average);
    const countGuard = index < 0 || !eligible || !hasRange;
    formula(6, countGuard ? "0" : `IF(${estimated},0,SUMPRODUCT(--ISNUMBER(${numbers}),--(${missingNumbers}=0),--('Phan tich'!$C$7:$C$96>0)))`, metric.assessedDays);
    formula(7, countGuard ? "0" : `IF(${estimated},0,SUMPRODUCT(--ISNUMBER(${numbers}),--(${missingNumbers}=0),--('Phan tich'!$C$7:$C$96>0)${metric.min !== null ? `,--(${numbers}>=D${r})` : ""}${metric.max !== null ? `,--(${numbers}<=E${r})` : ""}))`, metric.withinDays);
    formula(8, !eligible || !hasRange ? '"Chưa đủ cơ sở"' : `IF(OR(NOT(ISNUMBER(C${r})),${estimated}),"Chưa đủ cơ sở",${metric.min !== null ? `IF(C${r}<D${r},"Thấp hơn khoảng",` : ""}${metric.max !== null ? `IF(C${r}>E${r},"Cao hơn khoảng","Trong khoảng tham khảo")` : '"Trong khoảng tham khảo"'}${metric.min !== null ? ")" : ""})`, DIET_STATUS_LABELS[metric.status]);
    sheet.getRow(r).height = 24;
    for (let column = 1; column <= 8; column++) { const cell = sheet.getCell(r, column); cell.font = font; cell.border = border; cell.alignment = { wrapText: true, vertical: "middle", horizontal: column >= 3 && column <= 7 ? "right" : "left" }; cell.numFmt = column === 6 || column === 7 ? "0" : "#,##0.00"; }
  }
  const meals = diet.ranges.find(range => range.key === "meals");
  if (meals) line(`Số bữa tham khảo/ngày: ${dietRangeText(meals)}. Đối chiếu số bữa theo ngày xem báo cáo web.`);
  if (diet.note) line(`Ghi chú nguồn: ${diet.note}`);
  for (const warning of diet.qualityWarnings) line(warning);
  line(`Nguồn: ${diet.source.label}. ${diet.source.url}`);
  return row;
}
