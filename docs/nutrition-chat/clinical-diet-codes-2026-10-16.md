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
- Không coi fixture là kiểm VPS hay hội thoại nền tảng thật. Kết quả thực tế bên dưới được đo riêng sau triển khai.

## Nghiệm thu VPS thực tế

- Source app `5901e2f1d7a76d69d6a7973df2c43be6edbbd37b`, build Linux và thay app thành công; HTTPS health ok, Docker healthy/OOMKilled=false. Backup rollback `/opt/dinhduong-release-backups/nutrition-clinical-20261016-150801-codex`. Nhánh `codex/nutrition-chat-api`, PR#4 giữ draft/chưa merge main; triển khai trực tiếp theo quyền chủ dự án đã cấp trước đó. Không áp migration.
- HTTPS58 đạt: discovery15tool và schema/hướng dẫn mới; tìm không dấu/đọc GU01-X trong nguồn thật; sai bộ lọc/trường ngoài schema/mã không tồn tại bị từ chối. Proposed và sai đối tượng không chốt được, sửa context với ticket cũ trả409. Lưu/mở/history và owner404/anonymous401 đạt; calculate không tạo file. Trang bản lưu trả200 nhưng chỉ shell được kiểm bằng HTTP, không coi là đã render tương tác phía client.
- Hai tài khoản kiểm thử tạm, tên và ghi chú nêu rõ không phải người bệnh; một thực đơn hai ngày dùng Food có thật để kiểm số học. Không dùng fixture làm khuyến nghị điều trị. Trung bình năng lượng534, tổng1068; lưu context thay đổi thành revision2 cùng link, lịch sử clinicalChange nằm trong JSON riêng, không thay đổi dòng thực phẩm.
- File Excel xuất theo yêu cầu1.583.588byte: native Excel12 kiểm tra đạt, sửa lượng100→1000 làm trung bình534→2136 và đối chiếu cập nhật; mốc nguồn1600–1800 giữ nguyên, mọi sheet không lỗi công thức. SaveAs/parser giữ mã và lượng. Báo cáo in4trang, phần bệnh lý gọn tại trang4/4 đã xem ảnh thực tế, không tách cảnh báo sang trang rời.
- Native import/update/package19 đạt qua HTTPS: file Excel SaveAs được server tính lại2136, giữ ID mã và đọc nguồn hiện tại; cập nhật revision3 cùng URL, lịch sử thay đúng lượng. Tool bệnh lý MCP không có bearer trả401 với scope nutrition:read; SHA các gói plugin/skill/TXT công khai khớp file phát hành. Gói plugin version1.0.3.
- React dùng dữ liệu VPS kiểm7 nội dung/nhánh mobile/lựa chọn và parser native2 đạt. CUA inventory apps/browsers rỗng: chưa kiểm hình ảnh/click/hydration desktop/mobile, chưa xác nhận ChatGPT/Claude/Gemini đã làm mới tool hoặc thực hiện hội thoại thật. Người dùng có thể cần cập nhật kết nối để nhận hai tool mới; không giả lập thành nghiệm thu nền tảng.
- Dọn chính xác1Ration/2session/2user của fixture, còn0; xóa context chứa token khỏi container và backup. Count/digest trước–sau của foods3719, dishes7369, dish_ingredients41457, diet_codes246, nutrition_recommendations72 giữ nguyên;25migration, env/layout/Caddy/Google giữ nguyên. Maintenance timer active/enabled, swap tạm đã gỡ. Một lần đọc DB sau thay app lỗi kết nối; kiểm lại có giới hạn đạt, không suy lỗi DB đồng nghĩa app hỏng.
