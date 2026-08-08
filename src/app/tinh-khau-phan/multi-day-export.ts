import type { Profile } from "./PersonalProfile";
import { dayMealsOrdered, type MenuDay } from "./multi-day";
import type { PeriodAnalysis, ShoppingItem } from "./multi-day-analysis";

const round = (value: number) => Math.round(value * 100) / 100;
const escapeXml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const statusLabel = (status: string) => status === "dat" ? "Đạt" : status === "thieu" ? "Thiếu" : status === "vuot" ? "Vượt" : "—";
const numberOrBlank = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "" : round(value);
const numberOrDash = (value: number | null | undefined) => {
  const result = numberOrBlank(value);
  return result === "" ? "—" : result;
};
const percentOrDash = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : `${round(value)}%`;

function nutrientValue(row: MenuDay["rows"][number], key: string) {
  const value = row.nutrients?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value * (row.grams || 0) / 100 : null;
}

function rawGrams(row: MenuDay["rows"][number]) {
  const waste = row.wastePercent;
  return typeof waste === "number" && waste >= 0 && waste < 100 ? (row.grams || 0) / (1 - waste / 100) : null;
}

function profileLabel(profile: Profile | null) {
  if (!profile) return "Chưa nhập hồ sơ";
  return `${profile.gender}, ${profile.age || "—"} ${profile.ageUnit === "thang" ? "tháng" : "tuổi"}, ${profile.weight || "—"} kg, ${profile.height || "—"} cm`;
}

function periodLabel(analysis: PeriodAnalysis) {
  return analysis.calendarDayCount === 7 ? "TỔNG CẢ TUẦN" : `TỔNG ${analysis.calendarDayCount} NGÀY`;
}

type CellStyle = "Cell" | "Header" | "Title" | "Day" | "Meal" | "Number" | "Note" | "Good" | "Warn";
const cell = (value: unknown, style: CellStyle = "Cell") => {
  const numeric = typeof value === "number" && Number.isFinite(value);
  return `<Cell ss:StyleID="${style}"><Data ss:Type="${numeric ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`;
};
const worksheet = (name: string, columns: number, rows: string) => `<Worksheet ss:Name="${escapeXml(name)}"><Table>${Array.from({ length: columns }, () => '<Column ss:AutoFitWidth="1"/>').join("")}${rows}</Table></Worksheet>`;

export function buildMultiDayExcelXml(
  days: MenuDay[],
  analysis: PeriodAnalysis,
  shopping: ShoppingItem[],
  profile: Profile | null,
) {
  const overviewRows = [
    `<Row ss:Height="30"><Cell ss:StyleID="Title" ss:MergeAcross="5"><Data ss:Type="String">BÁO CÁO DINH DƯỠNG · ${periodLabel(analysis)}</Data></Cell></Row>`,
    `<Row>${cell("Hồ sơ", "Header")}${cell(profileLabel(profile))}${cell("Ngày có dữ liệu", "Header")}${cell(`${analysis.dataDayCount}/${analysis.calendarDayCount}`)}${cell("Nguồn nhu cầu", "Header")}${cell(analysis.target.source ?? "—")}</Row>`,
    `<Row>${cell("Năng lượng toàn kỳ", "Header")}${cell(numberOrBlank(analysis.totalEnergy.value), analysis.totalEnergy.value == null ? "Cell" : "Number")}${cell("Nhu cầu toàn kỳ", "Header")}${cell(numberOrBlank(analysis.targetPeriodKcal), analysis.targetPeriodKcal == null ? "Cell" : "Number")}${cell("Chênh lệch", "Header")}${cell(numberOrBlank(analysis.periodGapKcal), analysis.periodGapKcal == null ? "Cell" : "Number")}</Row>`,
    `<Row>${cell("Trung bình/ngày", "Header")}${cell(numberOrBlank(analysis.averageEnergyKcal))}${cell("Chênh lệch TB/ngày", "Header")}${cell(numberOrBlank(analysis.averageGapKcal))}${cell("Đánh giá toàn kỳ", "Header")}${cell(statusLabel(analysis.periodEnergyStatus), analysis.periodEnergyStatus === "dat" ? "Good" : "Warn")}</Row>`,
    `<Row>${cell("Ngày đạt", "Header")}${cell(analysis.achievedDays)}${cell("Ngày thiếu", "Header")}${cell(analysis.lowDays)}${cell("Ngày vượt", "Header")}${cell(analysis.highDays)}</Row>`,
    `<Row>${cell("Món khác nhau", "Header")}${cell(analysis.uniqueDishCount)}${cell("Thực phẩm khác nhau", "Header")}${cell(analysis.uniqueFoodCount)}${cell("Nhóm TP trung bình/ngày", "Header")}${cell(numberOrBlank(analysis.averageFoodGroups))}</Row>`,
    '<Row/>',
    `<Row>${["Chỉ tiêu", "Tổng kỳ", "TB/ngày", "Tỷ lệ năng lượng", "Khuyến nghị", "Đánh giá"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.macros.map((macro) => `<Row>${cell(macro.label)}${cell(numberOrBlank(macro.grams.value), macro.grams.value == null ? "Cell" : "Number")}${cell(numberOrBlank(macro.averageGramsPerDay))}${cell(numberOrBlank(macro.energySharePct))}${cell(macro.recommendedMinPct == null || macro.recommendedMaxPct == null ? "—" : `${round(macro.recommendedMinPct)}–${round(macro.recommendedMaxPct)}% NL`)}${cell(statusLabel(macro.status), macro.status === "dat" ? "Good" : "Warn")}</Row>`),
  ].join("");

  const dayRows = [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="12"><Data ss:Type="String">PHÂN TÍCH THEO NGÀY</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="12"><Data ss:Type="String">Ngày trống không bị tính là 0. Ô trống là dữ liệu nguồn chưa đủ.</Data></Cell></Row>',
    `<Row>${["Ngày", "Ngày lịch", "Kcal", "Mục tiêu", "Chênh lệch", "% nhu cầu", "Đạm (g)", "Béo (g)", "Bột đường (g)", "Chất xơ (g)", "Natri (mg)", "Số món", "Đánh giá"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.days.map((day) => `<Row>${cell(day.label, "Day")}${cell(day.date, "Day")}${cell(numberOrBlank(day.energy.value), "Day")}${cell(numberOrBlank(day.targetKcal), "Day")}${cell(numberOrBlank(day.gapKcal), "Day")}${cell(day.energy.value != null && day.targetKcal ? round(day.energy.value / day.targetKcal * 100) : "", "Day")}${cell(numberOrBlank(day.nutrients.proteinG?.value), "Day")}${cell(numberOrBlank(day.nutrients.lipidG?.value), "Day")}${cell(numberOrBlank(day.nutrients.glucidG?.value), "Day")}${cell(numberOrBlank(day.nutrients.fiberG?.value), "Day")}${cell(numberOrBlank(day.nutrients.sodiumMg?.value), "Day")}${cell(day.dishCount, "Day")}${cell(statusLabel(day.status), "Day")}</Row>`),
    `<Row>${cell(periodLabel(analysis), "Header")}${cell("")}${cell(numberOrBlank(analysis.totalEnergy.value), "Header")}${cell(numberOrBlank(analysis.targetPeriodKcal), "Header")}${cell(numberOrBlank(analysis.periodGapKcal), "Header")}${cell(analysis.totalEnergy.value != null && analysis.targetPeriodKcal ? round(analysis.totalEnergy.value / analysis.targetPeriodKcal * 100) : "", "Header")}${analysis.macros.map((macro) => cell(numberOrBlank(macro.grams.value), "Header")).join("")}${cell("")}${cell("")}${cell(analysis.uniqueDishCount, "Header")}${cell(statusLabel(analysis.periodEnergyStatus), "Header")}</Row>`,
  ].join("");

  const mealRows = [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="10"><Data ss:Type="String">PHÂN BỔ THEO BỮA</Data></Cell></Row>',
    `<Row>${["Bữa", "Ngày có bữa", "Tổng kcal", "TB/ngày", "% toàn kỳ", "% mục tiêu", "Mục tiêu kỳ", "Chênh lệch", "P (g)", "L (g)", "G (g)"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.mealAggregates.map((meal) => `<Row>${cell(meal.meal, "Meal")}${cell(meal.daysPresent)}${cell(numberOrBlank(meal.energy.value))}${cell(numberOrBlank(meal.averageEnergyPerDataDay))}${cell(numberOrBlank(meal.distributionPct))}${cell(numberOrBlank(meal.targetSharePct))}${cell(numberOrBlank(meal.targetPeriodKcal))}${cell(numberOrBlank(meal.gapKcal))}${cell(numberOrBlank(meal.protein.value))}${cell(numberOrBlank(meal.lipid.value))}${cell(numberOrBlank(meal.glucid.value))}</Row>`),
    '<Row/>',
    `<Row>${["Ngày", "Bữa", "Kcal", "Mục tiêu", "Chênh lệch", "P (g)", "L (g)", "G (g)", "Đánh giá", "", ""].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.days.flatMap((day) => day.meals.map((meal) => `<Row>${cell(day.label)}${cell(meal.meal)}${cell(numberOrBlank(meal.energy.value))}${cell(numberOrBlank(meal.targetKcal))}${cell(meal.energy.value != null && meal.targetKcal != null ? round(meal.energy.value - meal.targetKcal) : "")}${cell(numberOrBlank(meal.nutrients.proteinG?.value))}${cell(numberOrBlank(meal.nutrients.lipidG?.value))}${cell(numberOrBlank(meal.nutrients.glucidG?.value))}${cell(statusLabel(meal.status))}${cell("")}${cell("")}</Row>`)),
  ].join("");

  const dishRows = [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="9"><Data ss:Type="String">PHÂN TÍCH THEO MÓN</Data></Cell></Row>',
    `<Row>${["Món", "Lần xuất hiện", "Số thực phẩm", "Ngày", "Bữa", "Kcal", "% toàn kỳ", "P (g)", "L (g)", "G (g)", "Natri (mg)"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.dishes.map((dish) => `<Row>${cell(dish.dish, "Meal")}${cell(dish.appearances)}${cell(dish.foodCount)}${cell(dish.days.join(", "))}${cell(dish.meals.join(", "))}${cell(numberOrBlank(dish.energy.value))}${cell(dish.energy.value != null && analysis.totalEnergy.value ? round(dish.energy.value / analysis.totalEnergy.value * 100) : "")}${cell(numberOrBlank(dish.protein.value))}${cell(numberOrBlank(dish.lipid.value))}${cell(numberOrBlank(dish.glucid.value))}${cell(numberOrBlank(dish.sodium.value))}</Row>`),
  ].join("");

  const nutrientRows = [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="9"><Data ss:Type="String">VI CHẤT VÀ KHOÁNG CHẤT TOÀN KỲ</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="9"><Data ss:Type="String">Natri được đối chiếu như giới hạn trên; các chất còn lại là mức đáp ứng. Ô trống không được quy thành 0.</Data></Cell></Row>',
    `<Row>${["Chất", "Đơn vị", "Tổng kỳ", "TB/ngày", "Khuyến nghị/ngày", "Nhu cầu kỳ", "% đáp ứng", "Ngày đạt", "Ngày so sánh", "Đánh giá"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.nutrients.map((item) => `<Row>${cell(item.label)}${cell(item.unit)}${cell(numberOrBlank(item.total.value))}${cell(numberOrBlank(item.averagePerDay))}${cell(numberOrBlank(item.targetPerDay))}${cell(numberOrBlank(item.targetPeriod))}${cell(numberOrBlank(item.percentOfTarget))}${cell(item.achievedDays)}${cell(item.comparableDays)}${cell(statusLabel(item.status), item.status === "dat" ? "Good" : item.status === "unknown" ? "Cell" : "Warn")}</Row>`),
    '<Row/>',
    `<Row>${["Nhóm thực phẩm", "Khối lượng (g)", "Kcal", "% năng lượng", "Dùng trong ngày", "", "", "", "", ""].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.foodGroups.map((group) => `<Row>${cell(group.group)}${cell(round(group.edibleGrams))}${cell(numberOrBlank(group.energy.value))}${cell(numberOrBlank(group.energySharePct))}${cell(group.days.join(", "))}${cell("")}${cell("")}${cell("")}${cell("")}${cell("")}</Row>`),
  ].join("");

  const detailRows = [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="17"><Data ss:Type="String">CHI TIẾT THỰC ĐƠN TOÀN KỲ</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="17"><Data ss:Type="String">Khối lượng và thành phần được giữ ở cấu trúc Ngày → Bữa → Món → Thực phẩm.</Data></Cell></Row>',
    `<Row>${["Ngày", "Ngày lịch", "Bữa", "Món", "Thực phẩm", "Sống sạch (g)", "Mua/kho (g)", "Thải bỏ (%)", "Kcal", "Protein (g)", "Lipid (g)", "Glucid (g)", "Xơ (g)", "Canxi (mg)", "Sắt (mg)", "Natri (mg)", "Nhóm thực phẩm", "Ghi chú"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...days.flatMap((day) => dayMealsOrdered(day).flatMap((meal) => meal.dishes.flatMap((dish) => dish.rows.map((row) => `<Row>${cell(day.label)}${cell(day.date)}${cell(meal.meal)}${cell(dish.dish)}${cell(row.foodName)}${cell(round(row.grams || 0), "Number")}${cell(numberOrBlank(rawGrams(row)))}${cell(numberOrBlank(row.wastePercent))}${cell(numberOrBlank(nutrientValue(row, "energyKcal")))}${cell(numberOrBlank(nutrientValue(row, "proteinG")))}${cell(numberOrBlank(nutrientValue(row, "lipidG")))}${cell(numberOrBlank(nutrientValue(row, "glucidG")))}${cell(numberOrBlank(nutrientValue(row, "fiberG")))}${cell(numberOrBlank(nutrientValue(row, "calciumMg")))}${cell(numberOrBlank(nutrientValue(row, "ironMg")))}${cell(numberOrBlank(nutrientValue(row, "sodiumMg")))}${cell(row.classify?.foodGroup || "")}${cell(row.note)}</Row>`)))),
  ].join("");

  const recommendationRows = [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="2"><Data ss:Type="String">KHUYẾN NGHỊ TOÀN KỲ</Data></Cell></Row>',
    `<Row>${["Mức", "Nội dung", "Diễn giải"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...analysis.recommendations.map((item) => `<Row>${cell(item.tone === "good" ? "Đang tốt" : item.tone === "attention" ? "Cần chú ý" : item.tone === "adjust" ? "Nên điều chỉnh" : "Dữ liệu", item.tone === "good" ? "Good" : item.tone === "data" ? "Cell" : "Warn")}${cell(item.title)}${cell(item.text)}</Row>`),
  ].join("");

  const shoppingRows = [
    '<Row ss:Height="28"><Cell ss:StyleID="Title" ss:MergeAcross="5"><Data ss:Type="String">BẢNG ĐI CHỢ GỘP TOÀN KỲ</Data></Cell></Row>',
    '<Row><Cell ss:StyleID="Note" ss:MergeAcross="5"><Data ss:Type="String">Thiếu tỷ lệ thải bỏ thì lượng mua/kho để trống, không quy đổi 1:1.</Data></Cell></Row>',
    `<Row>${["Thực phẩm", "Sống sạch (g)", "Mua/kho (g)", "Thải bỏ (%)", "Dùng trong ngày", "Ghi chú"].map((value) => cell(value, "Header")).join("")}</Row>`,
    ...shopping.map((item) => `<Row>${cell(item.foodName)}${cell(round(item.edibleGrams), "Number")}${cell(numberOrBlank(item.rawGrams))}${cell(numberOrBlank(item.wastePercent))}${cell(item.days.join(", "))}${cell(item.rawGrams == null ? "Thiếu tỷ lệ thải bỏ" : "Đủ dữ liệu quy đổi")}</Row>`),
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C9D8E8"/></Borders><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="Header" ss:Parent="Cell"><Font ss:Bold="1" ss:Color="#123C36"/><Interior ss:Color="#E2F0EB" ss:Pattern="Solid"/></Style><Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16" ss:Color="#123C36"/></Style><Style ss:ID="Day" ss:Parent="Cell"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#176B57" ss:Pattern="Solid"/></Style><Style ss:ID="Meal" ss:Parent="Cell"><Font ss:Bold="1"/><Interior ss:Color="#F4F9F7" ss:Pattern="Solid"/></Style><Style ss:ID="Number" ss:Parent="Cell"><NumberFormat ss:Format="0.00"/><Alignment ss:Horizontal="Right"/></Style><Style ss:ID="Note" ss:Parent="Cell"><Font ss:Italic="1" ss:Color="#445E7A"/></Style><Style ss:ID="Good" ss:Parent="Cell"><Font ss:Bold="1" ss:Color="#047857"/><Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/></Style><Style ss:ID="Warn" ss:Parent="Cell"><Font ss:Bold="1" ss:Color="#9F1239"/><Interior ss:Color="#FFF1F2" ss:Pattern="Solid"/></Style></Styles>${worksheet("Tổng quan kỳ", 6, overviewRows)}${worksheet("Theo ngày", 13, dayRows)}${worksheet("Theo bữa", 11, mealRows)}${worksheet("Theo món", 11, dishRows)}${worksheet("Vi chất - nhóm TP", 10, nutrientRows)}${worksheet("Chi tiết thực đơn", 18, detailRows)}${worksheet("Khuyến nghị", 3, recommendationRows)}${worksheet("Đi chợ gộp", 6, shoppingRows)}</Workbook>`;
}

export function buildMultiDayWordHtml(
  days: MenuDay[],
  analysis: PeriodAnalysis,
  shopping: ShoppingItem[],
  profile: Profile | null,
) {
  const macroRows = analysis.macros.map((item) => `<tr><td>${escapeXml(item.label)}</td><td>${numberOrDash(item.grams.value)} g</td><td>${numberOrDash(item.averageGramsPerDay)} g</td><td>${percentOrDash(item.energySharePct)}</td><td>${item.recommendedMinPct == null ? "—" : `${round(item.recommendedMinPct)}–${round(item.recommendedMaxPct ?? item.recommendedMinPct)}%`}</td><td>${statusLabel(item.status)}</td></tr>`).join("");
  const dayRows = analysis.days.map((day) => `<tr><td>${escapeXml(day.label)}${day.date ? ` · ${escapeXml(day.date)}` : ""}</td><td>${numberOrDash(day.energy.value)}</td><td>${numberOrDash(day.targetKcal)}</td><td>${numberOrDash(day.gapKcal)}</td><td>${numberOrDash(day.nutrients.proteinG?.value)}</td><td>${numberOrDash(day.nutrients.lipidG?.value)}</td><td>${numberOrDash(day.nutrients.glucidG?.value)}</td><td>${statusLabel(day.status)}</td></tr>`).join("");
  const mealRows = analysis.mealAggregates.map((meal) => `<tr><td>${escapeXml(meal.meal)}</td><td>${meal.daysPresent}/${analysis.dataDayCount}</td><td>${numberOrDash(meal.energy.value)}</td><td>${percentOrDash(meal.distributionPct)}</td><td>${percentOrDash(meal.targetSharePct)}</td><td>${numberOrDash(meal.gapKcal)}</td><td>${numberOrDash(meal.protein.value)}</td><td>${numberOrDash(meal.lipid.value)}</td><td>${numberOrDash(meal.glucid.value)}</td></tr>`).join("");
  const dishRows = analysis.dishes.map((dish) => `<tr><td>${escapeXml(dish.dish)}</td><td>${dish.appearances}</td><td>${escapeXml(dish.days.join(", "))}</td><td>${numberOrDash(dish.energy.value)}</td><td>${numberOrDash(dish.protein.value)}</td><td>${numberOrDash(dish.lipid.value)}</td><td>${numberOrDash(dish.glucid.value)}</td><td>${numberOrDash(dish.sodium.value)}</td></tr>`).join("");
  const nutrientRows = analysis.nutrients.map((item) => `<tr><td>${escapeXml(item.label)}</td><td>${numberOrDash(item.total.value)} ${escapeXml(item.unit)}</td><td>${numberOrDash(item.averagePerDay)}</td><td>${numberOrDash(item.targetPerDay)}</td><td>${percentOrDash(item.percentOfTarget)}</td><td>${item.comparableDays ? `${item.achievedDays}/${item.comparableDays}` : "—"}</td><td>${statusLabel(item.status)}</td></tr>`).join("");
  const recommendations = analysis.recommendations.map((item) => `<div class="recommendation"><b>${escapeXml(item.title)}</b><br>${escapeXml(item.text)}</div>`).join("");
  const daySections = days.map((day) => {
    const dayAnalysis = analysis.days.find((item) => item.dayId === day.id)!;
    const meals = dayMealsOrdered(day).map((meal) => `<h3>${escapeXml(meal.meal)}</h3>${meal.dishes.map((dish) => `<h4>${escapeXml(dish.dish)}</h4><table><thead><tr><th>Thực phẩm</th><th>Sống sạch (g)</th><th>Mua/kho (g)</th><th>Kcal</th><th>P</th><th>L</th><th>G</th><th>Xơ</th><th>Natri</th></tr></thead><tbody>${dish.rows.map((row) => `<tr><td>${escapeXml(row.foodName)}</td><td>${round(row.grams || 0)}</td><td>${numberOrDash(rawGrams(row))}</td><td>${numberOrDash(nutrientValue(row, "energyKcal"))}</td><td>${numberOrDash(nutrientValue(row, "proteinG"))}</td><td>${numberOrDash(nutrientValue(row, "lipidG"))}</td><td>${numberOrDash(nutrientValue(row, "glucidG"))}</td><td>${numberOrDash(nutrientValue(row, "fiberG"))}</td><td>${numberOrDash(nutrientValue(row, "sodiumMg"))}</td></tr>`).join("")}</tbody></table>`).join("")}`).join("");
    return `<section><h2>${escapeXml(day.label)}${day.date ? ` · ${escapeXml(day.date)}` : ""}</h2><p><b>Tổng năng lượng:</b> ${dayAnalysis.energy.value == null ? "—" : `${round(dayAnalysis.energy.value)} kcal`} · <b>Chênh lệch:</b> ${dayAnalysis.gapKcal == null ? "—" : `${round(dayAnalysis.gapKcal)} kcal`} · <b>Đối chiếu:</b> ${statusLabel(dayAnalysis.status)} · <b>Nhóm TP:</b> ${dayAnalysis.foodGroupCount ?? "—"}</p>${meals}</section>`;
  }).join("");
  const shoppingRows = shopping.map((item) => `<tr><td>${escapeXml(item.foodName)}</td><td>${round(item.edibleGrams)}</td><td>${item.rawGrams == null ? "—" : round(item.rawGrams)}</td><td>${item.wastePercent == null ? "—" : `${round(item.wastePercent)}%`}</td><td>${escapeXml(item.days.join(", "))}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Báo cáo dinh dưỡng toàn kỳ</title><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#17202a;font-size:9.5pt}h1{color:#123C36;text-align:center;font-size:22pt}h2{margin-top:22px;color:#176B57;border-bottom:2px solid #7BAF9E;padding-bottom:3px}h3{color:#123C36;margin-bottom:5px}h4{margin:10px 0 4px}table{border-collapse:collapse;width:100%;margin-bottom:12px}th,td{border:1px solid #9db6ab;padding:4px 5px}th{background:#E2F0EB;color:#123C36}.note{background:#F4F9F7;border-left:4px solid #176B57;padding:9px}.recommendation{border-left:4px solid #F0B429;background:#FFF9E8;padding:8px;margin:6px 0}.page-break{page-break-before:always}</style></head><body><h1>${periodLabel(analysis)}</h1><p class="note"><b>Hồ sơ:</b> ${escapeXml(profileLabel(profile))}<br><b>Ngày có dữ liệu:</b> ${analysis.dataDayCount}/${analysis.calendarDayCount}<br><b>Tổng năng lượng:</b> ${analysis.totalEnergy.value == null ? "—" : `${round(analysis.totalEnergy.value)} kcal`} · <b>Nhu cầu kỳ:</b> ${analysis.targetPeriodKcal == null ? "—" : `${round(analysis.targetPeriodKcal)} kcal`} · <b>Chênh lệch:</b> ${analysis.periodGapKcal == null ? "—" : `${round(analysis.periodGapKcal)} kcal`}<br><b>Trung bình:</b> ${analysis.averageEnergyKcal == null ? "—" : `${round(analysis.averageEnergyKcal)} kcal/ngày`} · <b>Đánh giá:</b> ${statusLabel(analysis.periodEnergyStatus)}<br>Ô “—” là thiếu dữ liệu nguồn; hệ thống không tự quy thành 0.</p><h2>KHUYẾN NGHỊ TOÀN KỲ</h2>${recommendations}<h2>NĂNG LƯỢNG THEO NGÀY</h2><table><thead><tr><th>Ngày</th><th>Kcal</th><th>Mục tiêu</th><th>Chênh lệch</th><th>P</th><th>L</th><th>G</th><th>Đánh giá</th></tr></thead><tbody>${dayRows}</tbody></table><h2>CÂN ĐỐI P / L / G</h2><table><thead><tr><th>Chất</th><th>Tổng kỳ</th><th>TB/ngày</th><th>%NL</th><th>Khuyến nghị</th><th>Đánh giá</th></tr></thead><tbody>${macroRows}</tbody></table><h2>PHÂN BỔ THEO BỮA</h2><table><thead><tr><th>Bữa</th><th>Ngày có bữa</th><th>Kcal</th><th>% kỳ</th><th>% mục tiêu</th><th>Chênh lệch</th><th>P</th><th>L</th><th>G</th></tr></thead><tbody>${mealRows}</tbody></table><div class="page-break"><h2>VI CHẤT &amp; KHOÁNG CHẤT</h2><table><thead><tr><th>Chất</th><th>Tổng kỳ</th><th>TB/ngày</th><th>RNI/ngày</th><th>Đáp ứng</th><th>Ngày đạt</th><th>Đánh giá</th></tr></thead><tbody>${nutrientRows}</tbody></table><h2>PHÂN TÍCH THEO MÓN</h2><table><thead><tr><th>Món</th><th>Lần</th><th>Ngày</th><th>Kcal</th><th>P</th><th>L</th><th>G</th><th>Natri</th></tr></thead><tbody>${dishRows}</tbody></table></div><div class="page-break"><h1>CHI TIẾT NGÀY → BỮA → MÓN</h1>${daySections}</div><div class="page-break"><h2>BẢNG ĐI CHỢ GỘP TOÀN KỲ</h2><table><thead><tr><th>Thực phẩm</th><th>Sống sạch (g)</th><th>Mua/kho (g)</th><th>Thải bỏ</th><th>Dùng trong ngày</th></tr></thead><tbody>${shoppingRows}</tbody></table><p><i>Thiếu tỷ lệ thải bỏ thì lượng mua/kho để “—”, cần kiểm tra trước khi mua hoặc xuất kho.</i></p></div></body></html>`;
}
