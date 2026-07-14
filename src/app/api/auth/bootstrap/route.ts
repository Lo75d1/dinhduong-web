import { createSession, hashPassword, normalizeEmail, validPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 100) : "";
  if (!email || !validPassword(password) || !displayName) {
    return Response.json({ error: "Nhập họ tên, email hợp lệ và mật khẩu tối thiểu 10 ký tự." }, { status: 400 });
  }
  if (await prisma.user.count()) {
    return Response.json({ error: "Tài khoản khởi tạo đã tồn tại. Hãy đăng nhập." }, { status: 403 });
  }
  try {
    const user = await prisma.user.create({
      data: { email, displayName, passwordHash: hashPassword(password), role: "ADMIN" },
    });
    await createSession(user.id);
    return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } }, { status: 201 });
  } catch {
    return Response.json({ error: "Không thể tạo tài khoản khởi tạo. Vui lòng thử lại." }, { status: 409 });
  }
}
