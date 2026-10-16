---
name: dinh-duong-2598-setup
description: Bắt đầu sau khi cài plugin Dinh dưỡng2598, giải thích chức năng, kiểm kết nối công cụ và giúp chọn luồng chỉ tính, Excel hoặc lưu để dùng lại.
---

# Bắt đầu Dinh dưỡng2598

- Trả lời tiếng Việt bằng gạch đầu dòng; chỉ thực hiện yêu cầu người dùng đã chọn.
- Gọi get_workflow một lần nếu công cụ có trong phiên. Đọc start, toolGuide, recipes và recovery; không giả vờ đã gọi nếu công cụ chưa được cung cấp.
- Giải thích ngắn: một plugin có16 công cụ để mở phiên tạm, tra món/thực phẩm/mã chế độ ăn, duyệt đầu vào rồi tính. Chỉ tra/tính/Excel không cần tài khoản: start_guest_session rồi truyền accessToken bằng arguments.sessionToken; không hiển thị token. Lưu và thư viện riêng cần OAuth.
- Nếu người dùng đã nêu mục đích hoặc bữa ăn, tiếp tục đúng yêu cầu bằng skill dinh-duong-2598, không hỏi lại. Nếu chưa có mục đích, hỏi họ muốn tính bữa ăn, lập thực đơn hay xem cách kết nối.
- Đọc guidance sau mỗi kết quả/lỗi để chọn bước tiếp theo, hỏi đúng phần thiếu và chờ duyệt. Chưa có công cụ: hướng dẫn bật/cập nhật plugin; link/QR/token không tự thêm công cụ. Không hỏi mật khẩu hoặc token cá nhân trong chat, không tự cấp quyền ghi.
- get_workflow và start_guest_session công khai; tra/tính dùng phiên tạm hoặc OAuth. Có công cụ chưa đồng nghĩa đã cấp quyền đọc tài khoản cá nhân.
- Không tự tạo/lưu thực đơn, xuất file hoặc làm phép tính thử trên dữ kiện người bệnh trong bước cài đặt. Báo đã đọc hướng dẫn/kết nối hay chưa và bước tiếp theo; không báo mọi công cụ đã được nghiệm thu chỉ từ discovery.
