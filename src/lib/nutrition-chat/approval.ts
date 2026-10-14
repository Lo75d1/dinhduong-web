import { createHmac, timingSafeEqual } from "node:crypto";
import { NutritionInputError } from "./validation";
import type { NutritionIdentity } from "./contracts";

type Approval = { v: 1; purpose: string; key: string; userId: string; clientId: string; exp: number };
function key() { const secret = process.env.APP_SECRET; if (!secret || secret.length < 32) throw new NutritionInputError("Máy chủ chưa cấu hình APP_SECRET đủ mạnh cho kết nối hội thoại.", "configuration", 503); return secret; }
export function createNutritionTicket(purpose: string, value: string, identity: NutritionIdentity, seconds = 600): string {
  const payload: Approval = { v: 1, purpose, key: value, userId: identity.userId, clientId: identity.clientId, exp: Math.floor(Date.now() / 1000) + seconds };
  const text = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", key()).update(`nutrition-chat-v1.${text}`).digest("base64url");
  return `${text}.${signature}`;
}
export function readNutritionTicket(token: unknown, purpose: string): Approval {
  if (typeof token !== "string" || token.length > 2000) throw new NutritionInputError("Thiếu mã xác nhận hoặc mã không hợp lệ.", "confirmationToken", 409);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new NutritionInputError("Mã xác nhận không hợp lệ.", "confirmationToken", 409);
  const expected = createHmac("sha256", key()).update(`nutrition-chat-v1.${payload}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new NutritionInputError("Mã xác nhận không hợp lệ.", "confirmationToken", 409);
  let p: Approval;
  try { p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Approval; } catch { throw new NutritionInputError("Mã xác nhận không đọc được.", "confirmationToken", 409); }
  if (p.v !== 1 || p.purpose !== purpose || typeof p.exp !== "number" || p.exp <= Math.floor(Date.now() / 1000) || typeof p.key !== "string" || typeof p.userId !== "string" || typeof p.clientId !== "string") throw new NutritionInputError("Mã xác nhận hết hạn hoặc sai mục đích; chuẩn bị bản nháp mới.", "confirmationToken", 409);
  return p;
}
export function verifyNutritionTicket(token: unknown, purpose: string, value: string, identity: NutritionIdentity) {
  const p = readNutritionTicket(token, purpose);
  if (p.key !== value || p.userId !== identity.userId || p.clientId !== identity.clientId) throw new NutritionInputError("Đầu vào/nguồn hoặc tài khoản đã thay đổi; cần xem và chốt bản nháp mới.", "confirmationToken", 409);
}
