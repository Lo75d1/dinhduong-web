import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiUrl = "https://viendinhduong.vn/api/fe/tool/getPageFoodData";
const sourcePageUrl = "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an";
const headers = { "user-agent": "DinhDuong2598/1.0 (clinical nutrition reference)", referer: sourcePageUrl, accept: "application/json" };

type VddItem = { code?: unknown; image?: unknown };
type VddResponse = { data?: VddItem[]; last_page?: unknown };

function imageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, "https://viendinhduong.vn/");
    return url.protocol === "https:" && url.hostname.endsWith("viendinhduong.vn") ? url.toString() : "";
  } catch { return ""; }
}

async function fetchPage(page: number) {
  const url = new URL(apiUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("gender", "2");
  const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`VDD trả về HTTP ${response.status}`);
  return response.json() as Promise<VddResponse>;
}

export async function POST() {
  try {
    await requireDataEditor();
    const first = await fetchPage(1);
    const lastPage = Math.min(Math.max(Number(first.last_page) || 1, 1), 100);
    const vddRows: { sourceCode: string; imageUrl: string; imageSourceUrl: string }[] = [];
    const collect = (data: VddResponse) => {
      for (const item of data.data ?? []) {
        const sourceCode = typeof item.code === "string" ? item.code.trim() : "";
        const url = imageUrl(item.image);
        if (sourceCode && url) vddRows.push({ sourceCode, imageUrl: url, imageSourceUrl: sourcePageUrl });
      }
    };
    collect(first);
    for (let page = 2; page <= lastPage; page++) collect(await fetchPage(page));

    const foods = await prisma.food.findMany({
      where: { sourceCode: { in: [...new Set(vddRows.map((row) => row.sourceCode))] } },
      select: { id: true, name: true, source: true, sourceCode: true, foodType: true, imageUrl: true, imageSourceUrl: true },
    });
    const byCode = new Map<string, typeof foods>();
    for (const food of foods) {
      if (!food.sourceCode) continue;
      const entries = byCode.get(food.sourceCode) ?? [];
      entries.push(food); byCode.set(food.sourceCode, entries);
    }
    const items = vddRows.map((row) => {
      const candidates = byCode.get(row.sourceCode) ?? [];
      const preferred = candidates.filter((food) => food.source === "VDD" && food.foodType === "MA");
      const food = preferred.length === 1 ? preferred[0] : candidates.length === 1 ? candidates[0] : null;
      return { ...row, status: food ? "MATCHED" : candidates.length > 1 ? "AMBIGUOUS" : "NOT_FOUND", food };
    });
    const matched = items.filter((item) => item.status === "MATCHED");
    return Response.json({ items, summary: { sourceRows: vddRows.length, matched: matched.length, unchanged: matched.filter((item) => item.food?.imageUrl === item.imageUrl).length, notFound: items.filter((item) => item.status === "NOT_FOUND").length, ambiguous: items.filter((item) => item.status === "AMBIGUOUS").length } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể lấy dữ liệu ảnh trực tiếp từ Viện Dinh dưỡng. Hãy thử lại sau ít phút." }, { status: 502 });
  }
}
