import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeVi } from "@/lib/normalize";
import { searchRank, searchTokens } from "@/lib/search";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { CLASSIFY_SELECT_KEYS } from "@/lib/food-classify";

// select object: id, name, source + mọi field cốt lõi để tính + field phân loại (nhóm C)
const SELECT = {
  id: true,
  name: true,
  source: true,
  unit: true,
  wastePercent: true,
  foodType: true,
  imageUrl: true,
  ...Object.fromEntries(CORE_CALC_FIELDS.map((f) => [f.key, true])),
  ...Object.fromEntries(CLASSIFY_SELECT_KEYS.map((k) => [k, true])),
} as const;

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const foodType = request.nextUrl.searchParams.get("type");
  const source = request.nextUrl.searchParams.get("source");
  const foodGroup = request.nextUrl.searchParams.get("group")?.trim();
  if (q.length < 1) return Response.json({ items: [] });

  const allowedTypes = new Set(["TS", "CB", "MA", "SP"]);
  const allowedSources = new Set(["VDD", "RNI"]);
  const typeFilter = foodType && allowedTypes.has(foodType) ? foodType : null;
  const sourceFilter = source && allowedSources.has(source) ? source : null;
  const groupFilter = foodGroup && foodGroup.length <= 100 ? foodGroup : null;

  const tokens = searchTokens(q);
  const qNormalized = normalizeVi(q);
  const items = await prisma.food.findMany({
    where: {
      foodType: typeFilter ?? undefined,
      source: sourceFilter ?? undefined,
      foodGroup: groupFilter ?? undefined,
      // Mỗi từ trong truy vấn phải xuất hiện ở tên hoặc tên gọi khác.
      AND: tokens.map((token) => ({ OR: [
        { nameNormalized: { contains: token } },
        { aliases: { some: { aliasNormalized: { contains: token } } } },
      ] })),
    },
    orderBy: { name: "asc" },
    // Lấy nhiều ứng viên trước khi xếp hạng lại — take nhỏ + orderBy theo tên
    // sẽ cắt mất các món khớp tốt (vd "Cơm ...") nếu có >N món khác chứa từ
    // khoá đứng trước theo alphabet, trước khi kịp xếp theo độ liên quan.
    take: 500,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: SELECT as any,
  });

  // Ưu tiên trùng khớp đầu chữ (vd gõ "cơm" thì "Cơm ..." lên đầu) rồi mới đến chứa từ khoá.
  const searchable = items as unknown as Array<{ name: string; nameNormalized?: string }>;
  searchable.sort((a, b) => searchRank(a.nameNormalized ?? a.name, qNormalized) - searchRank(b.nameNormalized ?? b.name, qNormalized) || a.name.localeCompare(b.name, "vi"));
  return Response.json({ items: items.slice(0, 40) });
}
