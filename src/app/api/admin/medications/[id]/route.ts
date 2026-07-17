import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireDataEditor();
    const { id } = await context.params;
    await prisma.medicationRef.delete({ where: { id } }).catch(() => null);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Không có quyền xoá dữ liệu." }, { status: 403 });
    return Response.json({ error: "Chưa thể xoá." }, { status: 500 });
  }
}
