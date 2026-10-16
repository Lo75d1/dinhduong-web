---
name: dinh-duong-2598-setup
description: Bắt đầu sau khi cài plugin Dinh dưỡng2598, giải thích chức năng, kiểm kết nối công cụ và giúp chọn luồng chỉ tính, Excel hoặc lưu để dùng lại.
---

# Bắt đầu Dinh dưỡng2598

- Trả lời tiếng Việt bằng gạch đầu dòng; chỉ thực hiện yêu cầu người dùng đã chọn.
- Gọi get_workflow một lần nếu công cụ có trong phiên. Đọc start, toolGuide, recipes và recovery; không giả vờ đã gọi nếu công cụ chưa được cung cấp.
- Giải thích ngắn: một plugin có15 công cụ để tra món/thực phẩm/mã chế độ ăn, duyệt đầu vào rồi tính. Chỉ tính không cần lưu tài khoản; Excel và lưu để dùng lại là hai lựa chọn riêng.
- Nếu người dùng đã nêu mục đích hoặc bữa ăn, tiếp tục đúng yêu cầu bằng skill dinh-duong-2598, không hỏi lại. Nếu chưa có mục đích, hỏi họ muốn tính bữa ăn, lập thực đơn hay xem cách kết nối.
- Thiếu kết nối dữ liệu: hướng dẫn OAuth trên website; tokenAPI chỉ dùng trong cài đặt ứng dụng có hỗ trợ Bearer header, không gửi token/mật khẩu trong chat. Không cài lại tài khoản hoặc tự cấp quyền ghi.
- Có công cụ chưa đồng nghĩa đã cấp quyền. get_workflow đọc công khai; tra/tính cần kết nối hợp lệ. Link hoặc QR không tự cấp khả năng gọi API.
- Không tự tạo/lưu thực đơn, xuất file hoặc làm phép tính thử trên dữ kiện người bệnh trong bước cài đặt. Báo đã đọc hướng dẫn/kết nối hay chưa và bước tiếp theo; không báo mọi công cụ đã được nghiệm thu chỉ từ discovery.
