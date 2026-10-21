import "server-only";
import { prisma } from "@/lib/prisma";
import {
  getNutritionPublicUrl, getNutritionResourceUrl, hashNutritionToken,
  NutritionSecurityError, parseNutritionScopes, validateNutritionOrigin,
} from "./oauth-validation";
import { guestSessionIdentity } from "./guest-store";
import { nutritionErrorGuidance } from "./response-guidance";

export { getNutritionPublicUrl, getNutritionResourceUrl, NutritionSecurityError, validateNutritionOrigin };
export { readNutritionText, readNutritionJson, readNutritionForm } from "./http";
import type { NutritionIdentity } from "./contracts";
export type { NutritionIdentity } from "./contracts";
export type NutritionRatePolicy = { limit: number; windowSeconds: number };

export const NUTRITION_NO_STORE_HEADERS = {
  "Cache-Control": "no-store", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function nutritionJson(data: unknown, status = 200, headers?: HeadersInit): Response {
  const result = new Headers(NUTRITION_NO_STORE_HEADERS);
  new Headers(headers).forEach((value, key) => result.set(key, value));
  return Response.json(data, { status, headers: result });
}

export function nutritionAuthenticateChallenge(scope: string, error?: "invalid_token" | "insufficient_scope"): string {
  const scopes = parseNutritionScopes(scope).join(" ");
  return `Bearer resource_metadata="${getNutritionPublicUrl()}/.well-known/oauth-protected-resource", scope="${scopes}"${error ? `, error="${error}"` : ""}`;
}

export function unauthorizedNutritionResponse(scope = "nutrition:read", error?: "invalid_token" | "insufficient_scope"): Response {
  return nutritionJson({ error: error ?? "unauthorized", error_description: "Kết nối lại và cấp quyền trong ứng dụng AI." }, error === "insufficient_scope" ? 403 : 401,
    { "WWW-Authenticate": nutritionAuthenticateChallenge(scope, error) });
}

export function nutritionErrorResponse(error: unknown): Response {
  if (error instanceof NutritionSecurityError) {
    const headers = new Headers();
    if (error.status === 401 || error.code === "insufficient_scope") {
      headers.set("WWW-Authenticate", nutritionAuthenticateChallenge(error.scope ?? "nutrition:read", error.code === "insufficient_scope" ? "insufficient_scope" : "invalid_token"));
    }
    if (error.retryAfter !== undefined) headers.set("Retry-After", String(error.retryAfter));
    return nutritionJson({ error: error.code, error_description: error.description, guidance: nutritionErrorGuidance(error.status) }, error.status, headers);
  }
  // DB exceptions and stack traces can contain connection details. Never serialize/log them.
  return nutritionJson({ error: "server_error", error_description: "Hệ thống tạm thời chưa xử lý được yêu cầu.", guidance: nutritionErrorGuidance(503) }, 503);
}

export async function getNutritionIdentity(request: Request, requiredScope: string): Promise<NutritionIdentity> {
  validateNutritionOrigin(request);
  const scopes = parseNutritionScopes(requiredScope);
  const authorization = request.headers.get("authorization") ?? "";
  if (/^Bearer ng_/i.test(authorization)) {
    await enforceNutritionRateLimit("nutrition-guest-auth:global", { limit: 600, windowSeconds: 60 });
    const identity = await guestSessionIdentity(authorization.slice(7));
    if (scopes.some(scope => !identity.scopes.includes(scope))) throw new NutritionSecurityError("guest_account_required", 403, "Phiên tạm chỉ tra kho chung, tính và xuất file; lưu/mở bản riêng cần kết nối tài khoản.");
    await enforceNutritionRateLimit(`nutrition-guest:${identity.userId}`, { limit: 30, windowSeconds: 60 });
    return identity;
  }
  if (!/^Bearer [A-Za-z0-9_-]{43}$/i.test(authorization)) {
    throw new NutritionSecurityError("invalid_token", 401, "Thiếu access token hợp lệ.", scopes.join(" "));
  }
  // Reject floods before the token lookup. Untrusted forwarding headers cannot mint
  // arbitrary buckets; behind Caddy add a coarse per-IP budget, then principal budgets.
  await enforceNutritionRateLimit("nutrition-bearer:global", { limit: 1200, windowSeconds: 60 });
  if (process.env.NUTRITION_TRUST_PROXY === "1") {
    await enforceNutritionRateLimit(`nutrition-bearer:anonymous:${nutritionAnonymousKey(request)}`, { limit: 120, windowSeconds: 60 });
  }
  const token = await prisma.nutritionOAuthToken.findUnique({
    where: { accessHash: hashNutritionToken(authorization.slice(7)) },
    include: { client: { select: { disabledAt: true, expiresAt: true, ownerId: true } }, user: { select: { disabledAt: true } } },
  });
  const now = new Date();
  if (!token || token.revokedAt || token.accessExpiresAt <= now || token.client.disabledAt || token.client.expiresAt <= now || token.user.disabledAt || (token.client.ownerId && token.client.ownerId !== token.userId) ||
    token.issuer !== getNutritionPublicUrl() || token.audience !== getNutritionResourceUrl()) {
    throw new NutritionSecurityError("invalid_token", 401, "Access token hết hạn hoặc không dành cho hệ thống này.", scopes.join(" "));
  }
  if (scopes.some(scope => !token.scopes.includes(scope))) throw new NutritionSecurityError("insufficient_scope", 403, "Cần cấp thêm quyền cho thao tác này.", scopes.join(" "));
  await enforceNutritionRateLimit(`nutrition-rpc:user:${token.userId}`, { limit: 120, windowSeconds: 60 });
  await enforceNutritionRateLimit(`nutrition-rpc:client:${token.clientId}`, { limit: 600, windowSeconds: 60 });
  return { userId: token.userId, clientId: token.clientId, scopes: token.scopes, familyId: token.familyId };
}

export async function consumeNutritionRateLimit(key: string, policy: NutritionRatePolicy): Promise<{ allowed: boolean; retryAfter: number }> {
  if (!key || key.length > 512 || !Number.isInteger(policy.limit) || policy.limit < 1 || policy.limit > 1_000_000 ||
    !Number.isInteger(policy.windowSeconds) || policy.windowSeconds < 1 || policy.windowSeconds > 86400) throw new NutritionSecurityError("server_error", 503);
  const storedKey = hashNutritionToken(`${key}:${policy.limit}:${policy.windowSeconds}`);
  // A single atomic UPSERT bounds the counter at limit+1. DB time avoids worker clock drift;
  // one persistent key is reused between windows, rather than adding a row per request/window.
  const rows = await prisma.$queryRaw<{ count: number; retryAfter: number }[]>`
    WITH boundary AS (
      SELECT to_timestamp(floor(extract(epoch FROM CURRENT_TIMESTAMP) / ${policy.windowSeconds}) * ${policy.windowSeconds}) AT TIME ZONE 'UTC' AS starts
    )
    INSERT INTO "nutrition_api_windows" ("key", "count", "windowStart", "expiresAt")
    SELECT ${storedKey}, 1, starts, starts + make_interval(secs => ${policy.windowSeconds}) FROM boundary
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "nutrition_api_windows"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN 1 ELSE LEAST("nutrition_api_windows"."count" + 1, ${policy.limit + 1}) END,
      "windowStart" = CASE WHEN "nutrition_api_windows"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN EXCLUDED."windowStart" ELSE "nutrition_api_windows"."windowStart" END,
      "expiresAt" = CASE WHEN "nutrition_api_windows"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN EXCLUDED."expiresAt" ELSE "nutrition_api_windows"."expiresAt" END
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')))))::int AS "retryAfter"
  `;
  if (!rows[0]) throw new NutritionSecurityError("server_error", 503);
  return { allowed: rows[0].count <= policy.limit, retryAfter: rows[0].retryAfter };
}

export async function enforceNutritionRateLimit(key: string, policy: NutritionRatePolicy): Promise<void> {
  const result = await consumeNutritionRateLimit(key, policy);
  if (!result.allowed) throw new NutritionSecurityError("rate_limited", 429, "Đã đạt hạn mức. Vui lòng thử lại sau.", undefined, result.retryAfter);
}

export function nutritionAnonymousKey(request: Request): string {
  // Only enable behind the documented trusted Caddy reverse proxy; never trust arbitrary
  // forwarding headers on a directly exposed Next server. Hash rather than retain raw IP.
  const trusted = process.env.NUTRITION_TRUST_PROXY === "1";
  const ip = trusted ? (request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown") : "untrusted";
  return hashNutritionToken(ip.slice(0, 100));
}
