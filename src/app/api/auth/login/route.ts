import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return Response.json({ error: "Email hoặc mật khẩu chưa đúng." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: "Email hoặc mật khẩu chưa đúng." }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } });
}
