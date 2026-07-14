import { prisma } from "@/lib/prisma";
import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const reviewer = await requireSessionUser();
    if (reviewer.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const body = await request.json().catch(() => null) as { action?: unknown; reviewNote?: unknown } | null;
    const action = body?.action === "APPROVED" || body?.action === "REJECTED" ? body.action : null;
    if (!action) return Response.json({ error: "Thao tác duyệt không hợp lệ." }, { status: 400 });
    const { id } = await params;
    const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim().slice(0, 2_000) : "";
    // Không tạo/cập nhật Food ở đây. Đây chỉ là quyết định với bản nháp.
    const item = await prisma.foodSubmission.update({ where: { id }, data: { status: action, reviewNote: reviewNote || null, reviewerId: reviewer.id, reviewedAt: new Date() }, select: { id: true, status: true, reviewNote: true, reviewedAt: true } });
    return Response.json({ item });
  } catch { return unauthorizedResponse(); }
}
