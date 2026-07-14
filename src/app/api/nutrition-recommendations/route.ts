import { prisma } from "@/lib/prisma";

// Chỉ 72 dòng — lấy hết 1 lần, khớp ở client (đơn giản hơn viết query theo khoảng tuổi text).
export async function GET() {
  const items = await prisma.nutritionRecommendation.findMany({
    orderBy: { stt: "asc" },
  });
  return Response.json({ items });
}
