import { prisma } from "@/lib/prisma";
import { defaultSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findUnique({ where: { id: "public" }, select: { id: true, contactName: true, organization: true, phone: true, email: true, address: true, zaloUrl: true, thankYouTitle: true, thankYouBody: true, updatedAt: true } });
    return Response.json(settings ?? defaultSiteSettings, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json(defaultSiteSettings, { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
