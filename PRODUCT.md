# Dinh dưỡng 2598 — bối cảnh sản phẩm

Nguồn sự thật: yêu cầu chủ dự án, `src/lib/menu-library/contracts.ts`, các trang và API
hiện có; trạng thái triển khai ở `PROJECT_STATUS.md`. Tài liệu thiết kế bên ngoài chỉ là
tham khảo, không cấp quyền Admin và không thay đổi quy tắc dinh dưỡng.

## Người dùng và công việc

- Người tra cứu thực phẩm, công thức và phân tích khẩu phần cá nhân; người quản trị kho dữ liệu và mẫu.
- Kho mẫu có hai nhánh cá nhân/tập thể. Tập thể đi theo đơn vị → nhóm người ăn → mẫu áp dụng → ngày → bữa → món → nguyên liệu.
- Một đơn vị có nhiều cấp học/nhóm tuổi, mỗi nhóm có định lượng và số suất theo ngày/bữa. Không lấy một mức năng lượng cho cả trường.
- Cá nhân có tuổi, giới, hoạt động, mục tiêu và chế độ ăn riêng; bệnh viện là bối cảnh, tăng/giảm cân là mục tiêu.

## Khả năng thực tế và giới hạn

- Admin đọc, lưu và sửa bản nháp qua API kho mẫu, có revision/lịch sử. OAuth cần Admin chủ động ủy quyền, có hạn và thu hồi được.
- Chưa có máy tính dinh dưỡng nhiều nhóm, xuất đi chợ tập thể hoặc quy trình phê duyệt chuyên môn tự động. Không thêm nút thể hiện các chức năng này đã có.
- `null` là chưa biết, `0` là giá trị đã biết; không đổi hai trạng thái cho nhau. Không tự tạo Food ID, Recipe ID, RNI, mục tiêu hoặc số liệu dinh dưỡng.
- API danh sách bổ sung unitLabel/dayCount/groupCount/mealLabels cho bố cục A; tìm tên mẫu hoặc đơn vị và lọc nhánh tại máy chủ trước phân trang. Chỉ trả dữ liệu tóm tắt, không gửi toàn bộ document ra danh sách.

## Cam kết giao diện

Giữ Times New Roman/Times/serif, chữ và số rõ. Chủ dự án không thích phủ xanh ngọc toàn màn,
các thẻ giống nhau, nút và hướng dẫn lớn đẩy dữ liệu xuống. Hướng dẫn gom vào một phần trắng
thu gọn. Màu trung tính, xanh ở nhận diện/hành động/chọn; nhấn cam đất nhỏ. Không thêm lại
nút “Thông tin mới” đã được yêu cầu bỏ.

## Phương án đã chọn

Hai mẫu bố cục A/B dùng cùng năm fixture tại `docs/design/prototypes/`, mở bằng HTML độc lập
trong `docs/design/previews/`. A ưu tiên tìm danh sách, B ưu tiên đơn vị và các ngày/bữa.
Người dùng đã chọn A. Mã nguồn kho mẫu áp dụng danh sách A, mở chi tiết riêng; header kho mẫu thu gọn trên điện thoại, vẫn đủ điều hướng trong Menu. Hai HTML prototype dùng dữ liệu minh họa để tham khảo, không ghi vào kho. Bản triển khai A đã được người dùng cho phép chuyển giao lên GitHub, chưa triển khai VPS; xem PROJECT_STATUS.md.
