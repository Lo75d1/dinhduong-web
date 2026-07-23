import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchTokens } from "@/lib/search";
import type { Prisma } from "@/generated/prisma/client";

// Xuất toàn bộ kết quả tra cứu (theo bộ lọc hiện tại) ra CSV để tải về và mở
// bằng Excel/Google Sheets. Chỉ đọc dữ liệu, không thay đổi CSDL.

const TYPE_LABELS: Record<string, string> = { TS: "Tươi sống", CB: "Chế biến", MA: "Món ăn", SP: "Sản phẩm" };
const MAX_ROWS = 10000; // toàn bảng ~3.557 dòng — thừa sức, chỉ để chặn an toàn

// Bọc một ô CSV: nhân đôi dấu nháy kép và bao ngoài nếu chứa ký tự đặc biệt.
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim();
  const type = ["TS", "CB", "MA", "SP"].includes(params.get("type") ?? "") ? params.get("type") ?? "" : "";
  const source = ["VDD", "RNI"].includes(params.get("source") ?? "") ? params.get("source") ?? "" : "";
  const group = (params.get("group") ?? "").trim();

  const tokens = searchTokens(q);
  const where: Prisma.FoodWhereInput = {
    ...(tokens.length ? { AND: tokens.map((token) => ({ OR: [{ nameNormalized: { contains: token } }, { aliases: { some: { aliasNormalized: { contains: token } } } }] })) } : {}),
    ...(type ? { foodType: type } : {}),
    ...(source ? { source } : {}),
    ...(group && group.length <= 100 ? { foodGroup: group } : {}),
  };

  const items = await prisma.food.findMany({
    where,
    orderBy: { name: "asc" },
    take: MAX_ROWS,
    select: { name: true, foodType: true, source: true, foodGroup: true, unit: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, fiberG: true },
  });

  const headers = ["Tên bản ghi", "Loại", "Nguồn", "Nhóm phân loại", "Đơn vị", "Năng lượng (kcal/100g)", "Đạm (g)", "Béo (g)", "Bột đường (g)", "Chất xơ (g)"];
  const rows = items.map((food) => [
    food.name,
    TYPE_LABELS[food.foodType ?? ""] ?? food.foodType ?? "",
    food.source,
    food.foodGroup ?? "",
    food.unit ?? "g",
    food.energyKcal ?? "",
    food.proteinG ?? "",
    food.lipidG ?? "",
    food.glucidG ?? "",
    food.fiberG ?? "",
  ]);

  // BOM ﻿ để Excel nhận UTF-8 (hiển thị đúng tiếng Việt); CRLF theo chuẩn CSV.
  const csv = "﻿" + [headers, ...rows].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dinh-duong-2598-thuc-pham-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
