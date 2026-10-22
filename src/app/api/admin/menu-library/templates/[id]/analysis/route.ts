import { requestMenuActor } from "@/lib/menu-library/store";
import { analyzeMenuTemplate } from "@/lib/menu-library/review-store";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requestMenuActor(request, true, true);
    return libraryJson(await analyzeMenuTemplate(actor, (await context.params).id, await readNutritionJson(request, 4096)));
  } catch (error) { return libraryError(error); }
}
