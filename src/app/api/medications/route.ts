import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.medicationRef.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, imageUrl: true, sourceUrl: true, sourceLabel: true },
    });
    return Response.json({ items });
  } catch {
    return Response.json({ items: [] });
  }
}
