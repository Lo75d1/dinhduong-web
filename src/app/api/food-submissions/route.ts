import { prisma } from "@/lib/prisma";
import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";

const TYPES = new Set(["TS", "CB", "MA", "SP"]);
const asText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const asNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000 ? value : null;

export async function GET() {
  try {
    const user = await requireSessionUser();
    const items = await prisma.foodSubmission.findMany({ where: user.role === "ADMIN" ? undefined : { submitterId: user.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, foodType: true, status: true, reviewNote: true, createdAt: true, reviewedAt: true } });
    return Response.json({ items });
  } catch { return unauthorizedResponse(); }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const name = asText(body?.name, 180), description = asText(body?.description, 4_000), foodType = asText(body?.foodType, 4);
    if (!name || !description) return Response.json({ error: "Cần có tên thực phẩm và mô tả/nguồn số liệu." }, { status: 400 });
    if (foodType && !TYPES.has(foodType)) return Response.json({ error: "Loại thực phẩm không hợp lệ." }, { status: 400 });
    const item = await prisma.foodSubmission.create({ data: { submitterId: user.id, name, description, foodType: foodType || null, sourceNote: asText(body?.sourceNote, 2_000) || null, energyKcal: asNumber(body?.energyKcal), proteinG: asNumber(body?.proteinG), lipidG: asNumber(body?.lipidG), glucidG: asNumber(body?.glucidG) }, select: { id: true, name: true, status: true, createdAt: true } });
    return Response.json({ item }, { status: 201 });
  } catch { return unauthorizedResponse(); }
}
