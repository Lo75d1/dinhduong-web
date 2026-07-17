import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireDataEditor();
    const items = await prisma.medicationRef.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Không có quyền xem dữ liệu." }, { status: 403 });
    return Response.json({ error: "Chưa thể tải danh sách thuốc." }, { status: 500 });
  }
}
