import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const SESSION_COOKIE = "dinhduong_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type SessionUser = { id: string; email: string; displayName: string; role: string };

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && value.length <= 256;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = scryptSync(password, Buffer.from(saltText, "base64url"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function createSession(userId: string, request?: Request, expectedPasswordHash?: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'nutrition-user-grants:' + userId}, 0))::text`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.disabledAt || (expectedPasswordHash && user.passwordHash !== expectedPasswordHash)) throw new Error("UNAUTHORIZED");
    await tx.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
    await tx.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt, userAgent: request?.headers.get("user-agent")?.slice(0, 250) || null } });
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  store.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSessionUser(database: Pick<Prisma.TransactionClient, "session"> = prisma): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await database.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { select: { id: true, email: true, displayName: true, role: true, disabledAt: true } } },
  });
  if (!session || session.expiresAt <= new Date() || session.user.disabledAt) return null;
  const { id, email, displayName, role } = session.user;
  return { id, email, displayName, role };
}

export async function requireSessionUser(database: Pick<Prisma.TransactionClient, "session"> = prisma): Promise<SessionUser> {
  const user = await getSessionUser(database);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Bạn cần đăng nhập để thực hiện thao tác này." }, { status: 401 });
}
