import { prisma } from "@/lib/prisma";

// 246 dòng — lấy hết 1 lần, lọc ở client (Đối tượng -> Nhóm bệnh -> Mã).
export async function GET() {
  const items = await prisma.dietCode.findMany({
    orderBy: [{ targetGroup: "asc" }, { diseaseGroup: "asc" }, { code: "asc" }],
  });
  return Response.json({ items });
}
