import { prisma } from "@/lib/prisma";

export async function GET() {
  const [types, sources, groups] = await Promise.all([
    prisma.food.groupBy({ by: ["foodType"], where: { foodType: { not: null } }, orderBy: { foodType: "asc" } }),
    prisma.food.groupBy({ by: ["source"], orderBy: { source: "asc" } }),
    prisma.food.groupBy({ by: ["foodGroup"], where: { foodGroup: { not: null } }, orderBy: { foodGroup: "asc" } }),
  ]);

  return Response.json({
    types: types.map((item) => item.foodType),
    sources: sources.map((item) => item.source),
    groups: groups.map((item) => item.foodGroup),
  });
}
