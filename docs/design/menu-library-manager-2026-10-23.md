# Kho thực đơn: nhập liệu, xem nhanh và thao tác nhiều mục

Thay đổi theo yêu cầu ngày 23/10/2026. Đây là ghi nhận phạm vi triển khai, không phải bộ quy tắc thiết kế AI cho toàn trang. Các mẫu thiết kế toàn website vẫn để sau.

## Danh mục và thông tin

- Một thẻ cho một bộ thực đơn; đếm thực đơn từ bản ghi thật, số ngày lấy từ document. Không bung mỗi ngày thành một dòng khiến số đếm phình ra. Liên kết template/day/group cũ vẫn mở đúng ngày/khẩu phần.
- Cá thể, Tập thể, Bệnh viện. Bệnh viện gồm **Thực đơn bệnh lý** (khuyến nghị cho người bệnh) và **Suất ăn bệnh lý** (phục vụ người bệnh tại bệnh viện).
- Mỗi thẻ có tên, mô tả, năng lượng **mục tiêu**, số bữa đã khai báo/ngày, số ngày, đối tượng và hashtag. Không đoán phù hợp lâm sàng, không gọi full_day là đủ ngày, không tự sửa tiêu đề hoặc ẩn số liệu thiếu bằng số giả.
- Bỏ dàn bộ lọc phân loại; tìm tên, mô tả, đối tượng, món ăn trong mọi ngày và hashtag tại máy chủ trước phân trang. Giữ endpoint danh mục ngày cũ cho tương thích.

## Thao tác

- Thêm thực đơn bằng tay: chọn kho, đối tượng, kcal nếu có, mô tả/nhãn, số ngày và các bữa rồi nhập món. Editor sửa metadata, thêm ngày/bữa, món/nguyên liệu và hướng dẫn. Phần ghi chú/cách chế biến thu gọn trong màn nhập.
- Chọn nhiều thẻ, kể cả qua các kho/trang đã tải: xóa vào thùng rác, khôi phục, chuyển kho hoặc gắn hashtag. Xóa giữ nội dung và lịch sử để có thể khôi phục.
- Xem nhanh cạnh danh mục trên desktop, đưa phần đang xem lên trước trên màn hẹp. Chọn nhiều bữa; khay giữ lựa chọn khi mở thực đơn khác.
- Kéo bữa hoặc khay vào ô ngày để mở bản xem lại sao chép/chuyển. Nút Sao chép / chuyển bữa cho thao tác không kéo. Có thể chọn nhiều thực đơn nhận, chọn ngày và nhóm rõ ràng cho từng đích. Chuyển chỉ nhận một đích.
- Kéo tay nắm bữa để đổi thứ tự một hoặc nhiều bữa trong cùng ngày. Kéo tay nắm thẻ thực đơn sang tab kho để mở thao tác chuyển kho. Dùng dnd-kit hiện có với chuột, cảm ứng và bàn phím; vùng kéo tách khỏi thao tác cuộn.

## Dữ liệu và giới hạn

- `description?: string | null` và `tags?: string[]` bổ sung tương thích document cũ; không migration. Mô tả 1.000 ký tự; tối đa 20 nhãn, mỗi nhãn 50 ký tự. Đối tượng và kcal tiếp tục dùng các trường nhóm hiện có.
- Batch chỉ nhận tham chiếu ID/phiên bản và ngày/bữa/nhóm, không nhận định lượng do client gửi. Dữ liệu nguồn được đọc trong transaction, khóa theo thứ tự ổn định, kiểm tra mọi revision; ghi lịch sử và chống lặp qua DataChangeLog. Một đích lỗi làm rollback tất cả.
- Sao chép thêm nguyên bữa, giữ định lượng một suất chính xác kể cả lượng lẻ của nguồn cũ; không tự nhân số suất, đổi Food/Dish ID, tính lại kcal mục tiêu hoặc gán tuổi/chỉ định nguồn cho nhóm nhận. Quy tắc bữa tập thể và số người phục vụ không được sao chép sang nhóm khác. Bản thay đổi là nháp, cần rà lại trước khi duyệt.
- Mẫu nhiều nhóm/cấp học/quy tắc bữa tập thể không tự đổi thành một thực đơn cá thể. Có thể tạo thực đơn cá thể rồi sao chép khẩu phần nhóm đã chọn. Giới hạn hiện có 31 ngày, 8 bữa/ngày và 1.200 dòng nguyên liệu vẫn áp dụng; mỗi batch tối đa 50 thực đơn/50 bữa nguồn/20 đích.
- Không có thao tác ghi hoặc xóa thực đơn thật trong phiên lập trình này. Không có sửa đổi Food, Dish, KhuyenNghi, bộ tính hoặc triển khai VPS.

## Kiểm tra

- `npm run test:menu-library-manager`: 61 kiểm tra API/SQL trên PGlite và 53 DOM: quyền/CSRF, số đếm bộ, lọc trước phân trang, xóa/khôi phục, chọn bữa qua nhiều nguồn, nhiều đích, rollback khi đích sau lỗi, revision stale, gửi lại không nhân bản, giữ lượng nguồn, thêm ngày/bữa, hủy sửa và liên kết ngày hợp lệ.
- Hồi quy: 165 nguồn/quyền, 287 ghi/CSRF/OAuth, 26 UI biên tập/duyệt, 14 phân tích, SQL danh mục ngày, nội dung/schema và DOM chế biến/định lượng.
- TypeScript đạt; ESLint các tệp thay đổi được kiểm tra. Build biên dịch và tạo 86 trang, nhưng thoát mã 1 tại `SecurityFatalError` của Next 16.4.0 hiện có. Không gọi build phát hành đạt.
- DOM và PostgreSQL thử không thay cho nghiệm thu ảnh responsive hoặc thao tác kéo/cảm ứng trên thiết bị thật. Chưa có nghiệm thu đó, chưa merge/deploy. PR giữ draft.
