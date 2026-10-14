import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const NUTRITION_SCOPES = ["nutrition:read", "nutrition:calculate", "nutrition:write", "nutrition:export"] as const;
export const DEFAULT_NUTRITION_SCOPES = ["nutrition:read", "nutrition:calculate", "nutrition:export"];
export const CONSENT_COOKIE = "nutrition_oauth_consent";
export const INTERACTION_SECONDS = 600;
export const ACCESS_SECONDS = 900;
export const REFRESH_SECONDS = 30 * 24 * 60 * 60;
export const CLIENT_SECONDS = 30 * 24 * 60 * 60;

export class NutritionSecurityError extends Error {
  constructor(public code: string, public status = 400, public description = "Yêu cầu không hợp lệ.", public scope?: string, public retryAfter?: number) {
    super(code);
    this.name = "NutritionSecurityError";
  }
}

export function getNutritionPublicUrl(): string {
  const value = process.env.NUTRITION_PUBLIC_URL?.trim() || "https://dinhduong2598.food";
  let url: URL;
  try { url = new URL(value); } catch { throw new NutritionSecurityError("server_error", 503, "Cấu hình kết nối AI chưa sẵn sàng."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && loopback && url.protocol === "http:"))) {
    throw new NutritionSecurityError("server_error", 503, "Cấu hình URL công khai chưa hợp lệ.");
  }
  return url.origin;
}

export function getNutritionResourceUrl(): string { return `${getNutritionPublicUrl()}/api/nutrition/v1/mcp`; }
export function hashNutritionToken(value: string): string { return createHash("sha256").update(value).digest("base64url"); }
export function randomNutritionToken(): string { return randomBytes(32).toString("base64url"); }
export function equalSecret(actual: string, expected: string): boolean {
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getConsentSecret(): string {
  const value = process.env.APP_SECRET?.trim();
  if (!value || value.length < 32) throw new NutritionSecurityError("server_error", 503, "VPS cần cấu hình APP_SECRET đủ mạnh trước khi kết nối AI.");
  return value;
}

export const NUTRITION_PLATFORM_REDIRECTS = {
  chatgpt: "https://chatgpt.com/connector_platform_oauth_redirect",
  claude: "https://claude.ai/api/mcp/auth_callback",
} as const;

export function allowedNutritionRedirects(): string[] {
  const values: string[] = Object.values(NUTRITION_PLATFORM_REDIRECTS);
  if (process.env.NUTRITION_OAUTH_REDIRECT_URIS) {
    let parsed: unknown;
    try { parsed = JSON.parse(process.env.NUTRITION_OAUTH_REDIRECT_URIS); } catch { throw new NutritionSecurityError("server_error", 503, "Danh sách callback chưa hợp lệ."); }
    if (!Array.isArray(parsed) || parsed.length > 30 || parsed.some(v => typeof v !== "string" || !isHttpsRedirect(v))) {
      throw new NutritionSecurityError("server_error", 503, "Danh sách callback phải là các URL HTTPS chính xác.");
    }
    values.push(...parsed as string[]);
  }
  return [...new Set(values)];
}

export function isHttpsRedirect(value: string): boolean {
  if (value.length > 512 || /[\x00-\x20\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash && url.href === value &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch { return false; }
}

export function validateRedirectUri(value: string, registered?: readonly string[]): string {
  if (!isHttpsRedirect(value) || !allowedNutritionRedirects().includes(value) || (registered && !registered.includes(value))) {
    throw new NutritionSecurityError("invalid_redirect_uri", 400, "Callback chưa được đăng ký chính xác.");
  }
  return value;
}

export function parseNutritionScopes(value: string | undefined, allowed: readonly string[] = NUTRITION_SCOPES): string[] {
  if (value !== undefined && (value.length > 128 || /[^\x20-\x7e]/.test(value))) throw new NutritionSecurityError("invalid_scope");
  const defaults = DEFAULT_NUTRITION_SCOPES.filter(scope => allowed.includes(scope));
  const scopes = value === undefined ? (defaults.length ? defaults : [...allowed]) : [...new Set(value.split(" ").filter(Boolean))];
  if (!scopes.length || scopes.some(scope => !NUTRITION_SCOPES.includes(scope as typeof NUTRITION_SCOPES[number]) || !allowed.includes(scope))) {
    throw new NutritionSecurityError("invalid_scope", 400, "Quyền yêu cầu không được hỗ trợ.");
  }
  return scopes;
}

export function validateResource(value: string | undefined): string {
  const expected = getNutritionResourceUrl();
  if (value !== expected) throw new NutritionSecurityError("invalid_target", 400, "Resource phải khớp URL MCP đã công bố.");
  return expected;
}

export function oneParam(params: URLSearchParams, name: string, required = true, maxLength = 512): string | undefined {
  const values = params.getAll(name);
  if (values.length > 1 || (required && !values[0]) || (values[0] !== undefined && (values[0].length > maxLength || /[\x00-\x1f\x7f]/.test(values[0])))) {
    throw new NutritionSecurityError("invalid_request", 400, `Trường ${name} không hợp lệ.`);
  }
  return values[0];
}

export function validatePkceChallenge(value: string, method: string | undefined): string {
  if (method !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new NutritionSecurityError("invalid_request", 400, "Kết nối phải dùng PKCE S256.");
  return value;
}

export function verifyPkce(verifier: string | undefined, challenge: string): boolean {
  return !!verifier && /^[A-Za-z0-9._~-]{43,128}$/.test(verifier) && equalSecret(hashNutritionToken(verifier), challenge);
}

export type ConsentInteraction = {
  interactionId: string; clientId: string; redirectUri: string; codeChallenge: string;
  scopes: string[]; issuer: string; audience: string; state: string; exp: number;
};

function consentSignature(payload: string): string {
  return createHmac("sha256", getConsentSecret()).update(`nutrition-consent-v1:${payload}`).digest("base64url");
}

export function signConsentInteraction(interaction: ConsentInteraction): string {
  const payload = Buffer.from(JSON.stringify(interaction)).toString("base64url");
  return `${payload}.${consentSignature(payload)}`;
}

export function readConsentInteraction(value: string | undefined, now = Date.now()): ConsentInteraction {
  if (!value || value.length > 3800) throw new NutritionSecurityError("invalid_request", 400, "Phiên xác nhận không còn hợp lệ. Kết nối lại từ ứng dụng AI.");
  const [payload, signature, extra] = value.split(".");
  if (extra || !signature || !equalSecret(signature, consentSignature(payload))) throw new NutritionSecurityError("invalid_request");
  let data: ConsentInteraction;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw new NutritionSecurityError("invalid_request"); }
  if (!data || !Number.isFinite(data.exp) || data.exp <= now || data.exp > now + INTERACTION_SECONDS * 1000 ||
    !/^[A-Za-z0-9_-]{43}$/.test(data.interactionId) || typeof data.clientId !== "string" || data.clientId.length > 128 ||
    typeof data.state !== "string" || !data.state || data.state.length > 256 ||
    data.issuer !== getNutritionPublicUrl() || data.audience !== getNutritionResourceUrl() || !Array.isArray(data.scopes)) {
    throw new NutritionSecurityError("invalid_request", 400, "Phiên xác nhận đã hết hạn hoặc bị thay đổi.");
  }
  validateRedirectUri(data.redirectUri);
  validatePkceChallenge(data.codeChallenge, "S256");
  parseNutritionScopes(data.scopes.join(" "));
  return data;
}

export function consentCsrf(interaction: ConsentInteraction, userId: string): string {
  return createHmac("sha256", getConsentSecret()).update(`nutrition-csrf-v1:${interaction.interactionId}:${userId}`).digest("base64url");
}

export function validateConsentCsrf(interaction: ConsentInteraction, userId: string, csrf: string | undefined): void {
  if (!csrf || !equalSecret(csrf, consentCsrf(interaction, userId))) throw new NutritionSecurityError("invalid_request", 403, "Xác nhận bảo mật không hợp lệ.");
}

export function connectionCsrf(userId: string, hour = Math.floor(Date.now() / 3_600_000)): string {
  const mac = createHmac("sha256", getConsentSecret()).update(`nutrition-connections-v1:${userId}:${hour}`).digest("base64url");
  return `${hour}.${mac}`;
}

export function validateConnectionCsrf(userId: string, csrf: string | undefined): void {
  const current = Math.floor(Date.now() / 3_600_000);
  if (!csrf || ![current, current - 1].some(hour => equalSecret(csrf, connectionCsrf(userId, hour)))) {
    throw new NutritionSecurityError("invalid_request", 403, "Xác nhận bảo mật không hợp lệ. Tải lại trang quản lý kết nối.");
  }
}

export function oauthAuthorizationRedirect(interaction: ConsentInteraction, params: Record<string, string>): string {
  const url = new URL(validateRedirectUri(interaction.redirectUri));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("state", interaction.state);
  url.searchParams.set("iss", getNutritionPublicUrl());
  return url.href;
}

export function validateNutritionOrigin(request: Request, sameSiteOnly = false): void {
  const value = request.headers.get("origin");
  if (!value) {
    if (sameSiteOnly) throw new NutritionSecurityError("invalid_request", 403, "Thiếu nguồn xác nhận bảo mật.");
    return; // Server-to-server MCP requests have no browser Origin.
  }
  const allowed = [getNutritionPublicUrl()];
  if (!sameSiteOnly && process.env.NUTRITION_ALLOWED_ORIGINS) {
    for (const origin of process.env.NUTRITION_ALLOWED_ORIGINS.split(",").map(v => v.trim()).filter(Boolean)) {
      try {
        const url = new URL(origin);
        if (url.origin !== origin || url.protocol !== "https:") throw new Error("bad origin");
        allowed.push(origin);
      } catch { throw new NutritionSecurityError("server_error", 503, "Danh sách nguồn trình duyệt chưa hợp lệ."); }
    }
  }
  if (!allowed.includes(value)) throw new NutritionSecurityError("invalid_request", 403, "Nguồn trình duyệt không được phép.");
}

export function registrationInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new NutritionSecurityError("invalid_client_metadata");
  const data = input as Record<string, unknown>;
  if (typeof data.client_name !== "string" || !data.client_name.trim() || data.client_name.length > 100 || /[\x00-\x1f\x7f]/.test(data.client_name)) {
    throw new NutritionSecurityError("invalid_client_metadata", 400, "Tên ứng dụng phải có từ 1 đến 100 ký tự.");
  }
  if (!Array.isArray(data.redirect_uris) || !data.redirect_uris.length || data.redirect_uris.length > 5 || data.redirect_uris.some(uri => typeof uri !== "string")) {
    throw new NutritionSecurityError("invalid_redirect_uri");
  }
  const redirectUris = [...new Set((data.redirect_uris as string[]).map(uri => validateRedirectUri(uri)))];
  const authMethod = data.token_endpoint_auth_method ?? "client_secret_basic"; // RFC7591 default
  if (!["none", "client_secret_post", "client_secret_basic"].includes(authMethod as string)) throw new NutritionSecurityError("invalid_client_metadata");
  const arrayOf = (key: string, allowed: string[], fallback: string[]) => {
    const value = data[key] ?? fallback;
    if (!Array.isArray(value) || !value.length || value.length > allowed.length || value.some(v => typeof v !== "string" || !allowed.includes(v))) throw new NutritionSecurityError("invalid_client_metadata");
    return [...new Set(value as string[])];
  };
  const grants = arrayOf("grant_types", ["authorization_code", "refresh_token"], ["authorization_code", "refresh_token"]);
  if (!grants.includes("authorization_code")) throw new NutritionSecurityError("invalid_client_metadata");
  arrayOf("response_types", ["code"], ["code"]);
  if (data.scope !== undefined && typeof data.scope !== "string") throw new NutritionSecurityError("invalid_scope");
  const scopes = data.scope === undefined ? [...NUTRITION_SCOPES] : parseNutritionScopes(data.scope as string);
  // Ignore extension URL metadata. Never fetch client_uri/logo_uri/jwks_uri/SSRF input.
  return { name: data.client_name.trim(), redirectUris, authMethod: authMethod as string, scopes };
}
