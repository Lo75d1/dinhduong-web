import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ImportRow = { id?: unknown; sourceCode?: unknown; imageSourceId?: unknown };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const snapshot = { id: true, name: true, source: true, sourceCode: true, imageSourceId: true, imageSourceUrl: true };
const RNI_SOURCE_PAGE = "https://app.thucdongiadinh.vn/app/xay-dung-khau-phan/nbt-xay-dung-thuc-don";

export async function POST(request: Request) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { items?: ImportRow[]; reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    const items = Array.isArray(body?.items) ? body.items.slice(0, 10_000) : [];
    if (!reason) return Response.json({ error: "Cần ghi lý do và nguồn đối chiếu trước khi cập nhật." }, { status: 400 });

    let updated = 0;
    let skipped = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const id = typeof item.id === "string" ? item.id : "";
        const sourceCode = typeof item.sourceCode === "string" ? item.sourceCode : "";
        const imageSourceId = typeof item.imageSourceId === "string" ? item.imageSourceId : "";
        if (!id || !sourceCode || !uuid.test(imageSourceId)) { skipped++; continue; }
        const before = await tx.dish.findUnique({ where: { id }, select: snapshot });
        if (!before || before.source !== "RNI" || before.sourceCode !== sourceCode || before.imageSourceId === imageSourceId) { skipped++; continue; }
        const after = await tx.dish.update({ where: { id }, data: { imageSourceId, imageSourceUrl: RNI_SOURCE_PAGE }, select: snapshot });
        await tx.dataChangeLog.create({ data: { entityType: "DISH", entityId: id, action: "IMPORT_RNI_IMAGE_REFERENCE", actorId: actor.id, actorName: actor.displayName, beforeJson: before, afterJson: after, reason } });
        updated++;
      }
    }, { maxWait: 10_000, timeout: 60_000 });
    return Response.json({ updated, skipped });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    const detail = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[chuỗi kết nối đã che]").slice(0, 500) : "Lỗi không xác định";
    return Response.json({ error: `Chưa thể cập nhật mã ảnh RNI. Chi tiết kỹ thuật: ${detail}` }, { status: 500 });
  }
}
