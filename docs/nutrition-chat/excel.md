# Excel chỉnh được

## Vùng nhập

| Sheet | Người dùng sửa |
| --- | --- |
| `Nhap khau phan` | Ô vàng: ngày số, bữa/món, Food ID hoặc ID tự nhập, lượng g/ml, số suất, cơ sở khối lượng, hệ số/tỷ trọng và nguồn, chấp nhận tham chiếu, ghi chú. |
| `Ngay va muc tieu` | Nhãn/ngày ISO và mục tiêu có nguồn. Không có mục tiêu thì chỉ tính thành phần. |
| `Tu nhap` | Nguyên liệu ngoài kho: ID/tên, nguồn, đơn vị/cơ sở và các chất xác minh được; chất chưa có giữ trống. |
| `Du lieu` | Dữ liệu nguồn nhúng được bảo vệ; không sửa nutrient kho bằng cách sửa riêng ô này. |
| `Phan tich`, `Di cho` | Công thức tổng hợp từ đầu vào, phần phân tích và biểu đồ. |
| `Theo bua`, `Theo mon` | Tổng theo bữa/món được nối với bảng nhập; dữ liệu thiếu giữ trạng thái riêng. |
| `Doi chieu` | Các mục tiêu đã chọn, nguồn và đối chiếu; không kết luận đủ khi tổng dinh dưỡng chưa đầy đủ. |

- Chọn lại nguyên liệu bằng ID đã có trong dữ liệu nhúng. Excel offline không tự tra thực phẩm mới trên server.
- Thay tên không thay dữ liệu số. Đổi Food ID đúng để đổi nguyên liệu; nguồn ngoài kho có ID ở `Tu nhap`.
- Tối đa 90 ngày, 1.000 dòng khẩu phần và 100 nguồn tự nhập theo parser. Số hàng chừa sẵn khi xuất có thể ít hơn 1.000; chỉ sửa vùng nhập được hỗ trợ của file.
- `quantity × servings` là lượng thực dùng. Nếu lượng đã là tổng cho cả nhóm thì số suất bằng 1.
- Dữ liệu thiếu không trở thành 0. Tổng chỉ gồm phần xác định được phải báo thiếu; quy đổi sống/chín hoặc ml/g cần nguồn phù hợp.
- Nhận xét AI là snapshot tại thời điểm xuất; sửa đầu vào không làm nhận xét tự viết lại. Dùng thông báo trên sheet phân tích để biết bản đã thay đổi.
- Mục tiêu xuất từ hồ sơ là số mục tiêu cùng nguồn tại thời điểm tính. Khi nhập lại Excel, mục tiêu được đọc như mục tiêu thủ công có nguồn; không tự suy ra một hồ sơ cơ thể mới từ các số đó.

## Gửi bản cuối

1. Đăng nhập `/ket-noi-ai`, chọn file hệ thống đã xuất, bấm **Xem trước đầu vào**.
2. Kiểm tra từng ngày, dòng nguyên liệu, nguồn, phần thiếu và mục tiêu. File tải lên không chạy macro/công thức; server lấy đầu vào rồi tính lại.
   - Khi số/portion của nguyên liệu tự nhập đã đổi, nguồn trở thành **người dùng điều chỉnh**, chưa xác nhận. Trang nhập hiển thị các số, đơn vị, cơ sở phần, thải bỏ và nguồn để bạn bấm **Xác nhận số liệu tôi đã sửa**. Hệ thống chuẩn bị lại preview; bạn vẫn cần chốt toàn bản sau đó. Không tự giữ dấu “nhãn/tài liệu đã xác nhận” cho số đã sửa.
3. Xem phân tích theo ngày/bữa/món và nguồn mục tiêu; tích xác nhận bản đã xem; **lưu bản mới** hoặc **xuất lại Excel**. Không tự ghi đè bản cũ. Quy trình sửa bản đã lưu trong hội thoại dùng ID và revision để tránh ghi đè xung đột.

Mở danh sách tại `/ket-noi-ai/ban-luu` và từng bản tại `/ket-noi-ai/ban-luu/[id]` bằng tài khoản chủ sở hữu. Trang riêng tính lại theo nguồn hiện tại, báo khi nguồn khác lần lưu và cho xuất Excel sau khi xác nhận; không mở bằng công cụ cũ rồi gộp nhầm nhiều ngày thành một ngày.

Khi cập nhật cùng ID, hệ thống giữ dấu vết đầu vào trước/sau của phần đổi, nguồn, revision và thời điểm xác nhận cho tối đa 20 lần lưu gần nhất. API trả lịch sử cùng cờ khi đã rút bớt; trang xem hiện tại chưa có màn hình duyệt lịch sử.

Muốn bỏ bản không dùng: bấm **Xóa bản này**, xem tên bản trong hộp xác nhận rồi chọn giữ hoặc xác nhận xóa. Hệ thống kiểm tra chủ sở hữu/revision trước khi xóa; file Excel đã tải trên máy không bị xóa theo.

REST dành cho ứng dụng: multipart trường `file`, `POST /api/nutrition/v1/import` với phiên web hoặc OAuth hợp lệ. Không gửi URL bên ngoài. Không đăng công thức người dùng vào kho chung.

## Kiểm chứng khi nghiệm thu

- Mở bằng Excel thực tế, bật tính tự động: đổi gram/số suất/Food ID/ngày/bữa → tổng và biểu đồ cập nhật, khớp server khi nhập lại.
- Thử mục tiêu có nguồn/không có mục tiêu; một chất nguồn thiếu, thực phẩm tự nhập và quy đổi có/thiếu nguồn.
- File đổi số tổng nhưng không đổi đầu vào phải cho cùng kết quả server. File có macro/liên kết ngoài/công thức ở ô nhập phải bị từ chối theo parser.
- Trình xem khác Excel cần thử riêng. Bảo vệ sheet chống sửa nhầm không phải mã hóa file; file tải về có dữ liệu người dùng chọn.
