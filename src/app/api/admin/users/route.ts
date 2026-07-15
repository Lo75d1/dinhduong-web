import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail, validPassword } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const items = await prisma.user.findMany({ select: { id: true, displayName: true, email: true, role: true, createdAt: true, _count: { select: { rations: true, patients: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể tải danh sách người dùng. Kiểm tra migration ứng dụng." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const requester = await requireSessionUser();
    if (requester.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const body = await request.json().catch(() => null) as { displayName?: unknown; email?: unknown; password?: unknown; role?: unknown } | null;
    const email = normalizeEmail(body?.email); const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 100) : "";
    const role = body?.role === "ADMIN" ? "ADMIN" : body?.role === "EDITOR" ? "EDITOR" : "CLINICIAN";
    if (!email || !displayName || !validPassword(body?.password)) return Response.json({ error: "Cần họ tên, email hợp lệ và mật khẩu tối thiểu 10 ký tự." }, { status: 400 });
    const item = await prisma.user.create({ data: { email, displayName, passwordHash: hashPassword(body!.password as string), role }, select: { id: true, displayName: true, email: true, role: true, createdAt: true } });
    return Response.json({ item }, { status: 201 });
  } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse(); return Response.json({ error: "Không thể tạo tài khoản; email có thể đã tồn tại." }, { status: 503 }); }
}
