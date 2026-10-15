import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountHandler, publicAccountInput } from "@/lib/account-management";
import { nutritionJson } from "@/lib/nutrition-chat/security";
export function POST(request: Request) {
  return accountHandler(async () => {
    const body = await publicAccountInput(request, "login");
    const email = normalizeEmail(body.email),
      password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || password.length > 256)
      return nutritionJson({ error: "Email hoặc mật khẩu chưa đúng." }, 400);
    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      user.disabledAt ||
      !verifyPassword(password, user.passwordHash)
    )
      return nutritionJson(
        { error: "Email hoặc mật khẩu chưa đúng, hoặc tài khoản đã bị khóa." },
        401,
      );
    await createSession(user.id, request, user.passwordHash);
    return nutritionJson({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  });
}
