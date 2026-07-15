import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanPublicText, defaultSiteSettings } from "@/lib/site-settings";

async function requireAdmin() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
}

export async function GET() {
  try {
    await requireAdmin();
    return Response.json((await prisma.siteSetting.findUnique({ where: { id: "public" } })) ?? defaultSiteSettings);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    const contactName = cleanPublicText(body?.contactName, 100);
    if (!contactName) return Response.json({ error: "Cần có tên người/đơn vị phụ trách." }, { status: 400 });
    const data = {
      contactName,
      organization: cleanPublicText(body?.organization, 250) || null,
      phone: cleanPublicText(body?.phone, 30) || null,
      email: cleanPublicText(body?.email, 254) || null,
      address: cleanPublicText(body?.address, 300) || null,
      zaloUrl: cleanPublicText(body?.zaloUrl, 500) || null,
    };
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return Response.json({ error: "Email chưa đúng định dạng." }, { status: 400 });
    if (data.zaloUrl && !/^https:\/\/zalo\.me\//.test(data.zaloUrl)) return Response.json({ error: "Link hỗ trợ phải là link Zalo hợp lệ." }, { status: 400 });
    const settings = await prisma.siteSetting.upsert({ where: { id: "public" }, create: { id: "public", ...data }, update: data });
    return Response.json(settings);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    return Response.json({ error: "Chưa thể lưu thiết lập." }, { status: 503 });
  }
}
