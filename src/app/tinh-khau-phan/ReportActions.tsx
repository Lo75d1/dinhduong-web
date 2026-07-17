"use client";

import { useState } from "react";
import { ALL_NUTRIENT_FIELDS, NUTRIENT_GROUPS } from "@/lib/nutrient-fields";
import { aggregateExchangeGroups } from "./exchange-units";
import { loadMedicationRows } from "./medication-row";
import { aggregateIngredients, buildDetailRows, buildReportLines, type FoodReportValues, type ReportLine } from "./ration-detail";
import type { Profile } from "./PersonalProfile";
import { mealOrder, type Row } from "./types";

export type ReportMeta = { subjectName: string; subjectGroup: string; clinicalCourse: string; authorName: string; authorRole: string; authorOrganization: string; reportDate: string; menuNote: string };
const ROLES = ["Bác sĩ", "Dinh dưỡng viên", "Huấn luyện viên / PT", "Phụ huynh / người chăm sóc", "Khác"];
const escapeXml = (value: string | number | null | undefined) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const round = (value: number) => Math.round(value * 100) / 100;
const profileText = (profile: Profile | null) => {
  if (!profile) return "Chưa nhập";
  const pregnancy = profile.physiology.startsWith("pregnant_") ? ` · Thai kỳ: ${profile.pregnancyWeek ? `tuần ${profile.pregnancyWeek}` : "chưa ghi tuần"}${profile.prePregnancyWeight ? ` · trước thai ${profile.prePregnancyWeight} kg` : ""}` : "";
  return `${profile.gender}, ${profile.age || "—"} ${profile.ageUnit}, ${profile.weight || "—"} kg, ${profile.height || "—"} cm${pregnancy}`;
};

type CellStyle = "Cell" | "Header" | "Title" | "MetaLabel" | "Number" | "Food" | "Dish" | "Meal" | "Day" | "Note";
const cell = (value: string | number | null | undefined, style: CellStyle = "Cell") => `<Cell ss:StyleID="${style}"><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`;
const table = (columns: number, body: string) => `<Table>${Array.from({ length: columns }, () => '<Column ss:AutoFitWidth="1"/>').join("")}${body}</Table>`;
const worksheet = (name: string, columns: number, body: string) => `<Worksheet ss:Name="${escapeXml(name)}">${table(columns, body)}</Worksheet>`;

function displayMetric(value: { total: number; incomplete: boolean }) {
  return value.incomplete ? `≥ ${round(value.total)}` : round(value.total);
}

function lineStyle(line: ReportLine): CellStyle {
  if (line.kind === "day") return "Day";
  if (line.kind === "meal") return "Meal";
  if (line.kind === "dish") return "Dish";
  return "Food";
}

function valueForRaw(row: Row, key: string, reportValues: FoodReportValues) {
  const snapshot = row.nutrients[key];
  return typeof snapshot === "number" ? snapshot : reportValues[row.foodId]?.values[key] ?? null;
}

const TIMING_LABEL: Record<string, string> = { kem: "Uống kèm bữa ăn", "khong-kem": "Uống không kèm bữa ăn", "": "Không rõ" };

// Đọc trực tiếp từ localStorage vì thuốc/TPBS lưu tách hoàn toàn khỏi `rows`
// (không tính vào dinh dưỡng) — xem medication-row.ts.
function loadMedicationLinesForExport() {
  return loadMedicationRows()
    .flatMap((med) => med.meals.map((meal) => ({ meal, name: med.name, timing: TIMING_LABEL[med.timing], note: med.note })))
    .sort((a, b) => mealOrder(a.meal) - mealOrder(b.meal));
}

function buildExcelXml(rows: Row[], profile: Profile | null, meta: ReportMeta, reportValues: FoodReportValues) {
  const foods = rows.filter((row) => row.foodId);
  const lines = buildReportLines(rows, ALL_NUTRIENT_FIELDS, reportValues);
  const day = lines.find((line) => line.kind === "day");
  const detailRows = buildDetailRows(rows);
  const warehouse = aggregateIngredients(detailRows);
  const exchanges = aggregateExchangeGroups(rows);
  const metadata = [
    ["Người được đánh giá", meta.subjectName || "Chưa ghi"],
    ["Nhóm / mục tiêu", meta.subjectGroup || "Chưa ghi"],
    ["Hồ sơ", profileText(profile)],
    ["Ghi chú thực đơn / khẩu phần", meta.menuNote || "Chưa ghi"],
    ["Diễn biến bệnh lý / theo dõi", meta.clinicalCourse || "Chưa ghi"],
    ["Ngày lập", meta.reportDate || "Chưa ghi"],
    ["Người lập", `${meta.authorName || "Chưa ghi"}${meta.authorRole ? ` (${meta.authorRole})` : ""}`],
    ["Đơn vị / cơ sở", meta.authorOrganization || "Chưa ghi"],
  ];
  const infoSheet = worksheet("Thông tin phiếu", 8, [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="7"><Data ss:Type="String">PHIẾU ĐÁNH GIÁ DINH DƯỠNG</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="7"><Data ss:Type="String">Báo cáo Excel đầy đủ: tổng hợp tất cả chất, chi tiết khẩu phần, quy đổi xuất kho và dữ liệu gốc /100 g.</Data></Cell></Row>',
    ...metadata.map(([label, value]) => `<Row>${cell(label, "MetaLabel")}<Cell ss:MergeAcross="6"><Data ss:Type="String">${escapeXml(value)}</Data></Cell></Row>`),
    '<Row/>',
    `<Row>${["Nhóm chất", "Chất dinh dưỡng", "Đơn vị", "Tổng khẩu phần", "Trạng thái"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...NUTRIENT_GROUPS.flatMap((group) => group.fields.map((field) => {
      const metric = day?.values[field.key] ?? { total: 0, incomplete: true };
      return `<Row>${cell(group.title)}${cell(field.label)}${cell(field.unit)}${cell(displayMetric(metric), typeof displayMetric(metric) === "number" ? "Number" : "Cell")}${cell(metric.incomplete ? "Tổng tối thiểu: có thực phẩm thiếu số liệu" : "Đủ dữ liệu")}</Row>`;
    })),
  ].join(""));

  const nutrientHeaders = ALL_NUTRIENT_FIELDS.map((field) => `${field.label} (${field.unit})`);
  const detailSheet = worksheet("Chi tiết khẩu phần", 6 + ALL_NUTRIENT_FIELDS.length, [
    '<Row ss:Height="26"><Cell ss:StyleID="Title" ss:MergeAcross="5"><Data ss:Type="String">DINH DƯỠNG KHẨU PHẦN CHI TIẾT</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="5"><Data ss:Type="String">Dòng vàng: tổng món; xanh nhạt: tổng bữa; xanh đậm: tổng cả ngày. Dấu ≥ là tổng tối thiểu vì một số thực phẩm chưa có số liệu chất đó.</Data></Cell></Row>',
    `<Row>${["Loại dòng", "Bữa", "Món", "Thực phẩm", "g ăn được", "g sống / xuất kho", ...nutrientHeaders].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...lines.map((line) => {
      const style = lineStyle(line);
      return `<Row>${cell(line.kind === "food" ? "Thực phẩm" : line.kind === "dish" ? "Tổng món" : line.kind === "meal" ? "Tổng bữa" : "Tổng ngày", style)}${cell(line.meal, style)}${cell(line.dish, style)}${cell(line.foodName, style)}${cell(round(line.edibleGrams), style)}${cell(line.rawGrams === null ? "—" : round(line.rawGrams), style)}${ALL_NUTRIENT_FIELDS.map((field) => cell(displayMetric(line.values[field.key]), typeof displayMetric(line.values[field.key]) === "number" ? style === "Food" ? "Number" : style : style)).join("")}</Row>`;
    }),
  ].join(""));

  const warehouseSheet = worksheet("Quy đổi xuất kho", 5, [
    '<Row ss:Height="26"><Cell ss:StyleID="Title" ss:MergeAcross="4"><Data ss:Type="String">QUY ĐỔI THỰC PHẨM SỐNG / XUẤT KHO</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="4"><Data ss:Type="String">Khối lượng sống được quy đổi từ phần ăn được theo tỷ lệ thải bỏ hiện có trong dữ liệu.</Data></Cell></Row>',
    `<Row>${["Thực phẩm", "g ăn được", "Tỷ lệ thải bỏ", "g sống / xuất kho", "Ghi chú"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...warehouse.map((item) => `<Row>${cell(item.foodName)}${cell(round(item.edibleGrams), "Number")}${cell(item.wastePercent === null ? "Chưa có" : `${round(item.wastePercent)}%`)}${cell(item.rawGrams === null ? "—" : round(item.rawGrams), item.rawGrams === null ? "Cell" : "Number")}${cell(item.hasMissingRawAmount ? "Chưa thể quy đổi hoàn chỉnh" : "Đủ dữ liệu quy đổi")}</Row>`),
  ].join(""));

  const exchangeSheet = worksheet("Quy đổi đơn vị ăn", 7, [
    '<Row ss:Height="26"><Cell ss:StyleID="Title" ss:MergeAcross="6"><Data ss:Type="String">QUY ĐỔI ĐƠN VỊ ĂN / NHÓM THỰC PHẨM</Data></Cell></Row>',
    `<Row>${["Nhóm thực phẩm", "g ăn được", "Năng lượng (kcal)", "Đạm (g)", "Béo (g)", "Đường bột (g)", "Đơn vị ăn"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...exchanges.map((item) => `<Row>${cell(item.group)}${cell(round(item.grams), "Number")}${cell(round(item.kcal), "Number")}${cell(round(item.protein), "Number")}${cell(round(item.lipid), "Number")}${cell(round(item.glucid), "Number")}${cell(item.units === null ? item.rule.unitText : `${round(item.units)} ĐV — ${item.rule.unitText}`)}</Row>`),
  ].join(""));

  const rawSheet = worksheet("Dữ liệu gốc 100g", 6 + ALL_NUTRIENT_FIELDS.length, [
    '<Row ss:Height="26"><Cell ss:StyleID="Title" ss:MergeAcross="5"><Data ss:Type="String">DỮ LIỆU GỐC THỰC PHẨM /100 G</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="5"><Data ss:Type="String">Dùng để kiểm tra phép tính: giá trị khẩu phần = dữ liệu /100 g × khối lượng ăn được /100.</Data></Cell></Row>',
    `<Row>${["Bữa", "Món", "Thực phẩm", "g ăn được", "Nguồn dữ liệu", "Ghi chú", ...nutrientHeaders].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...foods.map((row) => `<Row>${cell(row.meal)}${cell(row.dish)}${cell(row.foodName)}${cell(round(row.grams), "Number")}${cell(reportValues[row.foodId]?.source || "Bản chụp lúc nhập / chưa truy xuất")}${cell(row.note)}${ALL_NUTRIENT_FIELDS.map((field) => { const value = valueForRaw(row, field.key, reportValues); return cell(value === null ? "—" : round(value), value === null ? "Cell" : "Number"); }).join("")}</Row>`),
  ].join(""));

  const medicationLines = loadMedicationLinesForExport();
  const medicationSheet = medicationLines.length ? worksheet("Thuốc TPBS theo bữa", 4, [
    '<Row ss:Height="26"><Cell ss:StyleID="Title" ss:MergeAcross="3"><Data ss:Type="String">THUỐC / TPBS THEO BỮA ĂN</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="3"><Data ss:Type="String">Chỉ để tham khảo lịch uống theo bữa — không tính vào dinh dưỡng khẩu phần.</Data></Cell></Row>',
    `<Row>${["Bữa", "Thuốc / TPBS", "Thời điểm uống", "Ghi chú"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...medicationLines.map((line) => `<Row>${cell(line.meal)}${cell(line.name)}${cell(line.timing)}${cell(line.note)}</Row>`),
  ].join("")) : "";

  const notesSheet = worksheet("Căn cứ và ghi chú", 3, [
    '<Row ss:Height="26"><Cell ss:StyleID="Title" ss:MergeAcross="2"><Data ss:Type="String">CĂN CỨ VÀ LƯU Ý ĐỌC BÁO CÁO</Data></Cell></Row>',
    `<Row>${["Nội dung", "Chi tiết", "Ghi chú"].map((value) => cell(value, "Header")).join("")}</Row>`,
    `<Row>${cell("Nguồn thành phần thực phẩm")}${cell("Bảng thành phần thực phẩm Việt Nam – Viện Dinh dưỡng; các nguồn dữ liệu được ghi tại sheet Dữ liệu gốc /100g.")}${cell("Số liệu thiếu không tự quy về 0.")}</Row>`,
    `<Row>${cell("Khuyến nghị")}${cell("Khuyến nghị dinh dưỡng theo tuổi, giới, sinh lý và mức hoạt động; căn cứ được hiển thị trên ứng dụng.")}${cell("Chỉ đối chiếu khi có đủ hồ sơ và ngưỡng phù hợp.")}</Row>`,
    `<Row>${cell("Quy đổi xuất kho")}${cell("Khối lượng sống = phần ăn được quy đổi theo tỷ lệ thải bỏ.")}${cell("Nếu thiếu tỷ lệ thải bỏ, ô g sống để trống.")}</Row>`,
    `<Row>${cell("Dấu ≥")}${cell("Tổng tối thiểu do ít nhất một thực phẩm chưa có số liệu cho chất tương ứng.")}${cell("Không diễn giải là bằng 0.")}</Row>`,
  ].join(""));

  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B7C3BE"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6DED9"/></Borders><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16" ss:Color="#123C36"/><Alignment ss:Vertical="Center"/></Style><Style ss:ID="MetaLabel"><Font ss:Bold="1"/><Interior ss:Color="#E8EFEB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B7C3BE"/></Borders></Style><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DCE7E1" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#7F948D"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#7F948D"/></Borders><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="Number" ss:Parent="Cell"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="0.00"/></Style><Style ss:ID="Food" ss:Parent="Cell"/><Style ss:ID="Dish" ss:Parent="Cell"><Font ss:Bold="1"/><Interior ss:Color="#FFF7DB" ss:Pattern="Solid"/></Style><Style ss:ID="Meal" ss:Parent="Cell"><Font ss:Bold="1"/><Interior ss:Color="#E4F3FB" ss:Pattern="Solid"/></Style><Style ss:ID="Day" ss:Parent="Cell"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0E5E93" ss:Pattern="Solid"/></Style><Style ss:ID="Note" ss:Parent="Cell"><Font ss:Italic="1" ss:Color="#2E4A43"/><Alignment ss:WrapText="1"/></Style></Styles>${infoSheet}${detailSheet}${warehouseSheet}${exchangeSheet}${rawSheet}${medicationSheet}${notesSheet}</Workbook>`;
}

async function loadReportValues(rows: Row[]): Promise<FoodReportValues> {
  const ids = [...new Set(rows.filter((row) => row.foodId).map((row) => row.foodId))];
  if (!ids.length) return {};
  const response = await fetch("/api/foods/report-nutrients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, fields: ALL_NUTRIENT_FIELDS.map((field) => field.key) }) });
  if (!response.ok) throw new Error("Không tải được dữ liệu dinh dưỡng đầy đủ.");
  const data = await response.json() as { items?: Array<Record<string, unknown>> };
  const values: FoodReportValues = {};
  for (const item of data.items ?? []) {
    const id = typeof item.id === "string" ? item.id : "";
    if (!id) continue;
    values[id] = {
      source: typeof item.source === "string" && item.source.trim() ? item.source : "Chưa ghi nguồn",
      values: Object.fromEntries(ALL_NUTRIENT_FIELDS.map((field) => [field.key, typeof item[field.key] === "number" ? item[field.key] : null])) as Record<string, number | null>,
    };
  }
  return values;
}

export default function ReportActions({ rows, profile, meta, onMetaChange }: { rows: Row[]; profile: Profile | null; meta: ReportMeta; onMetaChange: (next: ReportMeta) => void }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const update = (key: keyof ReportMeta, value: string) => onMetaChange({ ...meta, [key]: value });
  const downloadExcel = async () => {
    setExporting(true);
    setExportError("");
    try {
      const values = await loadReportValues(rows);
      const url = URL.createObjectURL(new Blob([buildExcelXml(rows, profile, meta, values)], { type: "application/vnd.ms-excel;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "bao-cao-dinh-duong-day-du.xls";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Chưa tải được dữ liệu đầy đủ để xuất Excel. Hãy kiểm tra kết nối rồi thử lại.");
    } finally {
      setExporting(false);
    }
  };
  return <div data-no-print className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setOpen(true)} className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36] hover:bg-emerald-50">Thiết lập / In PDF</button><button type="button" disabled={exporting} onClick={downloadExcel} className="rounded-md bg-[#123c36] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:bg-[#56736c]">{exporting ? "Đang tạo Excel đầy đủ…" : "Xuất Excel đầy đủ"}</button>{exportError && <p className="basis-full text-right text-xs font-medium text-red-700">{exportError}</p>}{open && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><div className="mx-auto my-6 w-full max-w-2xl rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-neutral-950">Thiết lập phiếu đánh giá</h2><button type="button" onClick={() => setOpen(false)} className="text-xl text-neutral-900" aria-label="Đóng">×</button></div><p className="mt-1 text-sm text-neutral-800">Dùng được cho khám dinh dưỡng, tư vấn ăn uống, theo dõi tập luyện hoặc chăm sóc trẻ.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-neutral-900">Người được đánh giá<input value={meta.subjectName} onChange={(event) => update("subjectName", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900">Nhóm / mục tiêu<input value={meta.subjectGroup} onChange={(event) => update("subjectGroup", event.target.value)} placeholder="VD: trẻ em, tập tăng cơ..." className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900 sm:col-span-2">Diễn biến bệnh lý / ghi chú theo dõi<textarea value={meta.clinicalCourse} onChange={(event) => update("clinicalCourse", event.target.value)} placeholder="VD: đái tháo đường type 2, kiểm soát đường huyết; hoặc mục tiêu giảm mỡ..." rows={3} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><div className="sm:col-span-2 border-t-2 border-[#7f948d] pt-3"><p className="text-sm font-semibold text-neutral-950">Thông tin người lập</p></div><label className="text-sm font-semibold text-neutral-900">Họ tên người lập<input value={meta.authorName} onChange={(event) => update("authorName", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900">Vai trò<select value={meta.authorRole} onChange={(event) => update("authorRole", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal">{ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></label><label className="text-sm font-semibold text-neutral-900 sm:col-span-2">Đơn vị / cơ sở / phòng tập<input value={meta.authorOrganization} onChange={(event) => update("authorOrganization", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-900 sm:col-span-2">Ngày lập<input type="date" value={meta.reportDate} onChange={(event) => update("reportDate", event.target.value)} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 font-normal" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-400 px-4 py-2 font-semibold text-neutral-900">Đóng</button><button type="button" onClick={() => { setOpen(false); window.print(); }} className="rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Mở bản in A4</button></div></div></div>}</div>;
}
