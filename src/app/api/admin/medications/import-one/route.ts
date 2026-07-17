import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { scrapeMedicationPage } from "@/lib/medication-scrape";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) return Response.json({ error: "Thiếu link sản phẩm." }, { status: 400 });

    const scraped = await scrapeMedicationPage(url);
    const saved = await prisma.medicationRef.upsert({
      where: { sourceUrl: scraped.sourceUrl },
      create: {
        name: scraped.name,
        category: scraped.category,
        imageUrl: scraped.imageUrl,
        sourceUrl: scraped.sourceUrl,
        sourceLabel: scraped.sourceLabel,
        createdByLabel: actor.displayName,
      },
      update: {
        name: scraped.name,
        category: scraped.category,
        imageUrl: scraped.imageUrl,
        sourceLabel: scraped.sourceLabel,
      },
    });
    return Response.json({ item: saved });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Không có quyền chỉnh sửa dữ liệu." }, { status: 403 });
    const detail = error instanceof Error ? error.message : "Lỗi không xác định";
    return Response.json({ error: detail }, { status: 502 });
  }
}
