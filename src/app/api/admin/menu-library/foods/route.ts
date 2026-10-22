import { requestMenuActor } from "@/lib/menu-library/store";
import { searchNutritionFoods } from "@/lib/nutrition-chat/repository";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requestMenuActor(request, false, true);
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return libraryJson(await searchNutritionFoods({ q: query, limit: 20, fields: ["energyKcal"] }));
  } catch (error) { return libraryError(error); }
}
