import { NutritionInputError } from "@/lib/nutrition-chat/validation";
import { NutritionSecurityError } from "@/lib/nutrition-chat/oauth-validation";
import { PRIVATE_LIBRARY_HEADERS } from "./access";
import { menuLibraryAccessGuidance } from "./connection";

export function libraryJson(value: unknown, status = 200) { return Response.json(value, { status, headers: { ...PRIVATE_LIBRARY_HEADERS, Vary: "Cookie, Authorization" } }); }
export function libraryError(error: unknown) {
  if (error instanceof NutritionInputError) return libraryJson({ error: "invalid_input", message: error.message, field: error.field }, error.status);
  if (error instanceof NutritionSecurityError) return libraryJson({ error: error.code, message: error.description, ...(error.code === "menu_library_access" ? { guidance: menuLibraryAccessGuidance() } : {}) }, error.status);
  return libraryJson({ error: "unavailable", message: "Chưa xử lý được yêu cầu. Kiểm tra cập nhật cơ sở dữ liệu hoặc thử lại sau." }, 503);
}
