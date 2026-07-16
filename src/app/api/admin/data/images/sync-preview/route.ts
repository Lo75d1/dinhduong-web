import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeVi } from "@/lib/normalize";

export const runtime = "nodejs";

const apiUrl = "https://viendinhduong.vn/api/fe/tool/getPageFoodData";
const sourcePageUrl = "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an";
const headers = { "user-agent": "DinhDuong2598/1.0 (clinical nutrition reference)", referer: sourcePageUrl, accept: "application/json" };

type VddItem = { code?: unknown; image?: unknown; name_vi?: unknown };
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
    const vddRows: { sourceCode: string; name: string; nameNormalized: string; imageUrl: string; imageSourceUrl: string }[] = [];
    const collect = (data: VddResponse) => {
      for (const item of data.data ?? []) {
        const sourceCode = typeof item.code === "string" ? item.code.trim() : "";
        const url = imageUrl(item.image);
        const name = typeof item.name_vi === "string" ? item.name_vi.trim() : "";
        if (sourceCode && name && url) vddRows.push({ sourceCode, name, nameNormalized: normalizeVi(name), imageUrl: url, imageSourceUrl: sourcePageUrl });
      }
    };
    collect(first);
    for (let page = 2; page <= lastPage; page++) collect(await fetchPage(page));

    // Bản seed ban đầu của VDD chưa lưu mã HAP-..., nên lần đồng bộ đầu tiên
    // ghép chính xác theo tên chuẩn hoá; sau khi xác nhận, mã nguồn được lưu lại.
    const foods = await prisma.food.findMany({ where: { source: "VDD", foodType: "MA" }, select: { id: true, name: true, nameNormalized: true, source: true, sourceCode: true, foodType: true, imageUrl: true, imageSourceUrl: true } });
    const byCode = new Map<string, typeof foods>();
    for (const food of foods) {
      if (!food.sourceCode) continue;
      const entries = byCode.get(food.sourceCode) ?? [];
      entries.push(food); byCode.set(food.sourceCode, entries);
    }
    const byName = new Map<string, typeof foods>();
    for (const food of foods) { const key = food.nameNormalized || normalizeVi(food.name); const entries = byName.get(key) ?? []; entries.push(food); byName.set(key, entries); }
    const items = vddRows.map((row) => { const candidates = byCode.get(row.sourceCode) ?? byName.get(row.nameNormalized) ?? []; const food = candidates.length === 1 ? candidates[0] : null; return { ...row, status: food ? "MATCHED" : candidates.length > 1 ? "AMBIGUOUS" : "NOT_FOUND", food }; });
    const matched = items.filter((item) => item.status === "MATCHED");
    return Response.json({ items, summary: { sourceRows: vddRows.length, matched: matched.length, unchanged: matched.filter((item) => item.food?.imageUrl === item.imageUrl).length, notFound: items.filter((item) => item.status === "NOT_FOUND").length, ambiguous: items.filter((item) => item.status === "AMBIGUOUS").length } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể lấy dữ liệu ảnh trực tiếp từ Viện Dinh dưỡng. Hãy thử lại sau ít phút." }, { status: 502 });
  }
}
