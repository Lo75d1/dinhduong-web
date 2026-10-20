import { retiredCatalogWrite } from "@/lib/catalog-editor/legacy";
import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { priceSelect } from "@/lib/food-price-admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    await requireDataEditor();
    const { id } = await params;
    const items = await prisma.foodPrice.findMany({
      where: { foodId: id },
      select: priceSelect,
      orderBy: [{ region: "asc" }, { createdAt: "desc" }],
    });
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không có quyền xem giá tham khảo." }, { status: 403 });
  }
}

export const POST = retiredCatalogWrite;
