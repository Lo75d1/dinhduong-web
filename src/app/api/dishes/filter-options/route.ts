import { prisma } from "@/lib/prisma";

const values = (rows: { value: string | null }[]) => rows.flatMap((row) => row.value ? [row.value] : []);

export async function GET() {
  const [categories, ageGroups, diseaseGroups] = await Promise.all([
    prisma.dish.groupBy({ by: ["categoryRaw"], where: { categoryRaw: { not: null } }, orderBy: { categoryRaw: "asc" } }),
    prisma.dish.groupBy({ by: ["ageGroup"], where: { ageGroup: { not: null } }, orderBy: { ageGroup: "asc" } }),
    prisma.dish.groupBy({ by: ["diseaseDiet"], where: { diseaseDiet: { not: null } }, orderBy: { diseaseDiet: "asc" } }),
  ]);
  return Response.json({
    categories: values(categories.map((row) => ({ value: row.categoryRaw }))),
    ageGroups: values(ageGroups.map((row) => ({ value: row.ageGroup }))),
    diseaseGroups: values(diseaseGroups.map((row) => ({ value: row.diseaseDiet }))),
  });
}
