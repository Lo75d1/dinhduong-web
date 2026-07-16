import { prisma } from "@/lib/prisma";
import { defaultSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings, totalVisits] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { id: "public" }, select: { id: true, contactName: true, organization: true, phone: true, email: true, address: true, zaloUrl: true, thankYouTitle: true, thankYouBody: true, updatedAt: true } }),
      // Chỉ tổng số lượt xem (không có thông tin cá nhân) — hiển thị công khai ở footer.
      prisma.pageVisit.count().catch(() => null),
    ]);
    // Contact settings are edited from Admin and must be reflected immediately
    // in the footer/contact page rather than being held by browser/CDN cache.
    return Response.json({ ...(settings ?? defaultSiteSettings), totalVisits }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return Response.json(defaultSiteSettings, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
