# Dinh dưỡng 2598 — plugin và hướng dẫn

- Đây là một plugin có16 công cụ; không cần cài từng công cụ thành plugin riêng.
- `plugin.json`: tên/mô tả. `mcp.json`: địa chỉ máy chủ và kết nối OAuth. `skills/dinh-duong-2598/SKILL.md`: quy trình hội thoại.
- [Bảng công cụ](skills/dinh-duong-2598/references/cong-cu.md): công cụ nào làm gì, nhận gì, kết quả nằm ở trường nào, bước tiếp theo và cách xử lý lỗi.
- Mặc định: chuẩn bị → bạn xem/chốt → tính → trả báo cáo. Chỉ gọi lưu khi bạn yêu cầu; chỉ tạo Excel khi cần file. Quyền ghi không tự cho phép lưu mọi kết quả.
- Cài bằng URL MCP chỉ thêm công cụ; không nên giả định toàn bộ file hướng dẫn trong ZIP đã được nạp. Chat phải gọi `get_workflow` để nhận hướng dẫn hiện tại từ máy chủ. Khi cài ZIP, kiểm tra có skill đi kèm.
- Đã cài mà thiếu công cụ: cập nhật kết nối và kiểm danh sách. Nếu chưa có MCP nhưng có công cụ gửi HTTP, dùng REST phiên tạm theo skills/dinh-duong-2598/references/rest-phien-tam.md. Không có cả hai thì link/QR/token không tự tạo khả năng gọi API.
- Token xác nhận từ prepare là dữ liệu kỹ thuật ngắn hạn, khác token API trong cài đặt kết nối. Không dán mật khẩu/token bí mật vào hội thoại.

- Phiên không tài khoản: start_guest_session → arguments.sessionToken cho công cụ kho chung/tính/xuất. Mã30phút, không lưu thực đơn hoặc mở thư viện riêng. Đọc guidance sau mỗi kết quả/lỗi và dừng chờ khi cần xác nhận.
- Dành cho bác sĩ: trang chủ có QR mở hướng dẫn từng bước; lời nhắn ngắn để dán vào chat đã bật kết nối. Chat tự xử lý token khi được yêu cầu tra/tính. Muốn lưu dùng lâu dài, xem get_workflow.accountUse và mục /ket-noi-ai/bat-dau#luu-lau-dai; đăng nhập web và kết nối chat là hai bước, giữ đầu vào và duyệt lại bằng identity tài khoản trước khi lưu.
