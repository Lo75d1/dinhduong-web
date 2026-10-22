import { requestMenuActor } from "@/lib/menu-library/store";
import { reviewMenuTemplate, getMenuReview } from "@/lib/menu-library/review-store";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requestMenuActor(request, false, true);
    return libraryJson(await getMenuReview(actor, (await context.params).id, new URL(request.url).searchParams.get("reviewId") ?? ""));
  } catch (error) { return libraryError(error); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requestMenuActor(request, true, true);
    return libraryJson(await reviewMenuTemplate(actor, (await context.params).id, await readNutritionJson(request, 16384)));
  } catch (error) { return libraryError(error); }
}
