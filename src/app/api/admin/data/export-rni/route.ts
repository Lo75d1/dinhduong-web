import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";

// Xuất dữ liệu đầy đủ để làm bản OFFLINE: món ăn (dishes) kèm toàn bộ nguyên liệu,
// và toàn bộ foods (cả VDD lẫn RNI) đủ mọi cột dinh dưỡng — để nguyên liệu trong
// công thức tra được thành phần. Chỉ đọc CSDL. Chỉ người có quyền biên tập dữ liệu.
//   ?format=json         (mặc định) — 1 file JSON gộp: { foods, dishes(+ingredients) }
//   ?format=foods        — CSV toàn bộ foods, đủ cột
//   ?format=dishes       — CSV danh sách món
//   ?format=ingredients  — CSV nguyên liệu từng món (phẳng)

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const head = columns.map(csvCell).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")).join("\r\n");
  return "﻿" + head + "\r\n" + body; // BOM để Excel đọc đúng tiếng Việt
}
function fileResponse(body: string, type: string, filename: string) {
  return new Response(body, {
    headers: {
      "content-type": `${type}; charset=utf-8`,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    await requireDataEditor();
    const format = request.nextUrl.searchParams.get("format") ?? "json";
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "dishes") {
      const dishes = await prisma.dish.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, source: true, sourceCode: true, categoryRaw: true, diseaseDiet: true, ageGroup: true, totalWeightG: true, servingUnit: true, cookingSteps: true, _count: { select: { ingredients: true } } },
      });
      const rows = dishes.map((d) => ({ ...d, soNguyenLieu: d._count.ingredients, _count: undefined }));
      const cols = ["id", "name", "source", "sourceCode", "categoryRaw", "diseaseDiet", "ageGroup", "totalWeightG", "servingUnit", "soNguyenLieu", "cookingSteps"];
      return fileResponse(toCsv(rows, cols), "text/csv", `rni-mon-an_${stamp}.csv`);
    }

    if (format === "ingredients") {
      const dishes = await prisma.dish.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, ingredients: { orderBy: { sortOrder: "asc" }, select: { foodNameRaw: true, foodId: true, quantityG: true, energyKcalRaw: true, sortOrder: true } } },
      });
      const rows: Record<string, unknown>[] = [];
      for (const d of dishes) for (const ing of d.ingredients) rows.push({ dishId: d.id, dishName: d.name, foodNameRaw: ing.foodNameRaw, foodId: ing.foodId ?? "", quantityG: ing.quantityG ?? "", energyKcalRaw: ing.energyKcalRaw ?? "", sortOrder: ing.sortOrder });
      const cols = ["dishId", "dishName", "foodNameRaw", "foodId", "quantityG", "energyKcalRaw", "sortOrder"];
      return fileResponse(toCsv(rows, cols), "text/csv", `rni-nguyen-lieu-mon_${stamp}.csv`);
    }

    if (format === "foods") {
      const foods = (await prisma.food.findMany({ orderBy: { name: "asc" } })) as unknown as Record<string, unknown>[];
      const cols = foods.length ? Object.keys(foods[0]).filter((k) => k !== "nameNormalized") : [];
      return fileResponse(toCsv(foods, cols), "text/csv", `foods-full_${stamp}.csv`);
    }

    // JSON gộp đầy đủ (mặc định) — dùng cho app offline
    const [foods, dishes] = await Promise.all([
      prisma.food.findMany({ orderBy: { name: "asc" } }),
      prisma.dish.findMany({ orderBy: { name: "asc" }, include: { ingredients: { orderBy: { sortOrder: "asc" } } } }),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      note: "Foods gồm cả VDD lẫn RNI để nguyên liệu trong công thức tra được thành phần. Dishes (món ăn) đều là nguồn RNI, kèm nguyên liệu.",
      counts: { foods: foods.length, dishes: dishes.length, ingredients: dishes.reduce((s, d) => s + d.ingredients.length, 0) },
      foods,
      dishes,
    };
    return fileResponse(JSON.stringify(payload), "application/json", `rni-offline-full_${stamp}.json`);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không có quyền xuất dữ liệu." }, { status: 403 });
  }
}
