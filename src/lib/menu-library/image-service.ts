import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { enforceNutritionRateLimit } from "@/lib/nutrition-chat/security";
import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { lockActor, assertMenuActor, type MenuActor } from "./store";
import { validateImageMetadataInput, storeMenuImage, decodeImageBase64 } from "./image-storage";
import { menuIllustrationUrl } from "./illustration";
import { validateOperationObject } from "@/lib/nutrition-chat/service";

export async function uploadMenuImage(actor: MenuActor, bytes: Buffer, value: { alt: unknown; sourceKind: unknown; requestKey: unknown }) {
  await assertMenuActor(actor, true);
  const input = validateImageMetadataInput(value.alt, value.sourceKind, value.requestKey);
  await enforceNutritionRateLimit(`menu-images:${actor.userId}`, { limit: 100, windowSeconds: 86400 });
  return prisma.$transaction(async tx => {
    await lockActor(tx, actor);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"menu-library-image-storage"},0))::text`;
    const saved = await storeMenuImage(bytes, actor.userId, input);
    const result = { illustration: saved.illustration, url: `${getNutritionPublicUrl()}${menuIllustrationUrl(saved.metadata.id)}`, width: saved.metadata.width, height: saved.metadata.height, replayed: saved.replayed };
    const previous = await tx.dataChangeLog.findFirst({ where: { entityType: "MENU_LIBRARY_IMAGE", entityId: saved.metadata.id } });
    if (!previous) await tx.dataChangeLog.create({ data: {
      entityType: "MENU_LIBRARY_IMAGE", entityId: saved.metadata.id, action: "UPLOAD", actorId: actor.userId, actorName: actor.userId,
      afterJson: result as unknown as Prisma.InputJsonValue, reason: "Tải ảnh minh hoạ bữa ăn; ảnh không xác nhận định lượng hay thành phần dinh dưỡng.",
    } });
    return { ...result, next: "Gắn illustration vào đúng days[].meals[].groupPortions[] rồi lưu thực đơn với phiên bản hiện hành. Ảnh đã tải chưa tự thay đổi thực đơn. Thay/xoá ảnh chỉ thay tham chiếu; ảnh cũ được giữ cho lịch sử." };
  }, { maxWait: 10000, timeout: 30000 });
}
export async function uploadMenuImageBase64(actor: MenuActor, value: unknown) {
  const args = validateOperationObject(value, ["base64", "alt", "sourceKind", "requestKey"], ["base64", "alt", "sourceKind", "requestKey"]);
  await assertMenuActor(actor, true);
  return uploadMenuImage(actor, decodeImageBase64(args.base64), { alt: args.alt, sourceKind: args.sourceKind, requestKey: args.requestKey });
}
