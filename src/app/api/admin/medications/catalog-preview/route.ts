import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { collectMedicationCatalogLinks } from "@/lib/medication-scrape";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CHUNK_SIZE = 500;

export async function POST(request: Request) {
  try {
    await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { sources?: unknown } | null;
    const catalog = await collectMedicationCatalogLinks(body?.sources);

    // This is read-only. It lets the Admin see how many sitemap links already
    // exist before deciding whether to import the remaining product pages.
    let alreadyImported = 0;
    for (let start = 0; start < catalog.links.length; start += CHUNK_SIZE) {
      alreadyImported += await prisma.medicationRef.count({
        where: { sourceUrl: { in: catalog.links.slice(start, start + CHUNK_SIZE) } },
      });
    }

    return Response.json({
      links: catalog.links,
      sourceCounts: catalog.sourceCounts,
      total: catalog.links.length,
      alreadyImported,
      pending: catalog.links.length - alreadyImported,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Không có quyền chỉnh sửa dữ liệu." }, { status: 403 });
    const detail = error instanceof Error ? error.message : "Lỗi không xác định";
    return Response.json({ error: detail }, { status: 502 });
  }
}
