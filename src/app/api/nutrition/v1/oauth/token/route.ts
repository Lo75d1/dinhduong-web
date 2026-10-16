import { exchangeNutritionToken, nutritionOAuthHandler } from "@/lib/nutrition-chat/oauth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function POST(request: Request) { return nutritionOAuthHandler(exchangeNutritionToken, request); }
