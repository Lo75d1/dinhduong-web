import "server-only";
import { cookies } from "next/headers";
import { getSessionUser, requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NutritionOAuthClient } from "@/generated/prisma/client";
import { recordNutritionConnection } from "./connection-stats";
import {
  ACCESS_SECONDS, CLIENT_SECONDS, CONSENT_COOKIE, INTERACTION_SECONDS, NUTRITION_SCOPES, REFRESH_SECONDS,
  consentCsrf, connectionCsrf, equalSecret, getConsentSecret, getNutritionPublicUrl, getNutritionResourceUrl, hashNutritionToken,
  NutritionSecurityError, oauthAuthorizationRedirect, oneParam, parseNutritionScopes, randomNutritionToken,
  readConsentInteraction, registrationInput, signConsentInteraction, validateConsentCsrf,
  validatePkceChallenge, validateRedirectUri, validateResource, validateConnectionCsrf, verifyPkce, type ConsentInteraction,
  validateNutritionFormOrigin,
} from "./oauth-validation";
import {
  enforceNutritionRateLimit, NUTRITION_NO_STORE_HEADERS, nutritionAnonymousKey, nutritionErrorResponse,
  nutritionJson, readNutritionForm, readNutritionJson, validateNutritionOrigin,
} from "./security";

const CODE_SECONDS = 120;

export function nutritionAuthorizationMetadata() {
  const base = getNutritionPublicUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/nutrition/v1/oauth/authorize`,
    token_endpoint: `${base}/api/nutrition/v1/oauth/token`,
    registration_endpoint: `${base}/api/nutrition/v1/oauth/register`,
    revocation_endpoint: `${base}/api/nutrition/v1/oauth/revoke`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [...NUTRITION_SCOPES],
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: false,
  };
}

export function nutritionProtectedResourceMetadata() {
  return {
    resource: getNutritionResourceUrl(), authorization_servers: [getNutritionPublicUrl()],
    scopes_supported: [...NUTRITION_SCOPES], bearer_methods_supported: ["header"],
    resource_name: "Dinh dưỡng 2598", resource_documentation: `${getNutritionPublicUrl()}/ket-noi-ai`,
  };
}

async function anonymousBudget(request: Request, action: string, limit: number) {
  // Global budget first prevents unbounded unauthenticated attacker-selected keys.
  await enforceNutritionRateLimit(`oauth:${action}:global`, { limit: limit * 20, windowSeconds: 3600 });
  await enforceNutritionRateLimit(`oauth:${action}:anonymous:${nutritionAnonymousKey(request)}`, { limit, windowSeconds: 3600 });
}

export async function registerNutritionClient(request: Request): Promise<Response> {
  validateNutritionOrigin(request);
  getConsentSecret(); // Do not register unusable clients before consent configuration is ready.
  await anonymousBudget(request, "register", 20);
  await enforceNutritionRateLimit("oauth:register:daily", { limit: 200, windowSeconds: 86400 });
  const input = registrationInput(await readNutritionJson(request, 8192));
  const clientId = `nc_${randomNutritionToken()}`;
  const secret = input.authMethod === "none" ? undefined : randomNutritionToken();
  const client = await prisma.$transaction(async tx => {
    // Serializes the cap across VPS processes. No outbound metadata URL fetching.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('nutrition-dcr-cap', 0))::text`;
    const now = new Date();
    const count = await tx.nutritionOAuthClient.count({ where: { expiresAt: { gt: now }, disabledAt: null } });
    if (count >= 2000) throw new NutritionSecurityError("temporarily_unavailable", 503, "Đã đạt giới hạn đăng ký ứng dụng; cần quản trị viên kiểm tra.");
    return tx.nutritionOAuthClient.create({ data: {
      id: clientId, ...input, secretHash: secret ? hashNutritionToken(secret) : null,
      expiresAt: new Date(now.getTime() + CLIENT_SECONDS * 1000),
    } });
  }, { maxWait: 3000, timeout: 5000 });
  return nutritionJson({
    client_id: client.id, client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    client_name: client.name, redirect_uris: client.redirectUris, token_endpoint_auth_method: client.authMethod,
    grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], scope: client.scopes.join(" "),
    // Registration has an inactivity expiry and can be renewed on a valid grant;
    // the secret has no separate fixed expiry. A disabled/expired client still fails auth.
    ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
  }, 201);
}

async function registeredClient(clientId: string): Promise<NutritionOAuthClient> {
  if (!/^nc_[A-Za-z0-9_-]{43}$/.test(clientId)) throw new NutritionSecurityError("invalid_client", 401, "Ứng dụng chưa được đăng ký.");
  const client = await prisma.nutritionOAuthClient.findUnique({ where: { id: clientId } });
  if (!client || client.disabledAt || client.expiresAt <= new Date()) throw new NutritionSecurityError("invalid_client", 401, "Đăng ký ứng dụng không còn hiệu lực.");
  return client;
}

export async function beginNutritionAuthorization(request: Request): Promise<Response> {
  await anonymousBudget(request, "authorize", 120);
  const params = new URL(request.url).searchParams;
  const clientId = oneParam(params, "client_id", true, 128)!;
  const client = await registeredClient(clientId);
  const redirectUri = validateRedirectUri(oneParam(params, "redirect_uri")!, client.redirectUris);
  const state = oneParam(params, "state", true, 256)!;
  const interaction: ConsentInteraction = {
    interactionId: randomNutritionToken(), clientId, redirectUri, state,
    codeChallenge: "", scopes: [], issuer: getNutritionPublicUrl(), audience: getNutritionResourceUrl(),
    exp: Date.now() + INTERACTION_SECONDS * 1000,
  };
  try {
    if (oneParam(params, "response_type") !== "code") throw new NutritionSecurityError("unsupported_response_type");
    if (oneParam(params, "response_mode", false) && params.get("response_mode") !== "query") throw new NutritionSecurityError("invalid_request");
    interaction.codeChallenge = validatePkceChallenge(oneParam(params, "code_challenge")!, oneParam(params, "code_challenge_method"));
    interaction.scopes = parseNutritionScopes(oneParam(params, "scope", false, 128), client.scopes);
    validateResource(oneParam(params, "resource", true, 1024));
    getConsentSecret();
  } catch (error) {
    if (!(error instanceof NutritionSecurityError) || error.status >= 500) throw error;
    // Only redirect errors once callback and state are safely validated; echo issuer on errors.
    return new Response(null, { status: 302, headers: { ...NUTRITION_NO_STORE_HEADERS, Location: oauthAuthorizationRedirect(interaction, { error: error.code, error_description: error.description }) } });
  }
  await enforceNutritionRateLimit(`oauth:authorize:client:${client.id}`, { limit: 300, windowSeconds: 3600 });
  (await cookies()).set(CONSENT_COOKIE, signConsentInteraction(interaction), {
    httpOnly: true, sameSite: "lax", secure: new URL(getNutritionPublicUrl()).protocol === "https:",
    path: "/", maxAge: INTERACTION_SECONDS,
  });
  return new Response(null, { status: 302, headers: { ...NUTRITION_NO_STORE_HEADERS, Location: `${getNutritionPublicUrl()}/ket-noi-ai/authorize` } });
}

export async function nutritionConsentPageData() {
  const interaction = readConsentInteraction((await cookies()).get(CONSENT_COOKIE)?.value);
  const client = await registeredClient(interaction.clientId);
  validateRedirectUri(interaction.redirectUri, client.redirectUris);
  const user = await getSessionUser();
  if (user && client.ownerId && client.ownerId !== user.id) throw new NutritionSecurityError("access_denied", 403, "Cấu hình thủ công thuộc tài khoản khác. Đăng nhập đúng tài khoản đã tạo cấu hình.");
  return { client, interaction, user, csrf: user ? consentCsrf(interaction, user.id) : null };
}

export async function confirmNutritionAuthorization(request: Request): Promise<Response> {
  validateNutritionFormOrigin(request);
  const user = await requireSessionUser().catch(() => { throw new NutritionSecurityError("login_required", 401, "Đăng nhập trước khi xác nhận kết nối."); });
  await enforceNutritionRateLimit(`oauth:consent:user:${user.id}`, { limit: 30, windowSeconds: 3600 });
  const params = await readNutritionForm(request);
  const interaction = readConsentInteraction((await cookies()).get(CONSENT_COOKIE)?.value);
  validateConsentCsrf(interaction, user.id, oneParam(params, "csrf"));
  const client = await registeredClient(interaction.clientId);
  validateRedirectUri(interaction.redirectUri, client.redirectUris);
  parseNutritionScopes(interaction.scopes.join(" "), client.scopes);
  const decision = oneParam(params, "decision");
  if (decision !== "approve" && decision !== "deny") throw new NutritionSecurityError("invalid_request");
  let location: string;
  if (decision === "deny") {
    location = oauthAuthorizationRedirect(interaction, { error: "access_denied", error_description: "Người dùng từ chối cấp quyền." });
  } else {
    const code = randomNutritionToken();
    try {
      await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'nutrition-user-grants:' + user.id}, 0))::text`;
      const currentUser = await getSessionUser(tx);
      const currentClient = await tx.nutritionOAuthClient.findUnique({ where: { id: client.id } });
      if (!currentUser || currentUser.id !== user.id || !currentClient || currentClient.disabledAt || currentClient.expiresAt <= new Date() || (currentClient.ownerId && currentClient.ownerId !== user.id)) throw new NutritionSecurityError("access_denied", 403, "Đăng nhập đúng tài khoản và kết nối lại ứng dụng.");
      await tx.nutritionOAuthCode.create({ data: {
        codeHash: hashNutritionToken(code), interactionId: interaction.interactionId, userId: user.id,
        clientId: client.id, redirectUri: interaction.redirectUri, codeChallenge: interaction.codeChallenge,
        scopes: interaction.scopes, issuer: interaction.issuer, audience: interaction.audience,
        expiresAt: new Date(Date.now() + CODE_SECONDS * 1000),
      } });
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new NutritionSecurityError("invalid_request", 400, "Phiên xác nhận đã được sử dụng. Kết nối lại từ ứng dụng AI.");
      throw error;
    }
    location = oauthAuthorizationRedirect(interaction, { code });
  }
  (await cookies()).set(CONSENT_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: new URL(getNutritionPublicUrl()).protocol === "https:", path: "/", maxAge: 0 });
  return new Response(null, { status: 303, headers: { ...NUTRITION_NO_STORE_HEADERS, Location: location } });
}

async function authenticateTokenClient(request: Request, params: URLSearchParams): Promise<NutritionOAuthClient> {
  const authorization = request.headers.get("authorization");
  const bodyId = oneParam(params, "client_id", false, 128);
  const bodySecret = oneParam(params, "client_secret", false, 128);
  let clientId = bodyId;
  let secret = bodySecret;
  let authMethod = bodySecret === undefined ? "none" : "client_secret_post";
  if (authorization) {
    if (!/^Basic [A-Za-z0-9+/]+=*$/.test(authorization) || authorization.length > 512 || bodySecret !== undefined) throw new NutritionSecurityError("invalid_client", 401);
    let decoded: string;
    try { decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8"); } catch { throw new NutritionSecurityError("invalid_client", 401); }
    const colon = decoded.indexOf(":");
    if (colon < 1) throw new NutritionSecurityError("invalid_client", 401);
    try { clientId = decodeURIComponent(decoded.slice(0, colon)); secret = decodeURIComponent(decoded.slice(colon + 1)); }
    catch { throw new NutritionSecurityError("invalid_client", 401); }
    if (bodyId !== undefined && bodyId !== clientId) throw new NutritionSecurityError("invalid_client", 401);
    authMethod = "client_secret_basic";
  }
  const client = await registeredClient(clientId ?? "");
  // Predefined/manual clients do not get a DCR method hint. Hosts may choose
  // Basic (MCP SDK default) or POST from the advertised metadata; both still
  // require the same secret. Dynamically registered clients keep their exact method.
  const manualSecretMethod = !!client.ownerId && !!client.secretHash && ["client_secret_basic", "client_secret_post"].includes(authMethod);
  if ((!manualSecretMethod && client.authMethod !== authMethod) || (authMethod !== "none" && (!secret || !client.secretHash || !equalSecret(hashNutritionToken(secret), client.secretHash)))) throw new NutritionSecurityError("invalid_client", 401);
  await enforceNutritionRateLimit(`oauth:token:client:${client.id}`, { limit: 300, windowSeconds: 3600 });
  return client;
}

function tokenSecrets() { return { access: randomNutritionToken(), refresh: randomNutritionToken() }; }
function tokenReply(secrets: ReturnType<typeof tokenSecrets>, scopes: string[], expiresAt: Date) {
  return nutritionJson({
    access_token: secrets.access, token_type: "Bearer", expires_in: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    refresh_token: secrets.refresh, scope: scopes.join(" "), resource: getNutritionResourceUrl(),
  });
}

export async function exchangeNutritionToken(request: Request): Promise<Response> {
  validateNutritionOrigin(request);
  await anonymousBudget(request, "token", 300);
  const params = await readNutritionForm(request);
  const client = await authenticateTokenClient(request, params);
  const grant = oneParam(params, "grant_type");
  validateResource(oneParam(params, "resource", true, 1024));
  const secrets = tokenSecrets();
  const accessExpiresAt = new Date(Date.now() + ACCESS_SECONDS * 1000);
  if (grant === "authorization_code") {
    const rawCode = oneParam(params, "code", true, 128)!;
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawCode)) throw new NutritionSecurityError("invalid_grant");
    const redirectUri = validateRedirectUri(oneParam(params, "redirect_uri")!, client.redirectUris);
    const verifier = oneParam(params, "code_verifier", true, 128);
    const result = await prisma.$transaction(async tx => {
      const found = await tx.nutritionOAuthCode.findUnique({ where: { codeHash: hashNutritionToken(rawCode) } });
      if (!found) return null;
      // Replays, refresh rotation and revocation share the family lock. Otherwise a refresh
      // can insert a replacement after the replay's UPDATE snapshot and escape revocation.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${found.id}, 0))::text`;
      const code = await tx.nutritionOAuthCode.findUnique({ where: { codeHash: hashNutritionToken(rawCode) } });
      const now = new Date();
      if (!code || code.clientId !== client.id || code.redirectUri !== redirectUri || code.issuer !== getNutritionPublicUrl() ||
        code.audience !== getNutritionResourceUrl() || !verifyPkce(verifier, code.codeChallenge)) return null;
      if (code.usedAt) {
        await tx.nutritionOAuthToken.updateMany({ where: { familyId: code.id, revokedAt: null }, data: { revokedAt: now } });
        return null; // Commit replay revocation before returning invalid_grant.
      }
      if (code.expiresAt <= now) return null;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'nutrition-user-grants:' + code.userId}, 0))::text`;
      const currentUser = await tx.user.findUnique({ where: { id: code.userId } });
      const currentClient = await tx.nutritionOAuthClient.findUnique({ where: { id: client.id } });
      // Recheck after the shared user lock: account/password revocation may have
      // deleted this code while the request was waiting.
      const stillPresent = await tx.nutritionOAuthCode.findUnique({ where: { id: code.id } });
      if (!currentUser || currentUser.disabledAt || !stillPresent || !currentClient || currentClient.disabledAt || currentClient.expiresAt <= now || (currentClient.ownerId && currentClient.ownerId !== code.userId)) return null;
      const active = await tx.nutritionOAuthToken.count({ where: { userId: code.userId, rotatedAt: null, revokedAt: null, refreshExpiresAt: { gt: now } } });
      if (active >= 30) throw new NutritionSecurityError("temporarily_unavailable", 503, "Bạn đã có 30 phiên kết nối. Thu hồi các phiên không còn dùng trước khi kết nối thêm.");
      const consumed = await tx.nutritionOAuthCode.updateMany({ where: { id: code.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (consumed.count !== 1) {
        await tx.nutritionOAuthToken.updateMany({ where: { familyId: code.id, revokedAt: null }, data: { revokedAt: now } });
        return null;
      }
      const token = await tx.nutritionOAuthToken.create({ data: {
        userId: code.userId, clientId: client.id, familyId: code.id,
        accessHash: hashNutritionToken(secrets.access), refreshHash: hashNutritionToken(secrets.refresh),
        scopes: code.scopes, issuer: code.issuer, audience: code.audience, accessExpiresAt,
        refreshExpiresAt: new Date(now.getTime() + REFRESH_SECONDS * 1000),
      } });
      await tx.nutritionOAuthClient.update({ where: { id: client.id }, data: { expiresAt: new Date(now.getTime() + CLIENT_SECONDS * 1000) } });
      await recordNutritionConnection(tx, code.redirectUri);
      return token;
    }, { maxWait: 3000, timeout: 5000 });
    if (!result) throw new NutritionSecurityError("invalid_grant", 400, "Mã đã dùng, hết hạn hoặc không khớp PKCE.");
    return tokenReply(secrets, result.scopes, accessExpiresAt);
  }
  if (grant === "refresh_token") {
    const rawRefresh = oneParam(params, "refresh_token", true, 128)!;
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawRefresh)) throw new NutritionSecurityError("invalid_grant");
    const tokenHash = hashNutritionToken(rawRefresh);
    const existing = await prisma.nutritionOAuthToken.findUnique({ where: { refreshHash: tokenHash } });
    if (!existing || existing.clientId !== client.id) throw new NutritionSecurityError("invalid_grant");
    await enforceNutritionRateLimit(`oauth:refresh:user:${existing.userId}`, { limit: 300, windowSeconds: 3600 });
    const requested = oneParam(params, "scope", false, 128);
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${existing.familyId}, 0))::text`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'nutrition-user-grants:' + existing.userId}, 0))::text`;
      const token = await tx.nutritionOAuthToken.findUnique({ where: { refreshHash: tokenHash } });
      const now = new Date();
      const currentUser = await tx.user.findUnique({ where: { id: existing.userId } });
      const currentClient = await tx.nutritionOAuthClient.findUnique({ where: { id: client.id } });
      if (!currentUser || currentUser.disabledAt || !currentClient || currentClient.disabledAt || currentClient.expiresAt <= now || (currentClient.ownerId && currentClient.ownerId !== existing.userId)) return null;
      if (!token || token.revokedAt || token.refreshExpiresAt <= now || token.issuer !== getNutritionPublicUrl() || token.audience !== getNutritionResourceUrl()) return null;
      if (token.rotatedAt) {
        await tx.nutritionOAuthToken.updateMany({ where: { familyId: token.familyId, revokedAt: null }, data: { revokedAt: now } });
        return null;
      }
      const scopes = requested === undefined ? token.scopes : parseNutritionScopes(requested, token.scopes);
      const consumed = await tx.nutritionOAuthToken.updateMany({ where: { id: token.id, rotatedAt: null, revokedAt: null, refreshExpiresAt: { gt: now } }, data: { rotatedAt: now } });
      if (consumed.count !== 1) return null;
      const replacement = await tx.nutritionOAuthToken.create({ data: {
        userId: token.userId, clientId: token.clientId, familyId: token.familyId,
        accessHash: hashNutritionToken(secrets.access), refreshHash: hashNutritionToken(secrets.refresh), scopes,
        issuer: token.issuer, audience: token.audience, accessExpiresAt, refreshExpiresAt: token.refreshExpiresAt,
      } });
      await tx.nutritionOAuthClient.update({ where: { id: client.id }, data: { expiresAt: new Date(now.getTime() + CLIENT_SECONDS * 1000) } });
      return replacement;
    }, { maxWait: 3000, timeout: 5000 });
    if (!result) throw new NutritionSecurityError("invalid_grant", 400, "Refresh token đã dùng hoặc hết hạn. Kết nối lại ứng dụng.");
    return tokenReply(secrets, result.scopes, accessExpiresAt);
  }
  throw new NutritionSecurityError("unsupported_grant_type");
}

export async function revokeNutritionToken(request: Request): Promise<Response> {
  validateNutritionOrigin(request);
  await anonymousBudget(request, "revoke", 120);
  const params = await readNutritionForm(request);
  const client = await authenticateTokenClient(request, params);
  const rawToken = oneParam(params, "token", true, 128)!;
  const hash = hashNutritionToken(rawToken);
  const token = await prisma.nutritionOAuthToken.findFirst({ where: { clientId: client.id, OR: [{ accessHash: hash }, { refreshHash: hash }] } });
  if (token) {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${token.familyId}, 0))::text`;
      await tx.nutritionOAuthToken.updateMany({ where: { familyId: token.familyId, clientId: client.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }, { maxWait: 3000, timeout: 5000 });
  }
  return new Response(null, { status: 200, headers: NUTRITION_NO_STORE_HEADERS }); // RFC7009: same response for unknown tokens.
}

export async function nutritionOAuthHandler(action: (request: Request) => Promise<Response>, request: Request) {
  try { return await action(request); } catch (error) {
    if (!(error instanceof NutritionSecurityError)) return nutritionErrorResponse(error);
    const headers = new Headers();
    if (error.code === "invalid_client" && request.headers.get("authorization")?.startsWith("Basic ")) {
      headers.set("WWW-Authenticate", 'Basic realm="nutrition-oauth"');
    }
    if (error.retryAfter !== undefined) headers.set("Retry-After", String(error.retryAfter));
    return nutritionJson({ error: error.code, error_description: error.description }, error.status, headers);
  }
}

export async function nutritionConnectionsPageData() {
  const user = await requireSessionUser().catch(() => { throw new NutritionSecurityError("login_required", 401, "Đăng nhập để quản lý kết nối."); });
  const tokens = await prisma.nutritionOAuthToken.findMany({
    where: { userId: user.id, rotatedAt: null, revokedAt: null, refreshExpiresAt: { gt: new Date() } },
    select: { familyId: true, scopes: true, createdAt: true, refreshExpiresAt: true, client: { select: { name: true, redirectUris: true } } },
    orderBy: { createdAt: "desc" }, take: 30,
  });
  return { user: { displayName: user.displayName }, connections: tokens, csrf: connectionCsrf(user.id) };
}

export async function listNutritionConnections(): Promise<Response> {
  return nutritionJson(await nutritionConnectionsPageData());
}

export async function revokeNutritionConnection(request: Request): Promise<Response> {
  validateNutritionFormOrigin(request);
  const user = await requireSessionUser().catch(() => { throw new NutritionSecurityError("login_required", 401); });
  await enforceNutritionRateLimit(`oauth:manage:user:${user.id}`, { limit: 60, windowSeconds: 3600 });
  const params = await readNutritionForm(request);
  validateConnectionCsrf(user.id, oneParam(params, "csrf"));
  const familyId = oneParam(params, "family_id", true, 128)!;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${familyId}, 0))::text`;
    await tx.nutritionOAuthToken.updateMany({ where: { familyId, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  }, { maxWait: 3000, timeout: 5000 });
  return new Response(null, { status: 303, headers: { ...NUTRITION_NO_STORE_HEADERS, Location: `${getNutritionPublicUrl()}/ket-noi-ai/authorize/connections` } });
}

export { cleanupNutritionOAuth } from "./maintenance";
