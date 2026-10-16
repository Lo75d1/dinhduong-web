# Mã chế độ ăn bệnh lý trong Nutrition Chat — 16/10/2026

## Phạm vi và tái dùng

- Theo yêu cầu chủ dự án: chat tra mã, đọc ghi chú, làm rõ thông tin liên quan, trình để xác nhận, lưu mã cùng khẩu phần và đối chiếu trên web/Excel.
- Tái dùng bảng DietCode/MCDA246 dòng và API `/api/diet-codes`, bộ tính dinh dưỡng, Ration JSON/version/owner/ticket và builder/parser Excel hiện có. Không model/bảng/migration mới; không sửa canonical hoặc chạy seed. Không dựng module chỉ định/báo suất ăn thay thế.
- Nguồn là bảng MCDA trong dữ liệu dự án, không tuyên bố mọi khoảng đã được đối chiếu lại với văn bản gốc hay là chỉ định cá nhân. Trang tham khảo hiện có QĐ2879/QĐ-BYT về chế độ ăn bệnh viện; QĐ2598 liên quan quy trình/biểu mẫu, không tự lấy tên dự án làm nguồn tất cả ngưỡng.

## Luồng và hợp đồng

- Thêm hai tool read: `search_diet_codes` (tên bệnh/mã, đối tượng, nhóm bệnh, phân trang; tìm không dấu) và `get_diet_code` (ID thật, khoảng, ghi chú, nguồn và phần cần làm rõ). Tổng15tool; quyền OAuth không mở rộng ngoài nutrition:read hiện có. REST dùng cùng dispatcher/schema/kiểm Origin/session/bearer.
- MenuInput1.0 thêm `clinicalContext` tùy chọn: conditions/notes chỉ dữ kiện đã cung cấp, targetGroup, dietCodeId, selection. Có ID phải có đối tượng và trạng thái. Proposed chưa được chốt; user_confirmed là người dùng chọn, prescribed là chỉ định họ cung cấp, không phải hệ thống xác minh chuyên môn. ID không có trong kho trả404; sai đối tượng hoặc mã đang proposed tạo missingInputs và chặn chốt.
- Chuẩn bị đọc nguồn mã từ server, ký digest gồm context và snapshot mã. Mã/ghi chú nguồn đổi làm xác nhận cũ mất hiệu lực; mở lại tính theo nguồn hiện tại và báo sourceChanged. Private Ration giữ context/snapshot và lịch sử thay đổi riêng, không đưa dữ kiện sức khỏe vào audit công khai.
- Skill, get_workflow/menuGuidance/clinicalWorkflow và QR/TXT chung hướng dẫn: hỏi phần còn thiếu liên quan, không tự chẩn đoán/chọn dòng đầu/ghép nhiều mã/suy ý nghĩa hậu tố, không tự điền không bệnh/không dị ứng. Không có mã vẫn tính thành phần, không kết luận đã đối chiếu bệnh lý.

## Đối chiếu và đầu ra

- Khoảng MCDA đứng riêng với mục tiêu manual/profile; không ép khoảng min/max thành một mốc. So sánh năng lượng/P/L/G/Natri/Kali và số bữa theo ngày/trung bình ngày có đầu vào; ngày trống không thành0. Thiếu nguồn hoặc có ước tính thì không kết luận chắc chắn; 0 có nguồn vẫn là0.
- Ghi chú theo kg cân nặng giữ nguyên và cảnh báo cần làm rõ riêng. Các cột nước tên ml có giá trị như1,5 chưa xác minh đơn vị: giữ số nguồn với unitVerified=false, không đổi lít/ml và không đưa nước vào đối chiếu. Không sửa số của kho để che bẫy dữ liệu.
- Bản duyệt có tình trạng/chỉ định đã cung cấp, mã/tên/đối tượng/nguồn trạng thái. Báo cáo chat ngắn thêm mã, báo cáo chi tiết có bảng khoảng và ghi chú. Web có mục đọc kết quả; biểu mẫu dùng lại có sửa dữ kiện/chọn đối tượng/mã/trạng thái, mọi sửa cần prepare/xác nhận lại.
- Excel giữ clinicalContext trong metadata để nhập lại; mã/tình trạng chỉnh trên web/chat. Bao cao thêm phần lâm sàng riêng, sáu chỉ tiêu liên kết công thức tính hiện có; số bữa tham khảo/ghi chú trình riêng, đối chiếu số bữa chi tiết trên web. Nhập lại bỏ qua mọi kết luận/cached range trong file và đọc lại mã từ server. Nguồn/mã trong metadata không được coi là chỉ định đã thẩm định.

## Kiểm chứng phát triển

- Prisma generate/TypeScript/ESLint file sửa đạt. Full suite: core67/report37/security89/OAuth261/storage98/HTTP220/library60, bộ workbook/complete-report/review51, clinical49 đạt. Storage kiểm mã nguồn đổi làm hỏng ticket cũ, proposed chặn chốt, lưu/mở/history/owner; HTTP kiểm read tool/quyền/trường ngoài schema.
- Clinical fixture49: khoảng min/max/zero/null/estimated/empty day/mismatch, nguồn/digest và metadata/import. Native Excel20: sửa lượng cập nhật mean/range/day counts, nguồn thiếu giữ—, ước tính không kết luận, scan công thức, SaveAs và bản in. Gói plugin/skill1.0.3 đã đóng lại.
- Chưa coi fixture là kiểm VPS hay hội thoại nền tảng thật; nghiệm thu thực tế bổ sung sau triển khai.
