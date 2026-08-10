import ExcelJS from "exceljs";
import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { localDate } from "@/lib/meal-operations";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!["ADMIN", "DIETITIAN", "KITCHEN_MANAGER"].includes(user.role)) return Response.json({ error: "Không có quyền xuất báo cáo." }, { status: 403 });
    const key = new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10); const date = localDate(key);
    const [dietTypes, orders] = await Promise.all([
      prisma.kitchenDietType.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.mealOrder.findMany({ where: { mealDate: date, status: { not: "CANCELLED" } }, include: { department: true, mealType: true, items: true }, orderBy: [{ mealType: { sortOrder: "asc" } }, { department: { sortOrder: "asc" } }] }),
    ]);
    const workbook = new ExcelJS.Workbook(); workbook.creator = "Dinh dưỡng 2598"; workbook.created = new Date();
    const sheet = workbook.addWorksheet("Tổng hợp suất ăn", { views: [{ state: "frozen", ySplit: 4 }] });
    sheet.mergeCells(1, 1, 1, dietTypes.length + 3); sheet.getCell(1, 1).value = "TỔNG HỢP SUẤT ĂN"; sheet.getCell(1, 1).font = { bold: true, size: 18, color: { argb: "FF123C36" } };
    sheet.mergeCells(2, 1, 2, dietTypes.length + 3); sheet.getCell(2, 1).value = `Ngày ${key.split("-").reverse().join("/")} · Xuất lúc ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`;
    const headers = ["Khoa/phòng", "Bữa", ...dietTypes.map((d) => d.name), "Tổng"];
    const header = sheet.addRow(headers); header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123C36" } };
    const totals = new Map(dietTypes.map((d) => [d.id, 0])); let grand = 0;
    for (const order of orders) { const quantities = dietTypes.map((diet) => order.items.find((item) => item.dietTypeId === diet.id)?.quantity ?? 0); const total = quantities.reduce((sum, value) => sum + value, 0); quantities.forEach((value, index) => totals.set(dietTypes[index].id, (totals.get(dietTypes[index].id) ?? 0) + value)); grand += total; sheet.addRow([order.department.name, order.mealType.name, ...quantities, total]); }
    const totalRow = sheet.addRow(["TỔNG", "", ...dietTypes.map((d) => totals.get(d.id) ?? 0), grand]); totalRow.font = { bold: true, color: { argb: "FFFFFFFF" } }; totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0C5F4D" } };
    sheet.columns = [{ width: 25 }, { width: 16 }, ...dietTypes.map(() => ({ width: 18 })), { width: 14 }]; sheet.eachRow((row) => { row.alignment = { vertical: "middle", wrapText: true }; });
    const buffer = await workbook.xlsx.writeBuffer(); return new Response(buffer as ArrayBuffer, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="suat-an-${key}.xlsx"`, "cache-control": "no-store" } });
  } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse(); return Response.json({ error: "Không thể xuất Excel." }, { status: 500 }); }
}
