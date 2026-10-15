import {
  createSession,
  hashPassword,
  normalizeEmail,
  validPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountHandler, publicAccountInput } from "@/lib/account-management";
import { nutritionJson } from "@/lib/nutrition-chat/security";
export function POST(request: Request) {
  return accountHandler(async () => {
    const body = await publicAccountInput(request, "register");
    const email = normalizeEmail(body.email),
      password = body.password;
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (
      !email ||
      !displayName ||
      displayName.length > 100 ||
      !validPassword(password)
    )
      return nutritionJson(
        {
          error:
            "Nhập họ tên (tối đa 100 ký tự), email và mật khẩu 10–256 ký tự.",
        },
        400,
      );
    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash: hashPassword(password),
        role: "CLINICIAN",
      },
    });
    await createSession(user.id, request, user.passwordHash);
    return nutritionJson(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
      },
      201,
    );
  });
}
