import { clearSession } from "@/lib/auth";
import { accountHandler } from "@/lib/account-management";
import { validateNutritionOrigin } from "@/lib/nutrition-chat/oauth-validation";
import { nutritionJson } from "@/lib/nutrition-chat/security";
export function POST(request: Request) { return accountHandler(async () => {
  validateNutritionOrigin(request, true);
  await clearSession();
  return nutritionJson({ ok: true });
}); }
