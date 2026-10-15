import {
  accountHandler,
  accountSnapshot,
  updateAccountProfile,
} from "@/lib/account-management";
import { nutritionJson } from "@/lib/nutrition-chat/security";
export const dynamic = "force-dynamic";
export function GET() {
  return accountHandler(async () => nutritionJson(await accountSnapshot()));
}
export function PATCH(request: Request) {
  return accountHandler(() => updateAccountProfile(request));
}
