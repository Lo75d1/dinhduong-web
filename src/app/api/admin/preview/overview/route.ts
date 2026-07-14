import { NextRequest } from "next/server";
import { hasPreviewAdminAccess, previewAdminDenied } from "@/lib/preview-admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!hasPreviewAdminAccess(request)) return previewAdminDenied();
  const [foods, dishes, missingEnergy, missingMacros, missingGroup, duplicateNames, unlinkedIngredients] = await Promise.all([
    prisma.food.count(),
    prisma.dish.count(),
    prisma.food.count({ where: { energyKcal: null } }),
    prisma.food.count({ where: { OR: [{ proteinG: null }, { lipidG: null }, { glucidG: null }] } }),
    prisma.food.count({ where: { foodGroup: null } }),
    prisma.food.groupBy({ by: ["nameNormalized"], _count: { _all: true }, having: { nameNormalized: { _count: { gt: 1 } } }, orderBy: { _count: { nameNormalized: "desc" } }, take: 8 }),
    prisma.dishIngredient.count({ where: { foodId: null } }),
  ]);
  const [foodsNeedReview, dishesNeedReview] = await Promise.all([
    prisma.food.findMany({ where: { OR: [{ energyKcal: null }, { proteinG: null }, { lipidG: null }, { glucidG: null }] }, orderBy: { name: "asc" }, take: 20, select: { id: true, name: true, source: true, foodType: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true } }),
    prisma.dish.findMany({ where: { ingredients: { some: { foodId: null } } }, orderBy: { name: "asc" }, take: 20, select: { id: true, name: true, source: true, categoryRaw: true, _count: { select: { ingredients: true } } } }),
  ]);
  return Response.json({
    totals: { foods, dishes, missingEnergy, missingMacros, missingGroup, duplicateNormalizedNames: duplicateNames.length, unlinkedIngredients },
    foodsNeedReview,
    dishesNeedReview,
  });
}
