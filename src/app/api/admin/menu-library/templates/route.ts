import { requestMenuActor, listMenuTemplates, saveMenuTemplate } from "@/lib/menu-library/store";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const actor = await requestMenuActor(request), url = new URL(request.url); return libraryJson(await listMenuTemplates(actor, url.searchParams.get("q") ?? "", Number(url.searchParams.get("offset") ?? 0), url.searchParams.get("direction") ?? "", url.searchParams.get("eatingContext") ?? "")); } catch (error) { return libraryError(error); }
}
export async function POST(request: Request) {
  try { const actor = await requestMenuActor(request, true); return libraryJson(await saveMenuTemplate(actor, await readNutritionJson(request, 524288)), 201); } catch (error) { return libraryError(error); }
}
