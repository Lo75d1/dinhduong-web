import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiUrl = "https://app.thucdongiadinh.vn/api/services/app/MonAn/GetAllServerPaging";
const sourceUrl = "https://app.thucdongiadinh.vn/app/xay-dung-khau-phan/nbt-xay-dung-thuc-don";
const headers = { "user-agent": "DinhDuong2598/1.0 (clinical nutrition reference)", referer: sourceUrl, origin: "https://app.thucdongiadinh.vn", accept: "application/json" };
type RniItem = { id?: unknown; imgBinaryObjectId?: unknown };
type RniResult = { result?: { totalCount?: unknown; items?: RniItem[] } };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchPage(skipCount: number) {
  const response = await fetch(apiUrl, { method: "POST", headers: { ...headers, "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30_000), body: JSON.stringify({ keyword: "", isActive: true, arrNhomMonAnId: [], sorting: "", skipCount, maxResultCount: 1000 }) });
  if (!response.ok) throw new Error(`RNI trả về HTTP ${response.status}`);
  return response.json() as Promise<RniResult>;
}

export async function POST() {
  try {
    await requireDataEditor();
    const first = await fetchPage(0);
    const total = Math.min(Math.max(Number(first.result?.totalCount) || 0, 0), 10_000);
    const rows: { sourceCode: string; imageSourceId: string; imageSourceUrl: string }[] = [];
    const collect = (data: RniResult) => { for (const item of data.result?.items ?? []) { const sourceCode = String(item.id ?? "").trim(); const imageSourceId = typeof item.imgBinaryObjectId === "string" ? item.imgBinaryObjectId.trim() : ""; if (sourceCode && uuid.test(imageSourceId)) rows.push({ sourceCode, imageSourceId, imageSourceUrl: sourceUrl }); } };
    collect(first);
    for (let skip = 1000; skip < total; skip += 1000) collect(await fetchPage(skip));

    const dishes = await prisma.dish.findMany({ where: { source: "RNI", sourceCode: { in: [...new Set(rows.map((row) => row.sourceCode))] } }, select: { id: true, name: true, sourceCode: true, imageSourceId: true, imageSourceUrl: true } });
    const byCode = new Map(dishes.filter((dish) => dish.sourceCode).map((dish) => [dish.sourceCode!, dish]));
    const items = rows.map((row) => { const dish = byCode.get(row.sourceCode) ?? null; return { ...row, imagePreviewUrl: `/api/dish-images/rni/${row.imageSourceId}`, status: dish ? "MATCHED" : "NOT_FOUND", dish }; });
    const matched = items.filter((item) => item.status === "MATCHED");
    return Response.json({ items, summary: { sourceRows: rows.length, matched: matched.length, unchanged: matched.filter((item) => item.dish?.imageSourceId === item.imageSourceId).length, notFound: items.filter((item) => item.status === "NOT_FOUND").length } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể lấy ảnh trực tiếp từ nguồn RNI. Hãy thử lại sau ít phút." }, { status: 502 });
  }
}
