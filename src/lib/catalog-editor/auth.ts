import "server-only";
import { createHash } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { enforceNutritionRateLimit } from "@/lib/nutrition-chat/security";
import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { fail } from "./policy";
export type CatalogActor = {
  id: string;
  displayName: string;
  role: string;
  keyId: string | null;
  principal: string;
};
export const keyHash = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
export function canPublish(actor: CatalogActor) {
  return !actor.keyId && actor.role === "ADMIN";
}
export function requirePublisher(actor: CatalogActor) {
  if (!canPublish(actor))
    fail("Chỉ quản trị viên đăng nhập trên web được duyệt và áp dụng.", 403);
}
export async function authenticateCatalog(
  request: Request,
  sessionOnly = false,
): Promise<CatalogActor> {
  const origin = request.headers.get("origin"),
    authorization = request.headers.get("authorization");
  if (
    (origin && origin !== getNutritionPublicUrl()) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    fail("Nguồn yêu cầu không được phép.", 403);
  if (authorization) {
    if (sessionOnly || !/^Bearer ce1_[A-Za-z0-9_-]{43}$/.test(authorization))
      fail("Khóa biên tập không hợp lệ cho thao tác này.", 401);
    await enforceNutritionRateLimit("catalog-auth:global", {
      limit: 600,
      windowSeconds: 60,
    });
    const rows = await prisma.$queryRaw<
      Array<{ id: string; displayName: string; role: string; keyId: string }>
    >`
      SELECT u.id, u."displayName", u.role, k.id AS "keyId" FROM catalog_editor_keys k JOIN app_users u ON u.id = k."ownerId"
      WHERE k."tokenHash" = ${keyHash(authorization.slice(7))} AND k."revokedAt" IS NULL AND k."expiresAt" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND u."disabledAt" IS NULL AND u.role IN ('ADMIN','EDITOR')`;
    const user = rows[0];
    if (!user)
      fail(
        "Khóa biên tập đã hết hạn, bị thu hồi hoặc tài khoản không còn quyền.",
        401,
      );
    await enforceNutritionRateLimit(`catalog-key:${user.keyId}`, {
      limit: 60,
      windowSeconds: 60,
    });
    return { ...user, principal: `key:${user.keyId}` };
  }
  if (request.method !== "GET" && origin !== getNutritionPublicUrl())
    fail("Thao tác trên web cần Origin hợp lệ.", 403);
  const user = await getSessionUser();
  if (!user) fail("Bạn cần đăng nhập.", 401);
  if (user.role !== "ADMIN" && user.role !== "EDITOR")
    fail("Bạn chưa có quyền biên tập dữ liệu.", 403);
  await enforceNutritionRateLimit(`catalog-user:${user.id}`, {
    limit: 120,
    windowSeconds: 60,
  });
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    keyId: null,
    principal: `user:${user.id}`,
  };
}
/** Recheck role/key under row locks, so revocation cannot race a publish/write. */
export async function catalogTransaction<T>(
  actor: CatalogActor,
  fn: (tx: Prisma.TransactionClient, current: CatalogActor) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; displayName: string; role: string }>
      >`SELECT id, "displayName", role FROM app_users WHERE id = ${actor.id} AND "disabledAt" IS NULL AND role IN ('ADMIN','EDITOR') FOR SHARE`;
      if (!rows[0]) fail("Tài khoản không còn quyền biên tập.", 403);
      if (actor.keyId) {
        const keys = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT id FROM catalog_editor_keys WHERE id = ${actor.keyId} AND "ownerId" = ${actor.id} AND "revokedAt" IS NULL AND "expiresAt" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') FOR SHARE`;
        if (!keys[0]) fail("Khóa đã hết hạn hoặc bị thu hồi.", 401);
      }
      return fn(tx, { ...actor, ...rows[0] });
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}
