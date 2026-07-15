import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const secret = process.env.APP_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("APP_SECRET_MISSING");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptGeminiKey(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptGeminiKey(value: string) {
  const [ivText, tagText, dataText] = value.split(".");
  if (!ivText || !tagText || !dataText) throw new Error("GEMINI_KEY_INVALID");
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText, "base64url")), decipher.final()]).toString("utf8");
}

export async function getGeminiConfig() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "public" }, select: { geminiKeyEncrypted: true, geminiModel: true, geminiEnabled: true } }).catch(() => null);
  if (settings?.geminiEnabled && settings.geminiKeyEncrypted) return { apiKey: decryptGeminiKey(settings.geminiKeyEncrypted), model: settings.geminiModel || "gemini-2.5-flash", source: "admin" as const };
  const envKey = process.env.GEMINI_API_KEY?.trim();
  return envKey ? { apiKey: envKey, model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash", source: "environment" as const } : null;
}

export function isAllowedModel(value: unknown): value is string {
  return typeof value === "string" && /^gemini-[a-z0-9.-]{3,80}$/i.test(value);
}
