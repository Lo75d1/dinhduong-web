import { createSession, hashPassword, normalizeEmail, validPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 100) : "";
  if (!email || !displayName || !validPassword(password)) return Response.json({ error: "Nhập họ tên, email hợp lệ và mật khẩu tối thiểu 10 ký tự." }, { status: 400 });
  try {
    const user = await prisma.user.create({ data: { email, displayName, passwordHash: hashPassword(password), role: "CLINICIAN" } });
    await createSession(user.id);
    return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } }, { status: 201 });
  } catch {
    return Response.json({ error: "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác." }, { status: 409 });
  }
}
