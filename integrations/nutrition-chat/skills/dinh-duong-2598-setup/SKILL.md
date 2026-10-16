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
- Người dùng có thể là bác sĩ chưa quen kỹ thuật: chỉ tên nút và một vài bước ngắn, không yêu cầu học tên tool/JSON hoặc tự tạo/sao chép token. Khi có công cụ và được yêu cầu tra/tính/Excel, tự mở phiên còn thiếu; không tự mở phiên chỉ để giới thiệu cách dùng.
- Muốn dùng lâu dài: đọc get_workflow.accountUse; hướng dẫn Đăng ký mới/Đăng nhập trên website rồi quay lại chat kết nối tài khoản. Giữ đầu vào khi chuyển từ guest sang tài khoản, prepare lại và chờ duyệt trước lưu; không dùng ticket guest để save. Không báo lưu thành công khi chưa có ration.url thật.
- Không tự tạo/lưu thực đơn, xuất file hoặc làm phép tính thử trên dữ kiện người bệnh trong bước cài đặt. Báo đã đọc hướng dẫn/kết nối hay chưa và bước tiếp theo; không báo mọi công cụ đã được nghiệm thu chỉ từ discovery.

- Kết quả ưu tiên webUrl thật để xem/sửa/tính lại trên web không đăng nhập; đầu vào giữ tạm30phút, không phải lưu tài khoản. prepare có link bản nháp, calculate có link bản đã tính. Excel là tải thêm. Đọc menuGuidance về nước chấm khi có món luộc/hấp, không tự thêm vào lịch sử24giờ.
