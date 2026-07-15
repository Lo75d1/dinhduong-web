import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { normalizeVi } from "@/lib/normalize";

const select = { id: true, name: true, source: true, sourceCode: true, sourceNote: true, imageUrl: true, imageSourceUrl: true, foodType: true, foodGroup: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, fiberG: true, updatedAt: true };
export async function GET(request: NextRequest) {
  try { await requireDataEditor(); const q = normalizeVi(request.nextUrl.searchParams.get("q") ?? ""); const items = await prisma.food.findMany({ where: q ? { nameNormalized: { contains: q } } : undefined, orderBy: { name: "asc" }, take: 100, select }); return Response.json({ items }); }
  catch (e) { if (e instanceof Error && e.message === "UNAUTHORIZED") return unauthorizedResponse(); return Response.json({ error: "Không có quyền biên tập dữ liệu." }, { status: 403 }); }
}
