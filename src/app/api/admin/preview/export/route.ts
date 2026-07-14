import { NextRequest } from "next/server";
import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import { hasPreviewAdminAccess, previewAdminDenied } from "@/lib/preview-admin";
import { prisma } from "@/lib/prisma";

const escapeXml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (value: unknown, number = false) => `<Cell><Data ss:Type="${number && typeof value === "number" ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`;
const row = (values: unknown[]) => `<Row>${values.map((value) => cell(value, true)).join("")}</Row>`;
const sheet = (name: string, headers: string[], rows: unknown[][]) => `<Worksheet ss:Name="${escapeXml(name)}"><Table><Row>${headers.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`).join("")}</Row>${rows.map(row).join("")}</Table></Worksheet>`;

export async function GET(request: NextRequest) {
  if (!hasPreviewAdminAccess(request)) return previewAdminDenied();
  const [foods, dishes] = await Promise.all([
    prisma.food.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, nameNormalized: true, source: true, sourceCode: true, sourceNote: true, unit: true, wastePercent: true, foodType: true, foodGroup: true, vddGroupRaw: true, vddGroupEn: true, ...Object.fromEntries(ALL_NUTRIENT_FIELDS.map((field) => [field.key, true])) } as never }),
    prisma.dish.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, nameNormalized: true, source: true, sourceCode: true, totalWeightG: true, servingUnit: true, categoryRaw: true, ageGroup: true, diseaseDiet: true, cookingSteps: true, ingredients: { orderBy: { sortOrder: "asc" }, select: { foodNameRaw: true, quantityG: true, energyKcalRaw: true, foodId: true, food: { select: { name: true } } } } } }),
  ]);
  const foodHeaders = ["ID", "Tên", "Tên chuẩn hóa", "Nguồn", "Mã nguồn", "Ghi chú nguồn", "Đơn vị", "% thải bỏ", "Loại", "Nhóm TP", "Nhóm VDD gốc", "Nhóm VDD EN", ...ALL_NUTRIENT_FIELDS.map((field) => `${field.label} (${field.unit})`)];
  const foodRows = (foods as Array<Record<string, unknown>>).map((food) => [food.id, food.name, food.nameNormalized, food.source, food.sourceCode, food.sourceNote, food.unit, food.wastePercent, food.foodType, food.foodGroup, food.vddGroupRaw, food.vddGroupEn, ...ALL_NUTRIENT_FIELDS.map((field) => food[field.key])]);
  const dishRows = dishes.flatMap((dish) => dish.ingredients.length ? dish.ingredients.map((ingredient, index) => [dish.id, dish.name, dish.source, dish.sourceCode, dish.categoryRaw, dish.ageGroup, dish.diseaseDiet, dish.totalWeightG, dish.servingUnit, index + 1, ingredient.foodNameRaw, ingredient.quantityG, ingredient.energyKcalRaw, ingredient.food?.name ?? "", ingredient.foodId ?? "", dish.cookingSteps ?? ""]) : [[dish.id, dish.name, dish.source, dish.sourceCode, dish.categoryRaw, dish.ageGroup, dish.diseaseDiet, dish.totalWeightG, dish.servingUnit, "", "", "", "", "", "", dish.cookingSteps ?? ""]]);
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DCE7E1" ss:Pattern="Solid"/></Style></Styles>${sheet("Thực phẩm", foodHeaders, foodRows)}${sheet("Công thức món", ["ID món", "Tên món", "Nguồn", "Mã nguồn", "Nhóm", "Nhóm tuổi", "Chế độ bệnh", "KL món (g)", "Đơn vị", "STT nguyên liệu", "Nguyên liệu gốc", "KL (g)", "Kcal/100g gốc", "Food liên kết", "Food ID", "Cách chế biến"], dishRows)}</Workbook>`;
  return new Response(xml, { headers: { "content-type": "application/vnd.ms-excel;charset=utf-8", "content-disposition": 'attachment; filename="du-lieu-dinh-duong.xls"', "cache-control": "no-store" } });
}
