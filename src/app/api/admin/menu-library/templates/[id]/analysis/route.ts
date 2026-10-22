import { requestMenuActor } from "@/lib/menu-library/store";
import { analyzeMenuTemplate } from "@/lib/menu-library/review-store";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
import { validateConnectionCsrf, validateNutritionOrigin } from "@/lib/nutrition-chat/oauth-validation";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requestMenuActor(request, false, true);
    validateNutritionOrigin(request, true);
    validateConnectionCsrf(actor.userId, request.headers.get("x-menu-library-csrf") ?? undefined);
    return libraryJson(await analyzeMenuTemplate(actor, (await context.params).id, await readNutritionJson(request, 524288)));
  } catch (error) { return libraryError(error); }
}
