import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ImportRow = { id?: unknown; sourceCode?: unknown; imageUrl?: unknown; imageSourceUrl?: unknown };
const snapshot = { id: true, name: true, source: true, sourceCode: true, imageUrl: true, imageSourceUrl: true };

function officialImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("viendinhduong.vn") ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { items?: ImportRow[]; reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    const requested = Array.isArray(body?.items) ? body.items.slice(0, 3000) : [];
    if (!reason) return Response.json({ error: "Cần ghi lý do và nguồn đối chiếu trước khi cập nhật." }, { status: 400 });
    if (!requested.length) return Response.json({ error: "Chưa có dòng ảnh hợp lệ để cập nhật." }, { status: 400 });

    let updated = 0;
    let skipped = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of requested) {
        const id = typeof item.id === "string" ? item.id : "";
        const sourceCode = typeof item.sourceCode === "string" ? item.sourceCode : "";
        const imageUrl = officialImageUrl(item.imageUrl);
        const imageSourceUrl = officialImageUrl(item.imageSourceUrl) ?? "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an";
        if (!id || !sourceCode || !imageUrl) { skipped++; continue; }
        const before = await tx.food.findUnique({ where: { id }, select: snapshot });
        if (!before || before.source !== "VDD") { skipped++; continue; }
        if (before.sourceCode && before.sourceCode !== sourceCode) { skipped++; continue; }
        if (before.sourceCode === sourceCode && before.imageUrl === imageUrl && before.imageSourceUrl === imageSourceUrl) { skipped++; continue; }
        const after = await tx.food.update({ where: { id }, data: { sourceCode, imageUrl, imageSourceUrl }, select: snapshot });
        await tx.dataChangeLog.create({ data: { entityType: "FOOD", entityId: id, action: "IMPORT_IMAGE_REFERENCE", actorId: actor.id, actorName: actor.displayName, beforeJson: before, afterJson: after, reason } });
        updated++;
      }
    }, { maxWait: 10_000, timeout: 60_000 });
    return Response.json({ updated, skipped });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể cập nhật URL ảnh. Không có thay đổi nào được xác nhận." }, { status: 500 });
  }
}
