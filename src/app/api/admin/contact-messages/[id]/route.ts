import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanPublicText } from "@/lib/site-settings";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const status = ["NEW", "IN_PROGRESS", "CLOSED"].includes(body?.status) ? body.status : undefined;
    const adminNote = cleanPublicText(body?.adminNote, 2000);
    const item = await prisma.contactMessage.update({ where: { id }, data: { ...(status ? { status } : {}), adminNote: adminNote || null } });
    return Response.json(item);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể cập nhật liên hệ." }, { status: 503 });
  }
}
