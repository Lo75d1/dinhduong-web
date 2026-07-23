import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchTokens } from "@/lib/search";
import type { Prisma } from "@/generated/prisma/client";

// Xuất toàn bộ công thức món ăn (bảng A, theo bộ lọc hiện tại) ra CSV để tải về
// và mở bằng Excel/Google Sheets. Chỉ đọc dữ liệu, không thay đổi CSDL.

const MAX_ROWS = 10000; // toàn bộ công thức ~7.369 dòng — thừa sức, chỉ để chặn an toàn

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim();
  const category = (params.get("category") ?? "").trim();
  const age = (params.get("age") ?? "").trim();
  const disease = (params.get("disease") ?? "").trim();

  const tokens = searchTokens(q);
  const where: Prisma.DishWhereInput = {
    ...(tokens.length ? { AND: tokens.map((token) => ({ nameNormalized: { contains: token } })) } : {}),
    ...(category && category.length <= 200 ? { categoryRaw: category } : {}),
    ...(age && age.length <= 100 ? { ageGroup: age } : {}),
    ...(disease && disease.length <= 100 ? { diseaseDiet: disease } : {}),
  };

  const items = await prisma.dish.findMany({
    where,
    orderBy: { name: "asc" },
    take: MAX_ROWS,
    select: { name: true, source: true, categoryRaw: true, totalWeightG: true, servingUnit: true, ageGroup: true, diseaseDiet: true, _count: { select: { ingredients: true } } },
  });

  const headers = ["Tên món", "Nguồn", "Nhóm món gốc", "Số nguyên liệu", "Khối lượng mặc định (g)", "Đơn vị khẩu phần", "Nhóm tuổi", "Chế độ bệnh lý"];
  const rows = items.map((dish) => [
    dish.name,
    dish.source,
    dish.categoryRaw ?? "",
    dish._count.ingredients,
    dish.totalWeightG ?? "",
    dish.servingUnit ?? "",
    dish.ageGroup ?? "",
    dish.diseaseDiet ?? "",
  ]);

  const csv = "﻿" + [headers, ...rows].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dinh-duong-2598-mon-an-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
