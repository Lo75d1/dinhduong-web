import { beginNutritionAuthorization, confirmNutritionAuthorization, nutritionOAuthHandler } from "@/lib/nutrition-chat/oauth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return nutritionOAuthHandler(beginNutritionAuthorization, request); }
export function POST(request: Request) { return nutritionOAuthHandler(confirmNutritionAuthorization, request); }
