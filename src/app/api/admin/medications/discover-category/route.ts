import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { discoverProductLinks, fetchCategoryHtml } from "@/lib/medication-scrape";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) return Response.json({ error: "Thiếu link danh mục." }, { status: 400 });

    const { url: categoryUrl, html } = await fetchCategoryHtml(url);
    const links = discoverProductLinks(categoryUrl.toString(), html).filter((link) => link !== categoryUrl.toString());
    return Response.json({ links });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Không có quyền chỉnh sửa dữ liệu." }, { status: 403 });
    const detail = error instanceof Error ? error.message : "Lỗi không xác định";
    return Response.json({ error: detail }, { status: 502 });
  }
}
