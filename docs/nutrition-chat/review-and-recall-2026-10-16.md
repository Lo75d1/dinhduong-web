# Hướng dẫn hội thoại, duyệt đầu vào và phiếu 24 giờ — 16/10/2026

## Phạm vi và nguồn

- Theo tài liệu người dùng `Huong_dan_AI_xay_dung_thuc_don_Viet_Nam-2.docx` (v1.3, 16/10/2026): giữ thói quen và món đã chọn; hỏi phần còn thiếu; đưa lựa chọn thực tế; phân biệt nguyên liệu RNI với món VDD; không bịa quy đổi hoặc vi chất.
- Đối chiếu Quyết định 2598/QĐ-BYT năm 2025, mục Điều tra khẩu phần: Phụ lục 1 Phiếu điều tra hỏi ghi khẩu phần 24H (9 cột) và Phụ lục 2 Bảng quy đổi năng lượng và thành phần dinh dưỡng (7 cột). PDF tham khảo trong kho: trang vật lý 76–77, trang in 64–65. [Văn bản đối chiếu](https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-2598-QD-BYT-2025-tai-lieu-chuyen-mon-quy-trinh-ky-thuat-Dinh-duong-lam-sang-669627.aspx).
- Chỉ mở rộng luồng Nutrition Chat/Ration và bộ xuất chung đang có; không dựng bộ tính, kho tìm kiếm, bảng hay migration mới. Không sửa Food/Dish/nguyên liệu canonical.

## Hành vi

- `get_workflow.menuGuidance`, hướng dẫn khởi đầu và skill dùng chung chính sách hội thoại. Không ép đổi món, tự chọn kết quả đầu hoặc dùng thực phẩm khác thay món mà chưa hỏi. Không áp số liệu bệnh lý thiếu nguồn/chỉ định.
- `prepare` trả thêm `review.text`: ngày/bữa/món/nguyên liệu, lượng, suất, cơ sở khối lượng và nguồn, kèm phần còn thiếu. Tối đa 100 dòng hiển thị, báo rõ nếu cắt; đầu vào đầy đủ vẫn được giữ. Phải duyệt lại sau mỗi sửa đổi.
- `calculate` giữ báo cáo chi tiết cũ, thêm `chatReport.summaryText` ngắn. Sau khi xác nhận, lưu bản cá nhân theo quyền hiện có, trả tóm tắt năng lượng/P–L–G và link `ration.url`. Mở link xem tính toán; Excel chỉ tạo khi có yêu cầu hoặc bấm tải.
- Mọi số AI tự điền trong dòng khẩu phần/nguồn riêng được khai báo bằng `aiFilledFields` và hiện dấu `*` trước số; số vẫn là kiểu number. Số hệ thống tính từ dữ liệu là kết quả tính, không tự gắn thành số AI. Không tự bịa hồ sơ hoặc mục tiêu lâm sàng.
- Thêm metadata tùy chọn `mealTime`, `householdMeasure`, `sourceState`. Dữ liệu cũ vẫn hợp lệ. `sourceState` xác nhận trạng thái của dữ liệu dinh dưỡng, không suy từ chữ “chín” của lượng ăn. Không có cơ sở sống sạch thì để `—`, không suy món VDD thành nguyên liệu.
- Sửa lỗi nguồn món VDD MA: công thức catalog không có Dish ID chỉ được chấp nhận khi Food canonical thực sự là món VDD; nhãn nguồn lấy từ máy chủ. Các trường hợp khác vẫn phải có Dish ID hợp lệ.
- Bản lưu khẩu phần 24h có phiếu 9 cột trên web, thẻ đọc trên điện thoại và bảng quy đổi. Tên/ngày sinh/ngày phỏng vấn chưa có để trống; ngày ăn không bị coi thành ngày phỏng vấn.
- Excel 24h có hai sheet đầu `Phieu 24h`/`Quy doi 24h`, theo ngày, in A4, Times New Roman 15, không trang trí màu. Tiếp tục sửa ở `Nhap khau phan`; công thức hiện có cập nhật báo cáo. Món VDD giữ cả món; không tạo dòng nguyên liệu giả. Nguồn chính rút gọn, đối soát đầy đủ giữ ở sheet riêng.
- Đánh dấu `*` bằng định dạng có điều kiện, không biến số thành chuỗi. Khi người dùng sửa số, dấu tương ứng mất; số dẫn xuất vẫn mang dấu nếu còn hệ số AI chưa sửa. Import giữ metadata còn hợp lệ, bỏ dấu/số đo gia dụng cũ khi lượng thay đổi; đổi Food ID bỏ trạng thái nguồn và nguồn hệ số cũ.

## Kiểm chứng trước triển khai

- Prisma generate, TypeScript và lint các file thay đổi đạt. Bộ kiểm thử Nutrition Chat đạt, gồm core67/report37/security89/OAuth261/storage87/HTTP201/library60, bộ Excel/đủ chất và review51.
- Native Microsoft Excel: 28 kiểm tra, thay lượng và hệ số cập nhật đúng, nguồn thay đổi không giữ số sống sạch cũ, không lỗi công thức. Đã xem đủ 4 trang in của hai phụ lục cho fixture hai ngày.
- Chưa coi các thử tìm kiếm trong DOCX là kết quả đo máy chủ hiện tại; không viết lại thuật toán tìm kiếm trong đợt này. Không coi việc sửa hướng dẫn là đã nghiệm thu hội thoại trên tài khoản ChatGPT/Claude/Gemini thật.

## Nghiệm thu VPS

- Ghi sau khi triển khai và kiểm tra HTTPS, trình duyệt, file Excel thật, quyền sở hữu và dọn fixture hoàn tất.
