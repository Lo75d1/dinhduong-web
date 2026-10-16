import "server-only";
import { createGuestSession } from "./guest-store";
import { enforceNutritionRateLimit, nutritionAnonymousKey, validateNutritionOrigin } from "./security";

export async function startGuestSession(request: Request) {
  validateNutritionOrigin(request);
  await enforceNutritionRateLimit("nutrition-guest-issue:global", { limit: 60, windowSeconds: 3600 });
  await enforceNutritionRateLimit(`nutrition-guest-issue:${nutritionAnonymousKey(request)}`, { limit: 6, windowSeconds: 3600 });
  return { ...await createGuestSession(), guidance: {
    stage: "session_ready", nextTools: ["search_dishes", "search_foods", "prepare_menu"], requiresUserConfirmation: false,
    instruction: "Phiên tạm 30 phút không cần tài khoản. REST: dùng Authorization: Bearer accessToken; MCP: truyền sessionToken=accessToken trong arguments của công cụ cho phép. Giữ token trong công cụ, không đưa vào URL hay câu trả lời. Đọc guidance sau mỗi phản hồi. Tra món và làm rõ đầu vào trước prepare; trình bản nháp và chờ người dùng đồng ý trước calculate/export. Không lưu thực đơn, không mở thư viện hoặc bản lưu cá nhân.",
  } };
}
