# Dinh dưỡng 2598 — plugin và hướng dẫn

- Đây là một plugin có15 công cụ; không cần cài từng công cụ thành plugin riêng.
- `plugin.json`: tên/mô tả. `mcp.json`: địa chỉ máy chủ và kết nối OAuth. `skills/dinh-duong-2598/SKILL.md`: quy trình hội thoại.
- [Bảng công cụ](skills/dinh-duong-2598/references/cong-cu.md): công cụ nào làm gì, nhận gì, kết quả nằm ở trường nào, bước tiếp theo và cách xử lý lỗi.
- Mặc định: chuẩn bị → bạn xem/chốt → tính → trả báo cáo. Chỉ gọi lưu khi bạn yêu cầu; chỉ tạo Excel khi cần file. Quyền ghi không tự cho phép lưu mọi kết quả.
- Cài bằng URL MCP chỉ thêm công cụ; không nên giả định toàn bộ file hướng dẫn trong ZIP đã được nạp. Chat phải gọi `get_workflow` để nhận hướng dẫn hiện tại từ máy chủ. Khi cài ZIP, kiểm tra có skill đi kèm.
- Đã cài mà thiếu công cụ: cập nhật kết nối và kiểm danh sách. Nếu phiên không cung cấp công cụ thì link/QR hoặc API token không tự tạo khả năng gọi API cho AI.
- Token xác nhận từ prepare là dữ liệu kỹ thuật ngắn hạn, khác token API trong cài đặt kết nối. Không dán mật khẩu/token bí mật vào hội thoại.
