# REST phiên tạm, không cần tài khoản

Chỉ dùng khi môi trường có công cụ thực sự gửi được HTTP POST với header và JSON, và chính sách môi trường cho phép. Công cụ chỉ đọc trang web không đủ; link/QR không tự cấp khả năng thực thi. Không vượt chặn mạng hoặc thay OAuth của dữ liệu riêng.

1. Đọc GET https://dinhduong2598.food/api/nutrition/v1/workflow công khai để lấy schema/hướng dẫn hiện tại.
2. Khi người dùng cần tra/tính/Excel, POST https://dinhduong2598.food/api/nutrition/v1/guest-session với Content-Type: application/json, body {}. Giữ accessToken nội bộ; không bắt người dùng copy mã hoặc đăng ký.
3. Gửi POST /api/nutrition/v1/<tên_công_cụ>, Authorization: Bearer <accessToken>, Content-Type: application/json; body là arguments theo schema. REST không có lớp JSON-RPC, không gửi sessionToken trong body. Gọi get_workflow nếu cần đọc lại bằng phiên.
4. Tra dữ liệu thật, prepare_menu, trình review.text và chờ người dùng duyệt. Sau đó calculate_menu, trả chatReport.summaryText cùng webUrl/webExpiresAt thật. Chỉ export khi cần file, mặc định saveToAccount=false; không lưu tài khoản.
5. Thiếu Bearer hoặc endpoint sai không có nghĩa phải tạo tài khoản. Đọc lỗi, giữ đầu vào, mở lại phiên khi hết hạn và prepare/duyệt lại. Không tạo phiên liên tục để vượt hạn mức. Kết thúc đúng phiên bằng DELETE /api/nutrition/v1/guest-session với Bearer khi hoàn tất.

Không có cả MCP lẫn công cụ HTTP phù hợp: nói chính xác phần chưa thể tra/tính, hướng dẫn kết nối /ket-noi-ai#cai-ket-noi; vẫn làm rõ đầu vào. Lưu/mở thư viện riêng mới cần OAuth tài khoản. Không báo đã gọi, tính hoặc lưu nếu chưa có phản hồi hệ thống.
