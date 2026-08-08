import ExcelJS from "exceljs";

type CellValue = string | number | Date | null | undefined;

export type MenuAnalysisData = {
  foods: Record<string, CellValue>[];
  dishes: Record<string, CellValue>[];
  ingredients: Record<string, CellValue>[];
  recommendations: Record<string, CellValue>[];
  dietCodes: Record<string, CellValue>[];
  generatedAt?: Date;
};

type ColumnDefinition = {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
};

const COLORS = {
  green: "123C36",
  greenLight: "E7F1EC",
  gold: "A77B10",
  goldLight: "FFF8DF",
  gray: "D0DBD6",
  white: "FFFFFF",
  text: "17201D",
};

const foodColumns: ColumnDefinition[] = [
  { header: "Mã nội bộ", key: "id", width: 26 },
  { header: "Tên thực phẩm", key: "name", width: 34 },
  { header: "Nguồn", key: "source", width: 10 },
  { header: "Mã nguồn", key: "sourceCode", width: 14 },
  { header: "Loại dữ liệu", key: "foodType", width: 14 },
  { header: "Nhóm thực phẩm", key: "foodGroup", width: 24 },
  { header: "Đơn vị", key: "unit", width: 10 },
  { header: "Tỷ lệ thải bỏ (%)", key: "wastePercent", width: 17, numFmt: "0.0" },
  { header: "Năng lượng (kcal/100g)", key: "energyKcal", width: 22, numFmt: "0.0" },
  { header: "Protein (g/100g)", key: "proteinG", width: 18, numFmt: "0.00" },
  { header: "Protein động vật (g/100g)", key: "animalProteinG", width: 25, numFmt: "0.00" },
  { header: "Lipid (g/100g)", key: "lipidG", width: 17, numFmt: "0.00" },
  { header: "Glucid (g/100g)", key: "glucidG", width: 18, numFmt: "0.00" },
  { header: "Chất xơ (g/100g)", key: "fiberG", width: 19, numFmt: "0.00" },
  { header: "Nước (g/100g)", key: "waterG", width: 17, numFmt: "0.00" },
  { header: "Canxi (mg/100g)", key: "calciumMg", width: 18, numFmt: "0.00" },
  { header: "Sắt (mg/100g)", key: "ironMg", width: 17, numFmt: "0.00" },
  { header: "Magie (mg/100g)", key: "magnesiumMg", width: 18, numFmt: "0.00" },
  { header: "Phospho (mg/100g)", key: "phosphorusMg", width: 20, numFmt: "0.00" },
  { header: "Kali (mg/100g)", key: "potassiumMg", width: 17, numFmt: "0.00" },
  { header: "Natri (mg/100g)", key: "sodiumMg", width: 18, numFmt: "0.00" },
  { header: "Kẽm (mg/100g)", key: "zincMg", width: 17, numFmt: "0.00" },
  { header: "Vitamin A RAE (mcg/100g)", key: "vitARaeMcg", width: 24, numFmt: "0.00" },
  { header: "Vitamin C (mg/100g)", key: "vitCMg", width: 20, numFmt: "0.00" },
  { header: "Vitamin B1 (mg/100g)", key: "vitB1Mg", width: 21, numFmt: "0.00" },
  { header: "Vitamin B2 (mg/100g)", key: "vitB2Mg", width: 21, numFmt: "0.00" },
  { header: "Vitamin B3 (mg/100g)", key: "vitB3Mg", width: 21, numFmt: "0.00" },
  { header: "Vitamin B6 (mg/100g)", key: "vitB6Mg", width: 21, numFmt: "0.00" },
  { header: "Folate tổng (mcg/100g)", key: "folateTotalMcg", width: 22, numFmt: "0.00" },
  { header: "Vitamin B12 (mcg/100g)", key: "vitB12Mcg", width: 23, numFmt: "0.00" },
  { header: "Vitamin D (mcg/100g)", key: "vitDMcg", width: 21, numFmt: "0.00" },
  { header: "Vitamin E (mg/100g)", key: "vitEMg", width: 20, numFmt: "0.00" },
  { header: "Vitamin K (mcg/100g)", key: "vitKMcg", width: 21, numFmt: "0.00" },
  { header: "Cholesterol (mg/100g)", key: "cholesterolMg", width: 22, numFmt: "0.00" },
  { header: "Purin (mg/100g)", key: "purinMg", width: 18, numFmt: "0.00" },
  { header: "EPA (g/100g)", key: "epaC205G", width: 16, numFmt: "0.000" },
  { header: "DHA (g/100g)", key: "dhaC226G", width: 16, numFmt: "0.000" },
  { header: "Đường tổng (g/100g)", key: "sugarsTotalG", width: 21, numFmt: "0.00" },
];

const dishColumns: ColumnDefinition[] = [
  { header: "Mã món", key: "id", width: 26 },
  { header: "Tên món", key: "name", width: 34 },
  { header: "Nguồn", key: "source", width: 10 },
  { header: "Mã nguồn", key: "sourceCode", width: 14 },
  { header: "Nhóm món gốc", key: "categoryRaw", width: 30 },
  { header: "Khối lượng mặc định (g)", key: "totalWeightG", width: 23, numFmt: "0.0" },
  { header: "Đơn vị khẩu phần", key: "servingUnit", width: 19 },
  { header: "Nhóm tuổi", key: "ageGroup", width: 18 },
  { header: "Chế độ bệnh lý", key: "diseaseDiet", width: 22 },
  { header: "Số nguyên liệu", key: "ingredientCount", width: 16, numFmt: "0" },
  { header: "Cách chế biến", key: "cookingSteps", width: 55 },
];

const ingredientColumns: ColumnDefinition[] = [
  { header: "Mã món", key: "dishId", width: 26 },
  { header: "Tên món", key: "dishName", width: 34 },
  { header: "Thứ tự", key: "sortOrder", width: 10, numFmt: "0" },
  { header: "Tên nguyên liệu gốc", key: "foodNameRaw", width: 32 },
  { header: "Mã thực phẩm liên kết", key: "foodId", width: 26 },
  { header: "Tên thực phẩm liên kết", key: "foodName", width: 32 },
  { header: "Khối lượng (g)", key: "quantityG", width: 17, numFmt: "0.00" },
  { header: "Năng lượng nguồn (kcal/100g)", key: "energyKcalRaw", width: 28, numFmt: "0.00" },
  { header: "Trạng thái liên kết", key: "linkStatus", width: 19 },
];

const recommendationColumns: ColumnDefinition[] = [
  { header: "STT", key: "stt", width: 8, numFmt: "0" },
  { header: "Nhóm tuổi", key: "ageGroup", width: 20 },
  { header: "Giới", key: "gender", width: 12 },
  { header: "Năng lượng (kcal/ngày)", key: "energyKcal", width: 22, numFmt: "0" },
  { header: "Cân nặng tham chiếu (kg)", key: "referenceWeightKg", width: 24, numFmt: "0.0" },
  { header: "Hoạt động thể lực", key: "physicalActivity", width: 22 },
  { header: "Protein tối thiểu (% NL)", key: "proteinMinPct", width: 23, numFmt: "0.0%" },
  { header: "Protein tối đa (% NL)", key: "proteinMaxPct", width: 22, numFmt: "0.0%" },
  { header: "Lipid tối thiểu (% NL)", key: "lipidMinPct", width: 21, numFmt: "0.0%" },
  { header: "Lipid tối đa (% NL)", key: "lipidMaxPct", width: 20, numFmt: "0.0%" },
  { header: "Glucid tối thiểu (% NL)", key: "glucidMinPct", width: 22, numFmt: "0.0%" },
  { header: "Glucid tối đa (% NL)", key: "glucidMaxPct", width: 21, numFmt: "0.0%" },
  { header: "Vitamin A", key: "vitA", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin A", key: "vitAType", width: 17 },
  { header: "Vitamin D", key: "vitD", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin D", key: "vitDType", width: 17 },
  { header: "Vitamin E", key: "vitE", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin E", key: "vitEType", width: 17 },
  { header: "Vitamin K", key: "vitK", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin K", key: "vitKType", width: 17 },
  { header: "Vitamin B1", key: "vitB1", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin B1", key: "vitB1Type", width: 17 },
  { header: "Vitamin B2", key: "vitB2", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin B2", key: "vitB2Type", width: 17 },
  { header: "Vitamin B3", key: "vitB3", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin B3", key: "vitB3Type", width: 17 },
  { header: "Vitamin B5", key: "vitB5", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin B5", key: "vitB5Type", width: 17 },
  { header: "Vitamin B6", key: "vitB6", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin B6", key: "vitB6Type", width: 17 },
  { header: "Vitamin B9", key: "vitB9", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin B9", key: "vitB9Type", width: 17 },
  { header: "Vitamin B12", key: "vitB12", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin B12", key: "vitB12Type", width: 18 },
  { header: "Vitamin C", key: "vitC", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Vitamin C", key: "vitCType", width: 17 },
  { header: "Canxi", key: "calcium", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Canxi", key: "calciumType", width: 17 },
  { header: "Sắt", key: "iron", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Sắt", key: "ironType", width: 17 },
  { header: "Kẽm", key: "zinc", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Kẽm", key: "zincType", width: 17 },
  { header: "Magie", key: "magnesium", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Magie", key: "magnesiumType", width: 17 },
  { header: "I-ốt", key: "iodine", width: 14, numFmt: "0.00" },
  { header: "Đơn vị I-ốt", key: "iodineType", width: 17 },
  { header: "Phospho", key: "phosphorus", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Phospho", key: "phosphorusType", width: 18 },
  { header: "Chất xơ", key: "fiber", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Chất xơ", key: "fiberType", width: 17 },
  { header: "Nước", key: "water", width: 14, numFmt: "0.00" },
  { header: "Đơn vị/Ghi chú Nước", key: "waterType", width: 24 },
  { header: "Natri", key: "sodium", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Natri", key: "sodiumType", width: 17 },
  { header: "Kali", key: "potassium", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Kali", key: "potassiumType", width: 17 },
  { header: "Chloride", key: "chloride", width: 14, numFmt: "0.00" },
  { header: "Đơn vị Chloride", key: "chlorideType", width: 18 },
];

const dietCodeColumns: ColumnDefinition[] = [
  { header: "Mã chế độ ăn", key: "code", width: 18 },
  { header: "Đối tượng", key: "targetGroup", width: 16 },
  { header: "Nhóm bệnh", key: "diseaseGroup", width: 25 },
  { header: "Tên chế độ ăn", key: "name", width: 42 },
  { header: "Năng lượng tối thiểu (kcal)", key: "energyMinKcal", width: 25, numFmt: "0" },
  { header: "Năng lượng tối đa (kcal)", key: "energyMaxKcal", width: 24, numFmt: "0" },
  { header: "Protein tối thiểu (g)", key: "proteinMinG", width: 21, numFmt: "0.00" },
  { header: "Protein tối đa (g)", key: "proteinMaxG", width: 20, numFmt: "0.00" },
  { header: "Lipid tối thiểu (g)", key: "lipidMinG", width: 20, numFmt: "0.00" },
  { header: "Lipid tối đa (g)", key: "lipidMaxG", width: 19, numFmt: "0.00" },
  { header: "Glucid tối thiểu (g)", key: "glucidMinG", width: 21, numFmt: "0.00" },
  { header: "Glucid tối đa (g)", key: "glucidMaxG", width: 20, numFmt: "0.00" },
  { header: "Natri tối thiểu (mg)", key: "sodiumMinMg", width: 21, numFmt: "0.00" },
  { header: "Natri tối đa (mg)", key: "sodiumMaxMg", width: 20, numFmt: "0.00" },
  { header: "Kali tối thiểu (mg)", key: "potassiumMinMg", width: 20, numFmt: "0.00" },
  { header: "Kali tối đa (mg)", key: "potassiumMaxMg", width: 19, numFmt: "0.00" },
  { header: "Nước tối thiểu (ml)", key: "waterMinMl", width: 20, numFmt: "0.00" },
  { header: "Nước tối đa (ml)", key: "waterMaxMl", width: 19, numFmt: "0.00" },
  { header: "Số bữa tối thiểu", key: "mealsMin", width: 18, numFmt: "0" },
  { header: "Số bữa tối đa", key: "mealsMax", width: 17, numFmt: "0" },
  { header: "Ghi chú", key: "note", width: 48 },
];

function addDataSheet(workbook: ExcelJS.Workbook, name: string, columns: ColumnDefinition[], rows: Record<string, CellValue>[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.properties.defaultRowHeight = 19;
  sheet.columns = columns.map((column) => ({ ...column }));
  rows.forEach((row) => sheet.addRow(row));

  const header = sheet.getRow(1);
  header.height = 32;
  header.font = { bold: true, color: { argb: COLORS.white }, size: 11 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  header.border = { bottom: { style: "medium", color: { argb: COLORS.gold } } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  columns.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    excelColumn.width = column.width;
    if (column.numFmt) excelColumn.numFmt = column.numFmt;
  });
  return sheet;
}

function addGuideSheet(workbook: ExcelJS.Workbook, data: MenuAnalysisData) {
  const sheet = workbook.addWorksheet("Huong_dan");
  sheet.views = [{ showGridLines: false }];
  sheet.getColumn("A").width = 28;
  sheet.getColumn("B").width = 82;
  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = "BỘ DỮ LIỆU PHÂN TÍCH THỰC ĐƠN — DINH DƯỠNG 2598";
  sheet.getCell("A1").font = { bold: true, color: { argb: COLORS.white }, size: 16 };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 36;

  const generatedAt = data.generatedAt ?? new Date();
  const rows: [string, CellValue][] = [
    ["Ngày tạo", generatedAt],
    ["Phạm vi", "Chỉ gồm dữ liệu chuyên môn phục vụ phân tích thực đơn; không chứa tài khoản, bệnh nhân, khẩu phần cá nhân hoặc API key."],
    ["Nguồn dữ liệu", "Các bản ghi được giữ nguyên nhãn nguồn VDD/RNI trong từng sheet để đối chiếu."],
    ["Đơn vị thực phẩm", "Thành phần dinh dưỡng trong sheet Thuc_pham tính trên 100 g phần ăn được, trừ khi cột ghi rõ khác."],
    ["Lưu ý chuyên môn", "Khung tính chỉ hỗ trợ phân tích. Thực đơn bệnh lý cần được chuyên gia dinh dưỡng xem xét theo tình trạng lâm sàng cụ thể."],
    ["", ""],
    ["Sheet", "Nội dung"],
    ["Thuc_pham", `${data.foods.length.toLocaleString("vi-VN")} thực phẩm/món ăn có số liệu thành phần dinh dưỡng.`],
    ["Mon_an", `${data.dishes.length.toLocaleString("vi-VN")} công thức món ăn và thông tin chế biến.`],
    ["Nguyen_lieu_mon", `${data.ingredients.length.toLocaleString("vi-VN")} dòng nguyên liệu; dùng Mã món để nối với sheet Mon_an.`],
    ["Nhu_cau", `${data.recommendations.length.toLocaleString("vi-VN")} dòng nhu cầu khuyến nghị theo tuổi/giới/hoạt động.`],
    ["Ma_che_do_an", `${data.dietCodes.length.toLocaleString("vi-VN")} mã chế độ ăn và khoảng mục tiêu.`],
    ["Khung_thuc_don", "Nhập mã thực phẩm và khối lượng ăn được; Excel tự tính năng lượng và các chất chính."],
  ];
  rows.forEach((row, index) => { sheet.getRow(index + 3).values = row; });
  sheet.getCell("B3").numFmt = "yyyy-mm-dd hh:mm";
  for (let row = 3; row <= rows.length + 2; row += 1) {
    sheet.getRow(row).height = row === 4 || row === 7 ? 42 : 24;
    for (let column = 1; column <= 2; column += 1) {
      const cell = sheet.getCell(row, column);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: COLORS.gray } } };
    }
  }
  for (let row = 3; row <= 7; row += 1) sheet.getCell(row, 1).font = { bold: true, color: { argb: COLORS.green } };
  for (let column = 1; column <= 2; column += 1) {
    sheet.getCell(9, column).font = { bold: true, color: { argb: COLORS.white } };
    sheet.getCell(9, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
  }
}

function addMenuTemplate(workbook: ExcelJS.Workbook, foodRowCount: number) {
  const sheet = workbook.addWorksheet("Khung_thuc_don", { views: [{ state: "frozen", ySplit: 2 }] });
  sheet.views = [{ state: "frozen", ySplit: 2, showGridLines: false }];
  const headers = [
    "Ngày", "Bữa ăn", "Tên món", "Mã thực phẩm", "Tên thực phẩm", "Khối lượng ăn được (g)",
    "Năng lượng (kcal)", "Protein (g)", "Lipid (g)", "Glucid (g)", "Chất xơ (g)", "Natri (mg)", "Ghi chú",
  ];
  sheet.mergeCells("A1:M1");
  sheet.getCell("A1").value = "KHUNG NHẬP VÀ PHÂN TÍCH THỰC ĐƠN";
  sheet.getCell("A1").font = { bold: true, color: { argb: COLORS.white }, size: 15 };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 34;
  sheet.getRow(2).values = headers;
  sheet.getRow(2).height = 31;
  sheet.getRow(2).font = { bold: true, color: { argb: COLORS.white } };
  sheet.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.gold } };
  sheet.getRow(2).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  const lastFoodRow = Math.max(2, foodRowCount + 1);
  for (let row = 3; row <= 102; row += 1) {
    sheet.getCell(`E${row}`).value = { formula: `IFERROR(VLOOKUP(D${row},'Thuc_pham'!$A$2:$AL$${lastFoodRow},2,FALSE),"")` };
    const lookupColumns = { G: 9, H: 10, I: 12, J: 13, K: 14, L: 21 };
    Object.entries(lookupColumns).forEach(([target, sourceIndex]) => {
      sheet.getCell(`${target}${row}`).value = { formula: `IFERROR(VLOOKUP(D${row},'Thuc_pham'!$A$2:$AL$${lastFoodRow},${sourceIndex},FALSE)*F${row}/100,0)` };
      sheet.getCell(`${target}${row}`).numFmt = "0.00";
    });
    sheet.getCell(`A${row}`).numFmt = "yyyy-mm-dd";
    for (let column = 1; column <= 4; column += 1) sheet.getCell(row, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goldLight } };
    sheet.getCell(`F${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goldLight } };
    sheet.getCell(`M${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goldLight } };
  }

  const totalRow = 103;
  sheet.mergeCells(`A${totalRow}:F${totalRow}`);
  sheet.getCell(`A${totalRow}`).value = "TỔNG 100 DÒNG ĐANG NHẬP";
  sheet.getCell(`A${totalRow}`).alignment = { horizontal: "right" };
  for (const column of ["G", "H", "I", "J", "K", "L"]) {
    sheet.getCell(`${column}${totalRow}`).value = { formula: `SUM(${column}3:${column}102)` };
    sheet.getCell(`${column}${totalRow}`).numFmt = "0.00";
  }
  for (let column = 1; column <= 13; column += 1) {
    sheet.getCell(totalRow, column).font = { bold: true, color: { argb: COLORS.white } };
    sheet.getCell(totalRow, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
  }
  for (let row = 2; row <= 102; row += 1) {
    for (let column = 1; column <= 13; column += 1) sheet.getCell(row, column).border = { bottom: { style: "thin", color: { argb: COLORS.gray } } };
  }
  sheet.autoFilter = "A2:M102";

  const widths = [13, 14, 24, 26, 32, 24, 20, 16, 15, 16, 16, 16, 32];
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
}

export async function buildMenuAnalysisWorkbook(data: MenuAnalysisData): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dinh dưỡng 2598";
  workbook.company = "Dinh dưỡng 2598";
  workbook.subject = "Bộ dữ liệu phân tích thực đơn";
  workbook.title = "Bộ dữ liệu phân tích thực đơn — Dinh dưỡng 2598";
  workbook.created = data.generatedAt ?? new Date();
  workbook.modified = data.generatedAt ?? new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  addGuideSheet(workbook, data);
  addDataSheet(workbook, "Thuc_pham", foodColumns, data.foods);
  const dishSheet = addDataSheet(workbook, "Mon_an", dishColumns, data.dishes);
  dishSheet.getColumn("K").alignment = { vertical: "top", wrapText: true };
  addDataSheet(workbook, "Nguyen_lieu_mon", ingredientColumns, data.ingredients);
  addDataSheet(workbook, "Nhu_cau", recommendationColumns, data.recommendations);
  const dietSheet = addDataSheet(workbook, "Ma_che_do_an", dietCodeColumns, data.dietCodes);
  dietSheet.getColumn("U").alignment = { vertical: "top", wrapText: true };
  addMenuTemplate(workbook, data.foods.length);

  const output = await workbook.xlsx.writeBuffer();
  return new Uint8Array(output as ArrayBuffer);
}
