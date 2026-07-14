import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "D:/datanutrition";
const OUT = path.resolve("src/lib/who-growth-data.generated.json");
const files = [
  ["wfa_boys_0-to-5-years_zscores.xlsx", "Nam", "wfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["wfa_girls_0-to-5-years_zscores.xlsx", "Nu", "wfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["lhfa_boys_0-to-2-years_zscores.xlsx", "Nam", "lhfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["lhfa_boys_2-to-5-years_zscores.xlsx", "Nam", "lhfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["lhfa_girls_0-to-2-years_zscores.xlsx", "Nu", "lhfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["lhfa_girls_2-to-5-years_zscores.xlsx", "Nu", "lhfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["wfl_boys_0-to-2-years_zscores.xlsx", "Nam", "wfl", "sizeCm", "WHO Child Growth Standards 2006"],
  ["wfl_girls_0-to-2-years_zscores.xlsx", "Nu", "wfl", "sizeCm", "WHO Child Growth Standards 2006"],
  ["wfh_boys_2-to-5-years_zscores.xlsx", "Nam", "wfh", "sizeCm", "WHO Child Growth Standards 2006"],
  ["wfh_girls_2-to-5-years_zscores.xlsx", "Nu", "wfh", "sizeCm", "WHO Child Growth Standards 2006"],
  ["bmi_boys_0-to-2-years_zcores.xlsx", "Nam", "bfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["bmi_boys_2-to-5-years_zscores.xlsx", "Nam", "bfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["bmi_girls_0-to-2-years_zscores.xlsx", "Nu", "bfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["bmi_girls_2-to-5-years_zscores.xlsx", "Nu", "bfa", "ageMonths", "WHO Child Growth Standards 2006"],
  ["bmi-boys-z-who-2007-exp.xlsx", "Nam", "bfa", "ageMonths", "WHO Growth Reference 2007 (5-19 years)"],
  ["bmi-girls-z-who-2007-exp.xlsx", "Nu", "bfa", "ageMonths", "WHO Growth Reference 2007 (5-19 years)"],
  ["hfa-boys-z-who-2007-exp.xlsx", "Nam", "lhfa", "ageMonths", "WHO Growth Reference 2007 (5-19 years)"],
  ["hfa-girls-z-who-2007-exp.xlsx", "Nu", "lhfa", "ageMonths", "WHO Growth Reference 2007 (5-19 years)"],
  ["wfa-boys-z-who-2007-exp.xlsx", "Nam", "wfa", "ageMonths", "WHO Growth Reference 2007 (5-10 years)"],
  ["wfa-girls-z-who-2007-exp.xlsx", "Nu", "wfa", "ageMonths", "WHO Growth Reference 2007 (5-10 years)"],
];

const n = (value) => typeof value === "number" && Number.isFinite(value) ? value : Number.parseFloat(String(value ?? "").trim()) || null;
const pick = (row, name) => row.getCell(name).value;
const entries = [];

for (const [file, sex, indicator, coordinate, source] of files) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(ROOT, file));
  const sheet = workbook.worksheets[0];
  const header = sheet.getRow(1).values.map((value) => String(value ?? "").trim());
  const col = (name) => header.findIndex((value) => value === name);
  const xName = coordinate === "ageMonths" ? "Month" : indicator === "wfl" ? "Length" : "Height";
  for (let index = 2; index <= sheet.rowCount; index += 1) {
    const row = sheet.getRow(index);
    const x = n(row.getCell(col(xName)).value);
    const l = n(row.getCell(col("L")).value);
    const m = n(row.getCell(col("M")).value);
    const s = n(row.getCell(col("S")).value);
    if (x === null || l === null || m === null || s === null) continue;
    entries.push({ sex, indicator, coordinate, x, l, m, s, source, sourceFile: file });
  }
}

entries.sort((a, b) => a.sex.localeCompare(b.sex) || a.indicator.localeCompare(b.indicator) || a.x - b.x);
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), entries }), "utf8");
console.log(`Wrote ${entries.length} WHO growth entries to ${OUT}`);
