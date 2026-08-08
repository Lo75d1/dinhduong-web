import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { buildMenuAnalysisWorkbook } from "@/lib/menu-analysis-workbook";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền xuất bộ dữ liệu này." }, { status: 403 });

    const [foods, dishes, recommendations, dietCodes] = await Promise.all([
      prisma.food.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, source: true, sourceCode: true, foodType: true, foodGroup: true, unit: true, wastePercent: true,
          energyKcal: true, proteinG: true, animalProteinG: true, lipidG: true, glucidG: true, fiberG: true, waterG: true,
          calciumMg: true, ironMg: true, magnesiumMg: true, phosphorusMg: true, potassiumMg: true, sodiumMg: true, zincMg: true,
          vitARaeMcg: true, vitCMg: true, vitB1Mg: true, vitB2Mg: true, vitB3Mg: true, vitB6Mg: true, folateTotalMcg: true,
          vitB12Mcg: true, vitDMcg: true, vitEMg: true, vitKMcg: true, cholesterolMg: true, purinMg: true, epaC205G: true,
          dhaC226G: true, sugarsTotalG: true,
        },
      }),
      prisma.dish.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, source: true, sourceCode: true, categoryRaw: true, totalWeightG: true, servingUnit: true,
          ageGroup: true, diseaseDiet: true, cookingSteps: true,
          ingredients: {
            orderBy: { sortOrder: "asc" },
            select: { sortOrder: true, foodNameRaw: true, foodId: true, quantityG: true, energyKcalRaw: true, food: { select: { name: true } } },
          },
        },
      }),
      prisma.nutritionRecommendation.findMany({ orderBy: { stt: "asc" } }),
      prisma.dietCode.findMany({ orderBy: [{ targetGroup: "asc" }, { diseaseGroup: "asc" }, { code: "asc" }] }),
    ]);

    const dishRows = dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      source: dish.source,
      sourceCode: dish.sourceCode,
      categoryRaw: dish.categoryRaw,
      totalWeightG: dish.totalWeightG,
      servingUnit: dish.servingUnit,
      ageGroup: dish.ageGroup,
      diseaseDiet: dish.diseaseDiet,
      ingredientCount: dish.ingredients.length,
      cookingSteps: dish.cookingSteps,
    }));
    const ingredientRows = dishes.flatMap((dish) => dish.ingredients.map((ingredient) => ({
      dishId: dish.id,
      dishName: dish.name,
      sortOrder: ingredient.sortOrder,
      foodNameRaw: ingredient.foodNameRaw,
      foodId: ingredient.foodId,
      foodName: ingredient.food?.name ?? null,
      quantityG: ingredient.quantityG,
      energyKcalRaw: ingredient.energyKcalRaw,
      linkStatus: ingredient.foodId ? "Đã liên kết" : "Chưa liên kết",
    })));

    const generatedAt = new Date();
    const bytes = await buildMenuAnalysisWorkbook({
      foods,
      dishes: dishRows,
      ingredients: ingredientRows,
      recommendations,
      dietCodes,
      generatedAt,
    });
    const stamp = generatedAt.toISOString().slice(0, 10);

    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dinh-duong-2598-phan-tich-thuc-don-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    console.error("menu-analysis-export", error);
    return Response.json({ error: "Chưa thể tạo bộ dữ liệu phân tích thực đơn." }, { status: 500 });
  }
}
