import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { searchMedicationProductLinks } from "@/lib/medication-scrape";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireDataEditor();
    const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
    const query = typeof body?.query === "string" ? body.query : "";
    const links = await searchMedicationProductLinks(query);
    return Response.json({ links });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Không có quyền chỉnh sửa dữ liệu." }, { status: 403 });
    const detail = error instanceof Error ? error.message : "Lỗi không xác định";
    return Response.json({ error: detail }, { status: 502 });
  }
}
