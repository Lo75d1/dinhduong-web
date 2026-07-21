import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { parsePrice, priceSelect } from "@/lib/food-price-admin";

type Context = { params: Promise<{ id: string; priceId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { values?: Record<string, unknown>; reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (!reason) return Response.json({ error: "Bắt buộc ghi lý do và nguồn đối chiếu." }, { status: 400 });
    const { id, priceId } = await params;
    const before = await prisma.foodPrice.findFirst({ where: { id: priceId, foodId: id }, select: priceSelect });
    if (!before) return Response.json({ error: "Không tìm thấy giá tham khảo." }, { status: 404 });

    const parsed = parsePrice(body?.values);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

    const after = await prisma.$transaction(async (tx) => {
      const price = await tx.foodPrice.update({ where: { id: priceId }, data: parsed.data, select: priceSelect });
      await tx.dataChangeLog.create({ data: {
        entityType: "FOOD_PRICE", entityId: id, action: "UPDATE", actorId: actor.id,
        actorName: actor.displayName, beforeJson: before, afterJson: price, reason,
      } });
      return price;
    });
    return Response.json({ item: after });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể cập nhật giá tham khảo." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (!reason) return Response.json({ error: "Bắt buộc ghi lý do khi xoá." }, { status: 400 });
    const { id, priceId } = await params;
    const before = await prisma.foodPrice.findFirst({ where: { id: priceId, foodId: id }, select: priceSelect });
    if (!before) return Response.json({ error: "Không tìm thấy giá tham khảo." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.foodPrice.delete({ where: { id: priceId } });
      await tx.dataChangeLog.create({ data: {
        entityType: "FOOD_PRICE", entityId: id, action: "DELETE", actorId: actor.id,
        actorName: actor.displayName, beforeJson: before, afterJson: undefined, reason,
      } });
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể xoá giá tham khảo." }, { status: 503 });
  }
}
