import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { NutritionIdentity } from "./contracts";
import { getNutritionPublicUrl, NutritionSecurityError } from "./oauth-validation";

export const GUEST_SESSION_SECONDS = 1800;
export const GUEST_SCOPES = ["nutrition:read", "nutrition:calculate", "nutrition:export"];
const directory = join(tmpdir(), "dinhduong2598-nutrition-chat-v1", "guest-sessions");
const invalid = () => new NutritionSecurityError("invalid_token", 401, "Phiên tạm hết hạn hoặc đã kết thúc; tạo phiên mới, giữ lại đầu vào và duyệt lại.");
function path(token: string) {
  if (!/^ng_[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
  return join(directory, `${createHash("sha256").update(token).digest("hex")}.json`);
}
type Session = { id: string; expiresAt: string; issuer: string };
// The existing private temporary volume holds only a token hash and expiry, never
// menus, health information or account rows. Restarting a worker preserves revocation.
export async function cleanupGuestSessions() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  for (const name of (await readdir(directory)).filter(n => /^[a-f0-9]{64}\.json$/.test(n))) {
    const target = join(directory, name);
    const session = await readFile(target, "utf8").then(text => JSON.parse(text) as Session).catch(() => null);
    if (!session || !(Date.parse(session.expiresAt) > Date.now())) await unlink(target).catch(() => undefined);
  }
}
export async function createGuestSession() {
  await cleanupGuestSessions();
  const accessToken = `ng_${randomBytes(32).toString("base64url")}`;
  const session: Session = { id: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + GUEST_SESSION_SECONDS * 1000).toISOString(), issuer: getNutritionPublicUrl() };
  await writeFile(path(accessToken), JSON.stringify(session), { flag: "wx", mode: 0o600 });
  return { accessToken, tokenType: "Bearer", expiresAt: session.expiresAt, expiresIn: GUEST_SESSION_SECONDS, scopes: GUEST_SCOPES, accountRequired: false, persistence: "none" };
}
export async function guestSessionIdentity(token: string): Promise<NutritionIdentity> {
  const session = await readFile(path(token), "utf8").then(text => JSON.parse(text) as Session).catch(() => null);
  const expires = Date.parse(session?.expiresAt ?? "");
  if (!session || !/^[a-f0-9]{32}$/.test(session.id) || session.issuer !== getNutritionPublicUrl() || !(expires > Date.now()) || expires > Date.now() + GUEST_SESSION_SECONDS * 1000 + 1000) throw invalid();
  return { userId: `guest-${session.id}`, clientId: "guest-session", kind: "guest", expiresAt: session.expiresAt, scopes: [...GUEST_SCOPES] };
}
export async function revokeGuestSession(token: string) {
  await guestSessionIdentity(token);
  await unlink(path(token));
}
