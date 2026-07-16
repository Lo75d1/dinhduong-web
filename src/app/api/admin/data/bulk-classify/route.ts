import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";

// Whitelist cứng: chỉ các trường phân loại (nhóm C) được sửa hàng loạt qua route
// này — không cho phép ghi trường bất kỳ do client gửi lên.
const TEXT_FIELDS = new Set(["foodType", "foodGroup", "proteinOrigin"]);
const LEVEL_FIELDS = new Set(["giLevel", "purinLevel", "cholesterolLevel"]);
const ALL_FIELDS = new Set([...TEXT_FIELDS, ...LEVEL_FIELDS]);
const snapshot = { id: true, name: true, foodType: true, foodGroup: true, proteinOrigin: true, giLevel: true, purinLevel: true, cholesterolLevel: true };
// Mọi dòng trong 1 lô nhận CÙNG giá trị nên có thể updateMany 1 lượt gọi duy
// nhất (khác ảnh VDD/RNI — mỗi dòng có URL/mã ảnh riêng nên phải update từng
// dòng) — round-trip không tăng theo N, batch lớn vẫn an toàn.
const BATCH_SIZE = 1000;

export async function POST(request: Request) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { ids?: unknown; field?: unknown; value?: unknown; reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    const field = typeof body?.field === "string" ? body.field : "";
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 10_000) : [];
    if (!reason) return Response.json({ error: "Cần ghi lý do trước khi cập nhật." }, { status: 400 });
    if (!ALL_FIELDS.has(field)) return Response.json({ error: "Trường không hợp lệ." }, { status: 400 });
    if (!ids.length) return Response.json({ error: "Chưa chọn dòng nào để cập nhật." }, { status: 400 });

    let value: string | number | null;
    if (TEXT_FIELDS.has(field)) {
      value = typeof body?.value === "string" && body.value.trim() ? body.value.trim().slice(0, 100) : null;
    } else {
      const n = Number(body?.value);
      value = Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;
    }

    let updated = 0;
    let skipped = 0;
    const failedBatches: string[] = [];
    for (let start = 0; start < ids.length; start += BATCH_SIZE) {
      const batch = ids.slice(start, start + BATCH_SIZE);
      try {
        const result = await prisma.$transaction(async (tx) => {
          const befores = await tx.food.findMany({ where: { id: { in: batch } }, select: snapshot });
          const toUpdate = befores.filter((before) => before[field as keyof typeof before] !== value);
          const batchSkipped = batch.length - toUpdate.length;
          if (!toUpdate.length) return { batchUpdated: 0, batchSkipped };
          await tx.food.updateMany({ where: { id: { in: toUpdate.map((row) => row.id) } }, data: { [field]: value } });
          const logs = toUpdate.map((before) => ({ entityType: "FOOD", entityId: before.id, action: "BULK_CLASSIFY", actorId: actor.id, actorName: actor.displayName, beforeJson: before, afterJson: { ...before, [field]: value }, reason: `[${field}] ${reason}` }));
          await tx.dataChangeLog.createMany({ data: logs });
          return { batchUpdated: toUpdate.length, batchSkipped };
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
    return Response.json({ error: "Chưa thể cập nhật phân loại." }, { status: 500 });
  }
}
