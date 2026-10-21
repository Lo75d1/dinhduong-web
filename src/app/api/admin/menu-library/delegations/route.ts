import { requestMenuActor, menuDelegations, changeMenuDelegation } from "@/lib/menu-library/store";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return libraryJson(await menuDelegations(await requestMenuActor(request, false, true))); } catch (error) { return libraryError(error); }
}
export async function POST(request: Request) {
  try { const actor = await requestMenuActor(request, true, true); return libraryJson(await changeMenuDelegation(actor, await readNutritionJson(request, 4096)), 201); } catch (error) { return libraryError(error); }
}
export async function DELETE(request: Request) {
  try { const actor = await requestMenuActor(request, true, true); return libraryJson(await changeMenuDelegation(actor, await readNutritionJson(request, 4096), true)); } catch (error) { return libraryError(error); }
}
