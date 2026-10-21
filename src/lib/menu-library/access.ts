import "server-only";
import { getSessionUser } from "@/lib/auth";

export const PRIVATE_LIBRARY_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

export async function menuLibraryAccess(): Promise<{ allowed: true } | { allowed: false; status: 401 | 403 | 503; error: string }> {
  try {
    const user = await getSessionUser();
    if (!user) return { allowed: false, status: 401, error: "Bạn cần đăng nhập quản trị." };
    if (user.role !== "ADMIN") return { allowed: false, status: 403, error: "Bạn không có quyền quản trị." };
    return { allowed: true };
  } catch {
    return { allowed: false, status: 503, error: "Chưa kiểm tra được phiên đăng nhập. Vui lòng thử lại." };
  }
}

export function menuLibraryDenied(access: { status: number; error: string }) {
  return Response.json({ error: access.error }, { status: access.status, headers: PRIVATE_LIBRARY_HEADERS });
}
