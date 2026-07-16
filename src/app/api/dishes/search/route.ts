import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchRank, searchTokens } from "@/lib/search";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { CLASSIFY_SELECT_KEYS } from "@/lib/food-classify";

const FOOD_SELECT = {
  id: true, name: true, wastePercent: true,
  ...Object.fromEntries(CORE_CALC_FIELDS.map((field) => [field.key, true])),
  ...Object.fromEntries(CLASSIFY_SELECT_KEYS.map((key) => [key, true])),
} as const;

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const category = (request.nextUrl.searchParams.get("category") ?? "").trim();
  const age = (request.nextUrl.searchParams.get("age") ?? "").trim();
  const disease = (request.nextUrl.searchParams.get("disease") ?? "").trim();
  if (!q) return Response.json({ items: [] });
  const tokens = searchTokens(q);
  const items = await prisma.dish.findMany({
    where: {
      AND: tokens.map((token) => ({ nameNormalized: { contains: token } })),
      ...(category ? { categoryRaw: category } : {}),
      ...(age ? { ageGroup: age } : {}),
      ...(disease ? { diseaseDiet: disease } : {}),
    },
    // take nhỏ + orderBy theo tên trước khi xếp hạng lại sẽ cắt mất các món
    // khớp đầu chữ nếu có nhiều món khác chứa từ khoá đứng trước theo alphabet.
    orderBy: { name: "asc" }, take: 300,
    select: {
      id: true, name: true, totalWeightG: true, servingUnit: true, categoryRaw: true, ageGroup: true, diseaseDiet: true, imageSourceId: true,
      ingredients: { orderBy: { sortOrder: "asc" }, select: { id: true, foodNameRaw: true, quantityG: true, food: { select: FOOD_SELECT } } },
    },
  });
  items.sort((a, b) => searchRank(a.name, q) - searchRank(b.name, q) || a.name.localeCompare(b.name, "vi"));
  return Response.json({ items: items.slice(0, 30) });
}
