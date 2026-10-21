import "server-only";
import { createHash } from "node:crypto";
import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";

// A display label, never a credential. Rotation keeps the OAuth family and label.
export function menuConnectionCode(familyId: string) {
  return createHash("sha256").update(`menu-library:${familyId}`).digest("hex").slice(0, 12).toUpperCase();
}

export function menuLibraryAccessGuidance() {
  return {
    stage: "blocked",
    authorizationUrl: `${getNutritionPublicUrl()}/quan-tri/ket-noi-ai`,
    instruction: "Đọc lý do từ chối. Chỉ tài khoản Admin được dùng kho mẫu. Nếu thiếu ủy quyền hoặc quyền ghi, Admin mở authorizationUrl, đối chiếu mã phiên trong thông báo và cấp quyền cho đúng phiên hiện tại. Giữ nguyên kết nối AI; sau khi Admin cấp quyền, thử lại thao tác đã được yêu cầu. Không ngắt/kết nối lại, không xin token và không tự cấp quyền. Không coi lưu nháp là duyệt chuyên môn.",
    nextTools: [],
    requiresUserConfirmation: false,
  };
}
