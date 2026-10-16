import { readNutritionJson, nutritionJson, nutritionErrorResponse, getNutritionIdentity } from "@/lib/nutrition-chat/security";
import { startGuestSession } from "@/lib/nutrition-chat/guest-session";
import { revokeGuestSession } from "@/lib/nutrition-chat/guest-store";
import { validateOperationObject } from "@/lib/nutrition-chat/service";
import { nutritionRestError } from "@/lib/nutrition-chat/rest";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { validateOperationObject(await readNutritionJson(request, 1024), []); return nutritionJson(await startGuestSession(request), 201); }
  catch (error) { return nutritionRestError(error); }
}
export async function DELETE(request: Request) {
  try {
    await getNutritionIdentity(request,"nutrition:read");
    await revokeGuestSession((request.headers.get("authorization") ?? "").replace(/^Bearer /i, ""));
    return nutritionJson({ ended: true, guidance: { stage: "session_ended", instruction: "Phiên tạm đã kết thúc. Chỉ tạo phiên mới khi có yêu cầu tính tiếp; đầu vào chưa được lưu trên tài khoản." } });
  } catch (error) { return nutritionErrorResponse(error); }
}
