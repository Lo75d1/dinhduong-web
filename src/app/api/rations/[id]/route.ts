import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRationPayload } from "@/lib/ration-persistence";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const ration = await prisma.ration.findFirst({ where: { id, ownerId: user.id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
    if (!ration) return Response.json({ error: "Không tìm thấy khẩu phần." }, { status: 404 });
    return Response.json({ ration });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không thể mở khẩu phần." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const payload = parseRationPayload(await request.json());
    const exists = await prisma.ration.findFirst({ where: { id, ownerId: user.id }, select: { id: true } });
    if (!exists) return Response.json({ error: "Không tìm thấy khẩu phần." }, { status: 404 });
    const ration = await prisma.ration.update({
      where: { id },
      data: { title: payload.title, profileJson: payload.profileJson, items: { deleteMany: {}, create: payload.items } },
      select: { id: true, title: true, updatedAt: true },
    });
    return Response.json({ ration });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: error instanceof Error ? error.message : "Không thể cập nhật khẩu phần." }, { status: 400 });
  }
}
