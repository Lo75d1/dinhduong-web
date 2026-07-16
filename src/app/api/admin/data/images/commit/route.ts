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

    // Chia lô + trong mỗi lô, gộp bước "tìm trước" thành 1 findMany và gộp ghi
    // log thành 1 createMany — độ trễ mạng VPS<->Supabase khiến từng dòng gọi
    // riêng (findUnique+update+create x N) vượt timeout dù đã chia lô 300 dòng;
    // chỉ còn update là bắt buộc gọi riêng từng dòng.
    const BATCH_SIZE = 150;
    let updated = 0;
    let skipped = 0;
    const failedBatches: string[] = [];
    for (let start = 0; start < requested.length; start += BATCH_SIZE) {
      const batch = requested.slice(start, start + BATCH_SIZE);
      try {
        const result = await prisma.$transaction(async (tx) => {
          let batchUpdated = 0;
          let batchSkipped = 0;
          const valid = batch.map((item) => ({
            id: typeof item.id === "string" ? item.id : "",
            sourceCode: typeof item.sourceCode === "string" ? item.sourceCode : "",
            imageUrl: officialImageUrl(item.imageUrl),
            imageSourceUrl: officialImageUrl(item.imageSourceUrl) ?? "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an",
          })).filter((item): item is typeof item & { imageUrl: string } => Boolean(item.id && item.sourceCode && item.imageUrl));
          batchSkipped += batch.length - valid.length;
          const befores = await tx.food.findMany({ where: { id: { in: valid.map((item) => item.id) } }, select: snapshot });
          const beforeMap = new Map(befores.map((row) => [row.id, row]));
          const logs: { entityType: string; entityId: string; action: string; actorId: string; actorName: string; beforeJson: object; afterJson: object; reason: string }[] = [];
          for (const item of valid) {
            const before = beforeMap.get(item.id);
            if (!before || before.source !== "VDD") { batchSkipped++; continue; }
            if (before.sourceCode && before.sourceCode !== item.sourceCode) { batchSkipped++; continue; }
            if (before.sourceCode === item.sourceCode && before.imageUrl === item.imageUrl && before.imageSourceUrl === item.imageSourceUrl) { batchSkipped++; continue; }
            const after = await tx.food.update({ where: { id: item.id }, data: { sourceCode: item.sourceCode, imageUrl: item.imageUrl, imageSourceUrl: item.imageSourceUrl }, select: snapshot });
            logs.push({ entityType: "FOOD", entityId: item.id, action: "IMPORT_IMAGE_REFERENCE", actorId: actor.id, actorName: actor.displayName, beforeJson: before, afterJson: after, reason });
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
    return Response.json({ error: "Chưa thể cập nhật URL ảnh. Không có thay đổi nào được xác nhận." }, { status: 500 });
  }
}
