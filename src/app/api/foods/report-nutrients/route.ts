import { NUTRIENT_GROUPS } from "@/lib/nutrient-fields";
import { prisma } from "@/lib/prisma";

const ALLOWED_FIELDS = new Set(NUTRIENT_GROUPS.flatMap((group) => group.fields.map((field) => field.key)));

export async function POST(request: Request) {
  const body = (await request.json()) as { ids?: unknown; fields?: unknown };
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, 100)
    : [];
  const fields = Array.isArray(body.fields)
    ? [...new Set(body.fields.filter((field): field is string => typeof field === "string" && ALLOWED_FIELDS.has(field)))].slice(0, 100)
    : [];
  if (ids.length === 0 || fields.length === 0) return Response.json({ items: [] });

  const select = { id: true, name: true, source: true, wastePercent: true, ...Object.fromEntries(fields.map((field) => [field, true])) };
  const items = await prisma.food.findMany({
    where: { id: { in: ids } },
    // Prisma cannot infer a dynamic select built from the allowlist above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: select as any,
  });
  return Response.json({ items });
}
