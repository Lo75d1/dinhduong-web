import type ExcelJS from "exceljs";
import type { ResolvedMenu } from "./contracts";

const FIRST = 7;
const font = { name: "Times New Roman", size: 15, color: { argb: "17201D" } };

export function dailyMenuCellCount(menu: ResolvedMenu) {
  return menu.days.length > 1 ? (menu.days.reduce((sum, day) => sum + day.rows.length, 0) + menu.days.length * 10) * 11 : 0;
}

/** One readable day per tab; formulas still use the canonical editable input. */
export function addDailyMenuSheets(workbook: ExcelJS.Workbook, menu: ResolvedMenu) {
  if (menu.days.length < 2) return;
  const plan = workbook.getWorksheet("Thuc don");
  if (!plan) return;
  let offset = 0;
  let firstSheet: ExcelJS.Worksheet | undefined;
  menu.days.forEach((day, index) => {
    const sheet = workbook.addWorksheet(`Ngay ${String(index + 1).padStart(2, "0")}`);
    firstSheet ??= sheet;
    sheet.properties.tabColor = { argb: "123C36" };
    sheet.columns = plan.columns.map(column => ({ width: column.width, style: structuredClone(column.style) }));
    sheet.views = [{ state: "normal", showGridLines: false, zoomScale: 100 }];
    sheet.pageSetup = { ...structuredClone(plan.pageSetup), orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.headerFooter = structuredClone(plan.headerFooter);
    for (let r = 1; r <= 5; r++) {
      sheet.mergeCells(r, 1, r, 11);
      const source = plan.getCell(r, 1);
      sheet.getCell(r, 1).value = structuredClone(source.value);
      sheet.getCell(r, 1).style = structuredClone(source.style);
      sheet.getRow(r).height = plan.getRow(r).height;
    }
    sheet.getCell("A2").value = `${menu.mode === "menu" ? "THỰC ĐƠN" : "KHẨU PHẦN"} · ${day.label}${day.date ? ` · ${day.date}` : ""}`;
    sheet.getCell("A3").value = menu.title;
    sheet.getCell("A4").value = "Mỗi sheet là một ngày. Định lượng là tổng các suất đã chọn; giữ đúng đơn vị và cơ sở lượng. Sửa tại Nhap khau phan để cập nhật dinh dưỡng.";
    if (day.rows.length) sheet.getCell("A5").value = {
      formula: `IF(COUNTIF('Nhap khau phan'!B${FIRST + offset}:B${FIRST + offset + day.rows.length - 1},${index + 1})<>${day.rows.length},"Đã chuyển dòng sang ngày khác; xuất lại để chia ngày đúng.",'Thuc don'!A5)`,
      result: plan.getCell("A5").result ?? "",
    };
    for (let c = 1; c <= 11; c++) {
      sheet.getCell(6, c).value = plan.getCell(6, c).value;
      sheet.getCell(6, c).style = structuredClone(plan.getCell(6, c).style);
    }
    sheet.getRow(6).height = plan.getRow(6).height;
    day.rows.forEach((_row, rowIndex) => {
      const sourceRow = FIRST + offset + rowIndex;
      const targetRow = FIRST + rowIndex;
      sheet.getRow(targetRow).height = plan.getRow(sourceRow).height;
      for (let c = 1; c <= 11; c++) {
        const source = plan.getCell(sourceRow, c), target = sheet.getCell(targetRow, c);
        const value = structuredClone(source.value);
        // ExcelJS's value getter omits a cached zero/false from formulas.
        // Read result separately so a genuine zero cannot become a blank.
        target.value = value && typeof value === "object" && ("formula" in value || "sharedFormula" in value) && source.result !== undefined
          ? { ...value, result: source.result } : value;
        target.style = structuredClone(source.style);
        if (source.note) target.note = structuredClone(source.note);
      }
      // Unlike the combined plan, a day sheet must expose its quantity basis.
      const inputRow = sourceRow;
      const basis = `'Nhap khau phan'!J${inputRow}`;
      const state = _row.sourceState === "raw_clean" ? "Sống sạch" : _row.sourceState === "cooked" ? "Đã chín" : _row.sourceState === "as_sold" ? "Theo sản phẩm" : "Theo nguồn; kiểm tra sống/chín";
      const basisLabel = _row.basis === "raw" ? "Lượng mua" : _row.basis === "cooked" ? "Lượng chín" : state;
      const sourceNote = plan.getCell(sourceRow, 11).result ?? "";
      sheet.getCell(targetRow, 11).value = {
        formula: `IF(${basis}="raw","Lượng mua",IF(${basis}="cooked","Lượng chín","${state}"))&"; "&'Thuc don'!K${sourceRow}`,
        result: `${basisLabel}; ${sourceNote}`,
      };
    });
    if (!day.rows.length) {
      sheet.mergeCells(FIRST, 1, FIRST, 11);
      sheet.getCell(FIRST, 1).value = "Chưa nhập thực phẩm cho ngày này; chưa có kết quả dinh dưỡng.";
      sheet.getCell(FIRST, 1).font = font;
      sheet.getCell(FIRST, 1).alignment = { wrapText: true, vertical: "middle" };
      sheet.getRow(FIRST).height = 40;
    }
    const totalRow = FIRST + Math.max(1, day.rows.length) + 1;
    sheet.mergeCells(totalRow, 1, totalRow, 6);
    sheet.getCell(totalRow, 1).value = "TỔNG DINH DƯỠNG TRONG NGÀY";
    sheet.getRow(totalRow).font = { ...font, bold: true };
    const totals = menu.dayTotals.find(total => total.id === day.id)?.totals;
    const keys = ["energyKcal", "proteinG", "lipidG", "glucidG"];
    keys.forEach((key, i) => {
      const letter = String.fromCharCode(71 + i), cell = sheet.getCell(totalRow, 7 + i);
      cell.numFmt = "#,##0.0;(#,##0.0);0";
      cell.value = day.rows.length ? {
        formula: `IF(COUNT(${letter}${FIRST}:${letter}${FIRST + day.rows.length - 1})=0,"—",SUM(${letter}${FIRST}:${letter}${FIRST + day.rows.length - 1}))`,
        result: totals?.[key]?.value ?? "—",
      } : "—";
    });
    sheet.getCell(totalRow, 11).value = keys.some(key => totals?.[key]?.incomplete) ? "Tổng một phần; còn dữ liệu thiếu, chưa kết luận đủ nhu cầu." : day.rows.length ? "Xem hồ sơ và nhu cầu trước khi đánh giá mức đáp ứng." : "Ngày chưa nhập không tính là 0 kcal.";
    sheet.getCell(totalRow, 11).alignment = { wrapText: true, vertical: "middle" };
    sheet.getRow(totalRow).height = 50;
    sheet.pageSetup.printArea = `A1:K${totalRow}`;
    offset += day.rows.length;
  });
  if (firstSheet) {
    const activeTab = workbook.worksheets.indexOf(firstSheet);
    workbook.views = [{ ...workbook.views[0], activeTab, firstSheet: activeTab }];
  }
}
