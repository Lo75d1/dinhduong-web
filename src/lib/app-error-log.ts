import "server-only";

import { prisma } from "@/lib/prisma";

type Actor = { id?: string; email?: string } | null | undefined;

export function safeErrorSummary(error: unknown) {
  const value = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL REDACTED]")
    .replace(/AIza[\w-]{20,}/g, "[GEMINI_KEY REDACTED]")
    .replace(/(?:password|secret|token)=?[^\s,&]+/gi, "$1=[REDACTED]")
    .slice(0, 2000);
}

export async function logAppError(source: string, error: unknown, actor?: Actor) {
  const message = safeErrorSummary(error || "Unknown error");
  console.error(`[${source}]`, message);
  await prisma.appErrorLog.create({ data: { source: source.slice(0, 120), message, actorId: actor?.id || null, actorEmail: actor?.email || null } }).catch(() => undefined);
}
