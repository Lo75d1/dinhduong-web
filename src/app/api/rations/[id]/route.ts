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
    if (ration.conversationRevision > 0) return Response.json({ error: "Mở bản hội thoại ở trang Kết nối AI để giữ đúng ngày, đơn vị và nguồn.", openUrl: `/ket-noi-ai/ban-luu/${ration.id}` }, { status: 409 });
    return Response.json({ ration });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không thể mở khẩu phần." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const exists = await prisma.ration.findFirst({ where: { id, ownerId: user.id }, select: { id: true, conversationRevision: true } });
    if (!exists) return Response.json({ error: "Không tìm thấy khẩu phần." }, { status: 404 });
    if (exists.conversationRevision > 0) return Response.json({ error: "Xóa bản hội thoại ở trang Kết nối AI với phiên bản đang xem." }, { status: 409 });
    await prisma.ration.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không thể xóa khẩu phần." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const payload = parseRationPayload(await request.json());
    const exists = await prisma.ration.findFirst({ where: { id, ownerId: user.id }, select: { id: true, conversationRevision: true } });
    if (!exists) return Response.json({ error: "Không tìm thấy khẩu phần." }, { status: 404 });
    if (exists.conversationRevision > 0) return Response.json({ error: "Cập nhật bản hội thoại qua API Nutrition với revision đã xác nhận." }, { status: 409 });
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
