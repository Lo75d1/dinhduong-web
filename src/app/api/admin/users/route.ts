import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
