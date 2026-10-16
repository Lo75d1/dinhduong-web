import toolGuide from "./tool-guide.json";
import type { NutritionIdentity } from "./contracts";

export const GUEST_TOOL_NAMES = ["get_workflow", "search_foods", "get_food", "search_dishes", "get_dish", "search_diet_codes", "get_diet_code", "prepare_menu", "calculate_menu", "export_workbook"];
type Guide = { stage: string; instruction: string; nextTools: string[]; requiresUserConfirmation: boolean; questions?: unknown[]; questionCount?: number; questionsTruncated?: boolean; session?: { kind: "guest"; expiresAt?: string; persistence: "temporary-web" } };
// Additive to the existing response: clients keep reading items/preview/totals,
// and receive the next action alongside those values, including empty searches.
export function nutritionResponseGuidance(name: string, result: unknown, identity?: NutritionIdentity): Guide {
  const entry = (toolGuide.tools as Record<string, { next: string }>)[name];
  const data = result as { items?: unknown[]; preview?: { missingInputs: unknown[] }; review?: { truncated?: boolean } };
  const guidance: Guide = { stage: "read_result", instruction: entry?.next ?? "Đọc get_workflow và chọn công cụ theo yêu cầu.", nextTools: [], requiresUserConfirmation: false };
  const next: Record<string, string[]> = { get_workflow: ["start_guest_session", "search_dishes"], search_foods: ["get_food"], search_dishes: ["get_dish"], search_diet_codes: ["get_diet_code"], get_food: ["prepare_menu"], get_dish: ["prepare_menu"], get_diet_code: ["prepare_menu"], list_personal_library: ["get_personal_library_item"], get_personal_library_item: ["prepare_menu"], list_saved_menus: ["get_saved_menu"] };
  guidance.nextTools = next[name] ?? [];
  if (Array.isArray(data.items) && data.items.length === 0) Object.assign(guidance, { stage: "no_matches", nextTools: [], instruction: "Không tìm thấy mục phù hợp. Làm rõ tên hoặc thử từ khóa gần nghĩa một lần; không bịa ID, không coi đây là kết quả đã tính. Thực phẩm ngoài kho cần nguồn và cơ sở quy đổi; nutrient chưa có để null." });
  if (name === "prepare_menu" || name === "get_saved_menu") {
    const missing = data.preview?.missingInputs ?? [];
    Object.assign(guidance, missing.length ? { stage: "needs_input", questions: missing.slice(0,20), questionCount: missing.length, questionsTruncated: missing.length>20, nextTools: ["prepare_menu"], instruction: "Hỏi gọn đúng các missingInputs; giữ dữ kiện đã có, không tự điền số thay người dùng. questions tối đa20mục, toàn bộ có trong preview.missingInputs; hỏi từng nhóm, không coi danh sách rút gọn là đầy đủ. Sửa đầu vào rồi prepare_menu lại. Chưa calculate/export/save." } : data.review?.truncated ? { stage: "review_too_large", nextTools: ["prepare_menu"], instruction: "Bản duyệt bị rút gọn. Chia kỳ theo ngày và prepare lại để người dùng duyệt đủ, chưa tính/xuất/lưu." } : { stage: "awaiting_user_confirmation", nextTools: ["calculate_menu", "export_workbook"], requiresUserConfirmation: true, instruction: "Trình review.text cho người dùng, giữ dấu * ở mọi số AI tự điền; hỏi họ có đồng ý đúng bản này không rồi DỪNG CHỜ câu trả lời. confirmationToken chỉ ràng buộc bản nháp, không chứng minh người dùng đồng ý. Sau đồng ý mới dùng input chuẩn hóa và token cùng phản hồi để calculate; export chỉ khi cần file, save chỉ khi được yêu cầu và có tài khoản." });
  }
  if (name === "prepare_menu" || name === "get_saved_menu") guidance.instruction += ` ${toolGuide.approvalPresentation}`;
  if (name === "get_diet_code") Object.assign(guidance, { stage: "diet_choice", requiresUserConfirmation: true });
  if (name === "calculate_menu") Object.assign(guidance, { stage: "calculated", nextTools: [], instruction: "Trả chatReport.summaryText cùng webUrl thật và webExpiresAt để người dùng mở/sửa/tính lại trên web không đăng nhập. Giữ đơn vị, phần thiếu và nguyên fragment của link. Đầu vào giữ tạm30phút, không phải bản lưu tài khoản. Không tự xuất Excel/lưu hoặc bắt tải file; Excel là tải thêm khi họ cần." });
  if (name === "export_workbook") Object.assign(guidance, { stage: "download_ready", nextTools: [], instruction: "Trả downloadUrl thật kèm expiresAt ngay cho người dùng; không tải file vào chat và không gọi xuất lại để đọc kết quả. Chỉ trả savedMenuUrl khi có giá trị. Link tải tạm không phải link bản lưu tài khoản." });
  if (name === "save_menu") Object.assign(guidance, { stage: "saved", instruction: "Trả ration.url thật và phiên bản đã lưu. Không lưu lặp; cập nhật sau khi người dùng yêu cầu phải đọc bản hiện tại, duyệt lại và dùng expectedRevision." });
  if (name === "prepare_menu") guidance.instruction += " Trả thêm webUrl/webExpiresAt từ phản hồi để người dùng có thể mở và sửa đầu vào ngay trên web; bản tạm30phút không cần tài khoản. Không tự tạo link hoặc bỏ phần fragment.";
  if (name === "export_workbook") guidance.instruction += " Trả cả webUrl/webExpiresAt để mở/sửa bản tạm trên web; Excel là file tải thêm, webUrl khác savedMenuUrl lâu dài.";
  if (identity?.kind === "guest") guidance.session = { kind: "guest", expiresAt: identity.expiresAt, persistence: "temporary-web" };
  return guidance;
}
export function nutritionErrorGuidance(status: number, field?: string) {
  const actions: Record<number, string> = {
    400: "Sửa đúng field/message theo schema rồi thử lại một lần; không gửi lại nguyên yêu cầu lỗi.",
    401: "Token/phiên không hợp lệ hoặc hết hạn. Phiên không tài khoản: start_guest_session rồi prepare lại đầu vào đã giữ. Dữ liệu riêng: kết nối OAuth. Không hỏi mật khẩu/token cá nhân trong chat.",
    403: "Kiểm quyền và chế độ phiên. Phiên tạm không được lưu/mở dữ liệu cá nhân; tiếp tục chỉ tính nếu người dùng không cần tài khoản. Không tự nâng quyền hoặc chuyển tài khoản.",
    404: "Tìm lại đúng loại ID từ công cụ tra cứu; không bịa ID hoặc thử bản của người khác.",
    409: "Đầu vào/nguồn hoặc phiên đã thay đổi, mã chốt hết hạn: prepare_menu lại và chờ người dùng duyệt. Xung đột phiên bản: mở bản mới trước khi cập nhật.",
    413: "Chia kỳ theo ngày, giữ đủ dòng và prepare lại; không âm thầm bỏ dữ liệu.",
    422: "Đọc field/message hoặc missingInputs, hỏi đúng dữ kiện còn thiếu rồi prepare lại. Không coi nutrient null là 0.",
    429: "Giữ đầu vào, báo chưa hoàn thành và chờ Retry-After; không tạo phiên mới để vượt hạn mức, không gọi dồn.",
  };
  return { stage: "blocked", ...(field ? { field } : {}), instruction: actions[status] ?? "Giữ đầu vào và báo chưa hoàn thành; chờ Retry-After nếu có rồi thử lại, không thay số liệu để tránh lỗi.", nextTools: [], requiresUserConfirmation: false };
}
