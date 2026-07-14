import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const requester = await requireSessionUser();
    if (requester.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const body = await request.json().catch(() => null);
    const role = body?.role === "ADMIN" ? "ADMIN" : body?.role === "CLINICIAN" ? "CLINICIAN" : null;
    if (!role) return Response.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
    const { id } = await params;
    if (id === requester.id && role !== "ADMIN") return Response.json({ error: "Không thể tự gỡ quyền quản trị của chính mình." }, { status: 400 });
    const item = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, displayName: true, email: true, role: true } });
    return Response.json({ item });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không thể cập nhật vai trò. Kiểm tra migration ứng dụng." }, { status: 503 });
  }
}
