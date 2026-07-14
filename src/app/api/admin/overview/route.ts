import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const [users, patients, rations, foods, dishes, pendingSubmissions] = await Promise.all([prisma.user.count(), prisma.patient.count(), prisma.ration.count(), prisma.food.count(), prisma.dish.count(), prisma.foodSubmission.count({ where: { status: "PENDING" } })]);
    return Response.json({ users, patients, rations, foods, dishes, pendingSubmissions });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể tải số liệu quản trị. Kiểm tra migration ứng dụng." }, { status: 503 });
  }
}
