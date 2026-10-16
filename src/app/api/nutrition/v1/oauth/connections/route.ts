import { listNutritionConnections, nutritionOAuthHandler, revokeNutritionConnection } from "@/lib/nutrition-chat/oauth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return nutritionOAuthHandler(listNutritionConnections, request); }
export function POST(request: Request) { return nutritionOAuthHandler(revokeNutritionConnection, request); }
