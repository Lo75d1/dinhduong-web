import { prisma } from "@/lib/prisma";
import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const items = await prisma.foodSubmission.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { submitter: { select: { displayName: true, email: true } }, reviewer: { select: { displayName: true } } } });
    return Response.json({ items });
  } catch { return unauthorizedResponse(); }
}
