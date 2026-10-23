import { prisma } from "@/lib/prisma";
import { requestMenuActor } from "@/lib/menu-library/store";
import { connectionCsrf } from "@/lib/nutrition-chat/oauth-validation";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { menuInputError } from "@/lib/menu-library/validation";
import { managerCatalogQuery } from "@/lib/menu-library/manager-query";
import { EMPTY_MANAGER_FILTERS, type ManagerFilters, type ManagerCatalog } from "@/lib/menu-library/manager-contracts";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await requestMenuActor(request),
      params = new URL(request.url).searchParams;
    const filters = Object.fromEntries(Object.entries(EMPTY_MANAGER_FILTERS).map(([key, value]) => [key, (params.get(key) ?? value).trim()])) as ManagerFilters;
    const offset = Number(params.get("offset") ?? 0);
    if (filters.q.length > 100 || !["", "individual", "collective", "hospital"].includes(filters.section) || !["", "patient_guidance", "hospital_kitchen"].includes(filters.hospitalUse) || !["active", "archived"].includes(filters.availability) || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) menuInputError("Bộ lọc không hợp lệ.", "query");
    const [result] = await prisma.$queryRaw<Pick<ManagerCatalog, "items" | "total">[]>(managerCatalogQuery(filters, offset));
    return libraryJson({
      ...result,
      nextOffset: offset + result.items.length < result.total ? offset + result.items.length : null,
      ...(actor.via === "session" ? {
        csrf: connectionCsrf(actor.userId)
      } : {})
    });
  } catch (error) {
    return libraryError(error);
  }
}
