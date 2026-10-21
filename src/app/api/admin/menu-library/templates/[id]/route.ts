import { requestMenuActor, getMenuTemplate, saveMenuTemplate } from "@/lib/menu-library/store";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { const actor = await requestMenuActor(request); return libraryJson(await getMenuTemplate(actor, (await context.params).id)); } catch (error) { return libraryError(error); }
}
export async function PUT(request: Request, context: Context) {
  try { const actor = await requestMenuActor(request, true); return libraryJson(await saveMenuTemplate(actor, await readNutritionJson(request, 524288), (await context.params).id)); } catch (error) { return libraryError(error); }
}
