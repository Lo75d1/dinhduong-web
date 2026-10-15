import { nutritionRestIdentity, nutritionRestError } from "@/lib/nutrition-chat/rest";
import { enforceNutritionRateLimit, nutritionJson, readNutritionJson } from "@/lib/nutrition-chat/security";
import { personalLibraryKind, listPersonalLibrary, getPersonalLibraryItem, savePersonalLibraryItem, deletePersonalLibraryItem, personalListParams } from "@/lib/personal-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const identity = await nutritionRestIdentity(request, "nutrition:read"), kind = personalLibraryKind((await context.params).kind);
    await enforceNutritionRateLimit(`personal-library:${identity.userId}`, { limit: 120, windowSeconds: 60 });
    const params = new URL(request.url).searchParams, id = params.get("id");
    const { q, page } = personalListParams({ q: params.get("q"), page: params.get("page") });
    return nutritionJson(id ? await getPersonalLibraryItem(kind, id, identity) : await listPersonalLibrary(kind, q, page, identity));
  } catch (error) { return nutritionRestError(error); }
}
async function mutate(request: Request, context: Context) {
  try {
    const identity = await nutritionRestIdentity(request, "nutrition:write"), kind = personalLibraryKind((await context.params).kind);
    await enforceNutritionRateLimit(`personal-library-write:${identity.userId}`, { limit: 20, windowSeconds: 60 });
    const body = await readNutritionJson(request, 512 * 1024);
    return nutritionJson(request.method === "DELETE" ? await deletePersonalLibraryItem(kind, body, identity) : await savePersonalLibraryItem(kind, body, identity));
  } catch (error) { return nutritionRestError(error); }
}
export { mutate as POST, mutate as DELETE };
