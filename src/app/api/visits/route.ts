import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.slice(0, 180) : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : "";
  if (!path.startsWith("/") || !sessionId) return new Response(null, { status: 204 });
  try {
    await prisma.pageVisit.create({ data: { path, sessionId } });
  } catch {
    // Visit collection must never interfere with clinical use of the website.
  }
  return new Response(null, { status: 204 });
}
