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
- Website phân tích một suất của từng nhóm/ngày; kcal và P–L–G tự tính khi mở hoặc sửa lượng. Admin lưu và duyệt phiên bản bằng thao tác riêng. Chưa có xuất đi chợ tập thể hay phê duyệt chuyên môn tự động.
- `null` là chưa biết, `0` là giá trị đã biết; không đổi hai trạng thái cho nhau. Không tự tạo Food ID, Recipe ID, RNI, mục tiêu hoặc số liệu dinh dưỡng.
- API danh sách bổ sung unitLabel/dayCount/groupCount/mealLabels; tìm tên mẫu hoặc đơn vị và lọc nhánh tại máy chủ trước phân trang. Chỉ trả dữ liệu tóm tắt, không gửi toàn bộ document ra danh sách.
