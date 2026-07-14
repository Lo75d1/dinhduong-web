import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRationPayload } from "@/lib/ration-persistence";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const items = await prisma.ration.findMany({
      where: { ownerId: user.id },
      select: { id: true, title: true, observedAt: true, updatedAt: true, patient: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không thể tải khẩu phần đã lưu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const payload = parseRationPayload(await request.json());
    const ration = await prisma.ration.create({
      data: { ownerId: user.id, title: payload.title, profileJson: payload.profileJson, items: { create: payload.items } },
      select: { id: true, title: true, updatedAt: true },
    });
    return Response.json({ ration }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: error instanceof Error ? error.message : "Không thể lưu khẩu phần." }, { status: 400 });
  }
}
