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

    // Chia lô + trong mỗi lô, gộp bước "tìm trước" thành 1 findMany và gộp ghi
    // log thành 1 createMany — độ trễ mạng VPS<->Supabase khiến từng dòng gọi
    // riêng (findUnique+update+create x N) vượt timeout dù đã chia lô 300 dòng;
    // chỉ còn update là bắt buộc gọi riêng từng dòng.
    const BATCH_SIZE = 150;
    let updated = 0;
    let skipped = 0;
    const failedBatches: string[] = [];
    for (let start = 0; start < items.length; start += BATCH_SIZE) {
      const batch = items.slice(start, start + BATCH_SIZE);
      try {
        const result = await prisma.$transaction(async (tx) => {
          let batchUpdated = 0;
          let batchSkipped = 0;
          const valid = batch.map((item) => ({
            id: typeof item.id === "string" ? item.id : "",
            sourceCode: typeof item.sourceCode === "string" ? item.sourceCode : "",
            imageSourceId: typeof item.imageSourceId === "string" ? item.imageSourceId : "",
          })).filter((item) => item.id && item.sourceCode && uuid.test(item.imageSourceId));
          batchSkipped += batch.length - valid.length;
          const befores = await tx.dish.findMany({ where: { id: { in: valid.map((item) => item.id) } }, select: snapshot });
          const beforeMap = new Map(befores.map((row) => [row.id, row]));
          const logs: { entityType: string; entityId: string; action: string; actorId: string; actorName: string; beforeJson: object; afterJson: object; reason: string }[] = [];
          for (const item of valid) {
            const before = beforeMap.get(item.id);
            if (!before || before.source !== "RNI" || before.sourceCode !== item.sourceCode || before.imageSourceId === item.imageSourceId) { batchSkipped++; continue; }
            const after = await tx.dish.update({ where: { id: item.id }, data: { imageSourceId: item.imageSourceId, imageSourceUrl: RNI_SOURCE_PAGE }, select: snapshot });
            logs.push({ entityType: "DISH", entityId: item.id, action: "IMPORT_RNI_IMAGE_REFERENCE", actorId: actor.id, actorName: actor.displayName, beforeJson: before, afterJson: after, reason });
            batchUpdated++;
          }
          if (logs.length) await tx.dataChangeLog.createMany({ data: logs });
          return { batchUpdated, batchSkipped };
        }, { maxWait: 10_000, timeout: 45_000 });
        updated += result.batchUpdated;
        skipped += result.batchSkipped;
      } catch (error) {
        failedBatches.push(`dòng ${start + 1}-${start + batch.length}: ${error instanceof Error ? error.message.slice(0, 200) : "lỗi không xác định"}`);
      }
    }
    if (failedBatches.length) return Response.json({ updated, skipped, warning: `Còn ${failedBatches.length} lô lỗi, mỗi lô đã tự rollback riêng (không mất dữ liệu): ${failedBatches.join("; ")}` });
    return Response.json({ updated, skipped });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    const detail = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[chuỗi kết nối đã che]").slice(0, 500) : "Lỗi không xác định";
    return Response.json({ error: `Chưa thể cập nhật mã ảnh RNI. Chi tiết kỹ thuật: ${detail}` }, { status: 500 });
  }
}
