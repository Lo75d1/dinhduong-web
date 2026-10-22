# Chi tiết kho thực đơn cho bác sĩ dinh dưỡng

Brief xác nhận trong hội thoại 22/10/2026: tập trung bữa → món → thực phẩm và định lượng,
tỷ lệ P–L–G; phân tích chi tiết ở dưới. Tính ngay, không yêu cầu bấm thêm bước phân tích.
Giữ nền trắng ấm, Times và bố cục danh sách A của kho. Không có yêu cầu thay nguồn dinh dưỡng.

## Quyết định bố cục

Đã cân nhắc vùng món + bảng chỉ số song song và bảng thực đơn liền mạch với chi tiết ở dưới.
Chọn bảng liền mạch theo chỉ dẫn trực tiếp của người dùng. Kcal/P–L–G là khối ngắn ngay
trước bữa; từng bữa có tên rõ và năng lượng riêng, món ở cột trái, thực phẩm và gram ở cột phải.
Điện thoại chuyển tên món lên dòng riêng, giữ từng tên thực phẩm và lượng trong cùng hàng.
Không thu gọn toàn bộ nguyên liệu hoặc rút còn mỗi tên món.

Chỉnh khẩu phần vào cùng ngữ cảnh ngày/nhóm/bữa. Sửa gram tự tính lại sau 450ms; số liệu
đang tính không hiển thị như kết quả đã cập nhật. Ô trống không tự thành 0. Tính thử không
lưu hoặc duyệt. Lưu thay đổi tạo phiên bản mới; duyệt mở phần xác nhận riêng ở cuối bảng.

Nhãn chỉ dùng từ chuyên môn và thao tác quen: Chỉnh khẩu phần, Thêm món ăn, Thêm thực phẩm,
Lưu thay đổi, Duyệt mẫu này. Mã và lịch sử phục vụ tra cứu ở lớp chi tiết. Tên nguồn không bị
xóa khỏi dữ liệu: chỉ rút phần dịch tiếng Anh trên bảng món, giữ tên đầy đủ trong tooltip/nguồn.
Số kcal trong tiêu đề chỉ là nhãn; không được đọc nó thành mục tiêu tính hoặc nguồn nhu cầu.

## Tham khảo đã đọc

- NHS, Table: https://service-manual.nhs.uk/design-system/components/table — bảng để rà,
  so sánh dữ liệu có cấu trúc; giới hạn lượng dữ liệu đồng thời, chú ý bảng phức tạp trên mobile.
- NHS, Details: https://service-manual.nhs.uk/design-system/components/details — cho mở
  thêm thông tin ít dùng để giúp trang dễ đọc lướt.
- AHRQ PSNet, Electronic Health Records:
  https://psnet.ahrq.gov/primer/electronic-health-records — rủi ro từ hiển thị thông tin,
  điều hướng phức tạp và luồng phần mềm lệch công việc lâm sàng.

Đây là căn cứ thiết kế tương tác, không phải nguồn mục tiêu hay tỷ lệ dinh dưỡng. Chưa có
nghiên cứu người dùng với bác sĩ thật; nhận xét của chủ dự án là brief, không phải kết quả thử nghiệm.

## Kiểm tra và bản xem

`ClinicalMenuPreview.tsx` dùng component thật và thực đơn minh họa độc lập, dùng dữ liệu thực phẩm
công khai có ID/nguồn thật. Không đưa mẫu Admin riêng hoặc dữ liệu người bệnh vào repo.
Kcal minh họa 1458,67; thay gạo bữa sáng 40g → 50g cho kết quả 1493,27 kcal.
P/L/G thiếu số liệu vẫn hiển thị phần đã biết và không tạo tỷ lệ đủ 100%. Bản xem không gọi
API thật, từ chối lưu/duyệt; không phải một thực đơn mới được phê duyệt.

Chromium thật chạy ở 1440, 1024, 768, 390, 360, 320px. Kiểm tra tự tính, đổi lượng,
ô trống, thu gọn chi tiết, không tràn ngang và không lỗi JavaScript; ảnh desktop, mobile,
đang chỉnh nằm ở `docs/design/previews/`. Không phải nghiệm thu Admin trên VPS thật.
Kiểm tra tuyến máy chủ dùng PGlite/session fixture để xác nhận tính thử không ghi dữ liệu,
bản chưa lưu không thể được duyệt thay cho bản đã lưu, và vẫn chặn Origin/CSRF sai.
