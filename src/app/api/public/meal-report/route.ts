import { prisma } from "@/lib/prisma";
import { cleanPublicText, ipHash, publicMealCode } from "@/lib/public-meal-report";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Nguồn gửi yêu cầu không hợp lệ." }, { status: 403 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || cleanPublicText(body.website, 100)) return Response.json({ ok: true });

    const requestKey = cleanPublicText(body.requestKey, 80);
    const departmentToken = cleanPublicText(body.departmentToken, 80);
    const note = cleanPublicText(body.note, 500);
    const reporterName = cleanPublicText(body.reporterName, 120) || "Người bệnh/người nhà";
    const roomBed = cleanPublicText(body.roomBed, 80);
    if (!requestKey || !departmentToken || note.length < 3) return Response.json({ error: "Vui lòng nhập ghi chú rõ ràng (ít nhất 3 ký tự)." }, { status: 400 });

    const hash = ipHash(request);
    const [department, recent] = await Promise.all([
      prisma.department.findFirst({ where: { publicToken: departmentToken, status: "ACTIVE" } }),
      prisma.publicMealReport.count({ where: { submittedIpHash: hash, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } }),
    ]);
    if (!department) return Response.json({ error: "Mã QR khoa không hợp lệ hoặc đã được thay đổi." }, { status: 403 });
    if (recent >= 5) return Response.json({ error: "Bạn đã gửi nhiều ghi chú liên tiếp. Vui lòng chờ 15 phút hoặc báo trực tiếp điều dưỡng." }, { status: 429 });

    const replay = await prisma.publicMealReport.findUnique({ where: { requestKey } });
    if (replay) return Response.json({ ok: true, publicCode: replay.publicCode, replayed: true });
    const now = new Date();
    const mealDate = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now) + "T00:00:00.000Z");
    const report = await prisma.publicMealReport.create({ data: {
      publicCode: publicMealCode(), requestKey, reporterName,
      departmentId: department.id, departmentName: department.name, roomBed: roomBed || null,
      mealDate, mealTypeName: "Ghi chú trong ngày", dietTypeName: "Không áp dụng",
      quantity: 1, requestType: "NOTE", note, status: "RECEIVED", emailStatus: "NOT_REQUIRED",
      submittedIpHash: hash,
    } });
    return Response.json({ ok: true, publicCode: report.publicCode }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể tiếp nhận ghi chú." }, { status: 400 });
  }
}
