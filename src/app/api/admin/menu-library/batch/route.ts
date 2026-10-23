import { requestMenuActor } from "@/lib/menu-library/store";
import { batchMenuTemplates } from "@/lib/menu-library/batch-store";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const actor = await requestMenuActor(request, true, true);
    return libraryJson(await batchMenuTemplates(actor, await readNutritionJson(request, 65536)));
  } catch (error) {
    return libraryError(error);
  }
}
