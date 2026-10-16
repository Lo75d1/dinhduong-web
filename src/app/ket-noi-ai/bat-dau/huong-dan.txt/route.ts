import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { nutritionStartGuide } from "@/lib/nutrition-chat/start-guide";

export const dynamic = "force-dynamic";
export async function GET() {
  return new Response(nutritionStartGuide(getNutritionPublicUrl()), { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=60",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  } });
}
