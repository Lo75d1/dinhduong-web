import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { parsePrice, priceSelect } from "@/lib/food-price-admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    await requireDataEditor();
    const { id } = await params;
    const items = await prisma.foodPrice.findMany({
      where: { foodId: id },
      select: priceSelect,
      orderBy: [{ region: "asc" }, { createdAt: "desc" }],
    });
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không có quyền xem giá tham khảo." }, { status: 403 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { values?: Record<string, unknown>; reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (!reason) return Response.json({ error: "Bắt buộc ghi lý do và nguồn đối chiếu." }, { status: 400 });
    const { id } = await params;
    const food = await prisma.food.findUnique({ where: { id }, select: { id: true } });
    if (!food) return Response.json({ error: "Không tìm thấy thực phẩm." }, { status: 404 });

    const parsed = parsePrice(body?.values);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const price = await tx.foodPrice.create({ data: { foodId: id, ...parsed.data }, select: priceSelect });
      await tx.dataChangeLog.create({ data: {
        entityType: "FOOD_PRICE", entityId: id, action: "CREATE", actorId: actor.id,
        actorName: actor.displayName, beforeJson: undefined, afterJson: price, reason,
      } });
      return price;
    });
    return Response.json({ item: created });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể thêm giá tham khảo." }, { status: 503 });
  }
}
