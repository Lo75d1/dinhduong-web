import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const since = new Date(); since.setDate(since.getDate() - 29); since.setHours(0, 0, 0, 0);
    const [totalVisits, visits, topPages, newMessages] = await Promise.all([
      prisma.pageVisit.count(),
      prisma.pageVisit.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, sessionId: true } }),
      prisma.pageVisit.groupBy({ by: ["path"], _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 8 }),
      prisma.contactMessage.count({ where: { status: "NEW" } }),
    ]);
    const byDay = new Map<string, Set<string>>();
    for (const visit of visits) {
      const day = visit.createdAt.toISOString().slice(0, 10);
      (byDay.get(day) ?? byDay.set(day, new Set()).get(day)!).add(visit.sessionId);
    }
    const daily = Array.from(byDay, ([date, sessions]) => ({ date, visits: sessions.size })).sort((a, b) => a.date.localeCompare(b.date));
    return Response.json({ totalVisits, newMessages, daily, topPages: topPages.map((row) => ({ path: row.path, visits: row._count._all })) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể tải thống kê." }, { status: 503 });
  }
}
