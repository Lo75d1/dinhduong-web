import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { normalizeVi } from "@/lib/normalize";

type Context = { params: Promise<{ id: string }> };
const numeric = ["wastePercent", "energyKcal", "proteinG", "lipidG", "glucidG", "fiberG"] as const;
const text = ["name", "sourceNote", "imageUrl", "imageSourceUrl", "foodType", "foodGroup"] as const;
const snapshot = {
  id: true, name: true, source: true, sourceCode: true, sourceNote: true,
  imageUrl: true, imageSourceUrl: true, foodType: true, foodGroup: true,
  wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, fiberG: true,
};

export async function GET(_: Request, { params }: Context) {
  try {
    await requireDataEditor();
    const { id } = await params;
    const item = await prisma.food.findUnique({ where: { id }, select: snapshot });
    return item ? Response.json({ item }) : Response.json({ error: "Không tìm thấy thực phẩm." }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không có quyền biên tập dữ liệu." }, { status: 403 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { values?: Record<string, unknown>; reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (!reason) return Response.json({ error: "Bắt buộc ghi lý do thay đổi và nguồn đối chiếu." }, { status: 400 });
    const { id } = await params;
    const before = await prisma.food.findUnique({ where: { id }, select: snapshot });
    if (!before) return Response.json({ error: "Không tìm thấy thực phẩm." }, { status: 404 });

    const values = body?.values ?? {};
    const data: Record<string, string | number | null> = {};
    for (const key of text) {
      if (!(key in values)) continue;
      const max = ["sourceNote", "imageUrl", "imageSourceUrl"].includes(key) ? 2000 : 250;
      const value = typeof values[key] === "string" ? values[key].trim().slice(0, max) : "";
      data[key] = key === "name" ? value : (value || null);
    }
    for (const key of numeric) {
      if (!(key in values)) continue;
      const value = values[key];
      data[key] = value === "" || value === null ? null : (typeof value === "number" && Number.isFinite(value) ? value : null);
    }
    if (typeof data.name === "string" && !data.name) return Response.json({ error: "Tên thực phẩm không được để trống." }, { status: 400 });
    if (data.name) data.nameNormalized = normalizeVi(String(data.name));

    const after = await prisma.$transaction(async (tx) => {
      const updated = await tx.food.update({ where: { id }, data, select: snapshot });
      await tx.dataChangeLog.create({ data: {
        entityType: "FOOD", entityId: id, action: "UPDATE", actorId: actor.id,
        actorName: actor.displayName, beforeJson: before, afterJson: updated, reason,
      } });
      return updated;
    });
    return Response.json({ item: after });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể cập nhật thực phẩm." }, { status: 503 });
  }
}
