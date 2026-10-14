import { nutritionAuthorizationMetadata } from "@/lib/nutrition-chat/oauth";
import { nutritionErrorResponse, nutritionJson } from "@/lib/nutrition-chat/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  try { return nutritionJson(nutritionAuthorizationMetadata()); }
  catch (error) { return nutritionErrorResponse(error); }
}
