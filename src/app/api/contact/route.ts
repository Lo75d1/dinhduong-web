import { prisma } from "@/lib/prisma";
import { cleanPublicText } from "@/lib/site-settings";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = cleanPublicText(body?.name, 100);
  const email = cleanPublicText(body?.email, 254);
  const phone = cleanPublicText(body?.phone, 30);
  const audience = cleanPublicText(body?.audience, 40);
  const message = cleanPublicText(body?.message, 3000);
  if (!name || !message || (!email && !phone)) {
    return Response.json({ error: "Nhập họ tên, nội dung và ít nhất email hoặc số điện thoại để phản hồi." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Email chưa đúng định dạng." }, { status: 400 });
  }
  try {
    await prisma.contactMessage.create({ data: { name, email: email || null, phone: phone || null, audience: audience || null, message } });
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Chưa thể gửi liên hệ. Vui lòng thử lại sau." }, { status: 503 });
  }
}
