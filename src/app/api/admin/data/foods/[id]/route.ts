import { retiredCatalogWrite } from "@/lib/catalog-editor/legacy";
import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
const snapshot = {
  id: true, name: true, source: true, sourceCode: true, sourceNote: true,
  imageUrl: true, imageSourceUrl: true, foodType: true, foodGroup: true,
  wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, fiberG: true,
};

export async function GET(_: Request, { params }: Context) {
  try {
    await requireDataEditor();
    const { id } = await params;
    const item = await prisma.food.findUnique({ where: { id }, select: snapshot });
    return item ? Response.json({ item }) : Response.json({ error: "Không tìm thấy thực phẩm." }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không có quyền biên tập dữ liệu." }, { status: 403 });
  }
}

export const PATCH = retiredCatalogWrite;
