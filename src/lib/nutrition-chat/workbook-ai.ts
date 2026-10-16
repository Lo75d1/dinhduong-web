import type ExcelJS from "exceljs";
import type { MenuRowInput } from "./contracts";
import { aiFilled } from "./presentation";

export const AI_INPUT_COLUMNS = { quantity: "G", servings: "I", conversionFactor: "K", densityGPerMl: "M" } as const;
const indirect = (sheet: string, address: string) => `INDIRECT("'${sheet}'!${address}")`;

/** A number format preserves numeric cells/formulas; the star disappears after editing. */
export function markAiNumber(sheet: ExcelJS.Worksheet, address: string, row: MenuRowInput, inputRow: number, fields: Array<keyof typeof AI_INPUT_COLUMNS>, base = "#,##0.0;(#,##0.0);0") {
  const marked = fields.filter(field => aiFilled(row, field));
  if (!marked.length) return;
  const same = marked.map(field => {
    const cell = `${AI_INPUT_COLUMNS[field]}${inputRow}`;
    return `${indirect("Nhap khau phan", cell)}=${indirect("_input", cell)}`;
  });
  sheet.addConditionalFormatting({ ref: address, rules: [{ type: "expression", priority: 2, formulae: [`AND(ISNUMBER(${address}),OR(${same.join(",")}))`], style: { numFmt: '"*"' + base.replaceAll(";", ';"*"') } }] });
}

export function markAiCustomNumber(sheet: ExcelJS.Worksheet, address: string) {
  sheet.addConditionalFormatting({ ref: address, rules: [{ type: "expression", priority: 2, formulae: [`AND(ISNUMBER(${address}),${address}=${indirect("_custom", address)})`], style: { numFmt: '"*"#,##0.00;"*"(#,##0.00);"*"0.00' } }] });
}
