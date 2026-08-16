import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { parseKitchenMenuSnapshot } from "@/lib/kitchen-menu-snapshot";
import { audit, cleanText, localDate, requireManager } from "@/lib/meal-operations";
import { prisma } from "@/lib/prisma";

function failure(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
  return Response.json({ error: error instanceof Error ? error.message : "Không thể duyệt thực đơn." }, { status: 400 });
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    requireManager(user, ["ADMIN", "DIETITIAN"]);
    const [dietTypes, mealTypes] = await Promise.all([
      prisma.kitchenDietType.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
      prisma.mealType.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, serviceLocalTime: true } }),
    ]);
    return Response.json({ dietTypes, mealTypes });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Nguồn gửi yêu cầu không hợp lệ." }, { status: 403 });
    const user = await requireSessionUser();
    requireManager(user, ["ADMIN", "DIETITIAN"]);
    const body = await request.json() as Record<string, unknown>;
    const mealDate = localDate(body.mealDate);
    const dietTypeId = cleanText(body.dietTypeId);
    const rawMeals = Array.isArray(body.meals) ? body.meals : [];
    if (!dietTypeId || !rawMeals.length) throw new Error("Cần chọn chế độ ăn và có ít nhất một bữa.");
    const meals = rawMeals.map((raw) => {
      const row = raw as Record<string, unknown>;
      const mealTypeId = cleanText(row.mealTypeId);
      const snapshot = parseKitchenMenuSnapshot(row.snapshot);
      if (!mealTypeId || !snapshot) throw new Error("Một bữa chưa được nối đúng loại bữa hoặc chưa có thực phẩm/gram hợp lệ.");
      const dishName = snapshot.dishes.map((dish) => dish.dish).join(" · ").slice(0, 160);
      return { mealTypeId, snapshot, dishName };
    });
    if (new Set(meals.map((meal) => meal.mealTypeId)).size !== meals.length) throw new Error("Mỗi loại bữa chỉ được nối một lần trong một chế độ ăn.");
    const [dietType, validMealTypes] = await Promise.all([
      prisma.kitchenDietType.findFirst({ where: { id: dietTypeId, status: "ACTIVE" }, select: { id: true, name: true } }),
      prisma.mealType.findMany({ where: { id: { in: meals.map((meal) => meal.mealTypeId) }, status: "ACTIVE" }, select: { id: true } }),
    ]);
    if (!dietType || validMealTypes.length !== meals.length) throw new Error("Chế độ ăn hoặc loại bữa không còn hoạt động.");
    const before = await prisma.kitchenMenuItem.findMany({ where: { dietTypeId, menu: { mealDate, mealTypeId: { in: meals.map((meal) => meal.mealTypeId) } } }, select: { id: true, menuId: true, dishName: true, snapshotJson: true, approvedAt: true } });
    const approvedAt = new Date();
    const saved = await prisma.$transaction(async (tx) => {
      const result = [];
      for (const [sortOrder, meal] of meals.entries()) {
        const menu = await tx.kitchenMenu.upsert({
          where: { mealDate_mealTypeId: { mealDate, mealTypeId: meal.mealTypeId } },
          update: { status: "APPROVED", title: "Thực đơn bệnh viện", approvedAt, approvedById: user.id },
          create: { mealDate, mealTypeId: meal.mealTypeId, status: "APPROVED", title: "Thực đơn bệnh viện", approvedAt, approvedById: user.id },
        });
        result.push(await tx.kitchenMenuItem.upsert({
          where: { menuId_dietTypeId: { menuId: menu.id, dietTypeId } },
          update: { dishName: meal.dishName, snapshotJson: meal.snapshot, approvedAt, approvedById: user.id, sortOrder },
          create: { menuId: menu.id, dietTypeId, dishName: meal.dishName, snapshotJson: meal.snapshot, approvedAt, approvedById: user.id, sortOrder },
        }));
      }
      return result;
    });
    await Promise.all(saved.map((item) => audit({ entityType: "KITCHEN_MENU_ITEM", entityId: item.id, action: "APPROVE", user, before: before.find((old) => old.id === item.id) ?? null, after: item, reason: `Duyệt thực đơn ${dietType.name} theo ngày` })));
    return Response.json({ items: saved, approvedAt });
  } catch (error) { return failure(error); }
}
