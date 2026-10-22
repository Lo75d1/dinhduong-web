# Dinh dưỡng 2598 — nguyên tắc giao diện

Bản ghi 21/10/2026. Đọc cùng `PRODUCT.md`; bằng chứng và hai phương án ở
`docs/design/menu-library-comparison-2026-10-21.md`.

## Hướng đã xác nhận

Đây là công cụ thao tác và đọc dữ liệu. Ưu tiên tìm đúng việc, xem đủ thông tin và quay lại
đúng chỗ. Giữ nhận diện bát/lá và phông Times; thay đổi bố cục không tự cấp quyền thay đổi
nội dung nghiệp vụ, nguồn dinh dưỡng hoặc engine.

| Vai trò | Token hiện có | Giá trị |
| --- | --- | --- |
| Nền ấm | `--background` | `#f7f6f2` |
| Bề mặt | `--clinical-paper` | `#ffffff` |
| Chữ chính | `--ink` | `#272c33` |
| Chữ phụ | `--muted` | `#626a6a` |
| Nhận diện, focus | `--brand` | `#0f766e` |
| Chọn | `--selected` | `#e7f1ed` |
| Phân cách | `--line` | `#dededa` |
| Viền điều khiển | `--control-line` | `#858a87` |
| Nhấn phụ | `--accent-ink` / `--accent-soft` | `#92462d` / `#faefe7` |

Người dùng đã chọn bố cục A cho kho mẫu. Nút Thêm qua AI xám than, danh sách một hàng mỗi mẫu, trợ giúp sau dữ liệu. Chỉ áp dụng thay đổi này cho kho mẫu; các nút khác giữ hệ thống hiện có. Nhãn bản nháp màu cam đất không biểu thị đã duyệt.

## Bố cục và chữ

- Một tiêu đề H1 rõ; màn thao tác không dùng hero, khẩu hiệu, hàng KPI hoặc minh họa chào mừng.
  Trong chi tiết thực đơn, khối kcal/P–L–G là số liệu làm việc theo yêu cầu 22/10/2026,
  đặt ngay trước bảng bữa/món; đây không phải chỉ số tổng quan của trang quản trị.
- Tìm/lọc và dữ liệu trước, trợ giúp thu gọn sau; giữ lối thêm mẫu dễ thấy và gọi đúng thao tác ủy quyền AI.
- Desktop tận dụng chiều rộng để nhìn tên mẫu, đơn vị, số ngày/nhóm và trạng thái. Mobile đổi cấu trúc hàng/pane; không chỉ thu nhỏ chữ.
- Chữ dữ liệu khoảng 16–17px với Times; H1 24–28px. Phụ chú nhỏ hơn nhưng tương phản đủ. Không ép mọi nhãn thành chữ đậm/xanh.
- Số có đơn vị, cột số căn phải khi so sánh dọc, dùng tabular figures. Tên dài được xuống dòng; không bỏ trường dữ liệu để vừa mobile.
- Khoảng cách theo nhịp 4px, mục liên quan gần nhau. Một bề mặt chính, viền mảnh hoặc bước nền; tránh lồng nhiều thẻ.

## Điều khiển và trạng thái

- Mỗi nút có nhãn rõ; icon Lucide cùng bộ, thường 16–20px, không thêm ô màu quanh từng icon. Ghi công/giấy phép ở `docs/design/asset-sources.md`.
- Vùng chạm tối thiểu 44px. Focus nhìn được, Tab theo thứ tự đọc, native select/input; không phụ thuộc hover.
- Thiếu số suất hiển thị dấu — và “Chưa nhập”; 0 hiển thị 0. Chưa đủ dữ liệu không hiện phần trăm đạt hay kết quả tính.
- Kho trống có hành động thêm mẫu; lọc không khớp có xóa bộ lọc. Loading/error phải nằm ở vùng dữ liệu khi nối API thật.
- Mở chi tiết trên điện thoại dùng một vùng tại một thời điểm. Quay lại giữ vị trí cuộn và focus về hàng đã chọn.
- Tìm, lọc, đổi ngày/nhóm phản hồi tức thì. Không thêm animation tải trang hoặc trì hoãn thao tác lặp; hiệu ứng phải có mục đích và hỗ trợ giảm chuyển động.

## Cách làm ở các lần sau

1. Đọc bối cảnh, contract và dữ liệu thật của màn. Viết rõ việc thường làm nhất.
2. Khi đổi cách tổ chức, đưa các phương án có khác biệt về thứ tự/nhóm thông tin; giữ cùng dữ liệu, phông và màu để so sánh.
3. Tạo bản bấm được bằng stack hiện có; không thêm framework hoặc phụ thuộc chỉ để đổi vẻ ngoài.
4. Xem render desktop/tablet/mobile, thử bàn phím, lọc, trạng thái trống và dữ liệu dài. Sửa theo ảnh, không chỉ theo mã.
5. Ghi lại phạm vi thật: fixture hay dữ liệu máy chủ, cục bộ hay VPS, kiểm đã chạy hay chưa. Không gọi kiểm nội bộ là nghiên cứu người dùng hoặc phê duyệt chuyên môn.

Các tài liệu Emil/Impeccable/Taste được đọc và vận dụng chọn lọc theo brief, không được cài
thành bộ lệnh tự động trong dự án. Không đổi phông/màu đã chốt chỉ vì quy tắc thị hiếu của nguồn.

## Chi tiết thực đơn cho bác sĩ — bổ sung 22/10/2026

Ưu tiên bữa ăn, món ăn, thực phẩm, lượng và tỷ lệ P–L–G. Tự tính khi mở/sửa lượng;
phân tích vi chất, nguồn và lịch sử thu gọn phía dưới. Không đưa JSON/ID/lý do kỹ thuật
lên vùng đọc món. Giữ số liệu thiếu rõ ràng. Quyết định lưu và duyệt vẫn do người dùng.
Brief, nguồn tham khảo và giới hạn kiểm tra: `docs/design/clinical-menu-2026-10-22.md`.
