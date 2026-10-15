# Excel chỉnh được

## Báo cáo đầy đủ dùng chung web và hội thoại (15/10/2026)

- Nút Excel ở chế độ một ngày và nhiều ngày dùng cùng `buildNutritionWorkbook` với hội thoại. Tải `.xlsx` thật qua `/api/nutrition-report/export`; không còn dùng hai bản XML `.xls` khác nhau tại các nút này. Route chỉ đọc dữ liệu và tạo file, không lưu khẩu phần hoặc sửa Food/Dish.
- `Bao cao`: tổng, trung bình ngày có nhập, mục tiêu, tỷ lệ, số dòng thiếu; các chỉ tiêu chính; `Thanh phan day du` có đủ 160 trường thành phần có thể tính. `Thuc don`: tên món, nguyên liệu, định lượng, số suất, nguồn. Nhiều ngày có `Dinh duong theo ngay` với từng chỉ tiêu/ngày. `Nguon doi soat` giữ nguồn và dấu vết công thức/thay nguyên liệu. Nhóm thực phẩm/đơn vị ăn, đi chợ và thuốc/TPBS một ngày vẫn được giữ.
- Mẫu in: Times New Roman, chữ đen/nền trắng, bảng đơn giản, A4 và lặp tiêu đề. Bỏ khung đóng băng; dòng/ngày dự phòng được nhóm hoặc ẩn. Dòng thiếu nguồn ghi `—` và số dòng thiếu; không biến thành 0. Không có mục tiêu thì nói rõ chưa đặt mốc, không để một bảng đối chiếu trắng.
- Đối chiếu schema: 162 trường thành phần dinh dưỡng dạng Float; 160 trường có metadata/đơn vị để tính, hai trường `vitAMgVdd` và `rniUnknownFattyAcidG` chỉ đối soát nguồn. Tỷ lệ thải bỏ là trường quy đổi riêng. Không gộp Đồng mg VDD với Đồng µg RNI; không tự coi Vitamin A RAE/RE/RNI hoặc các dạng folate là tương đương.
- `fields` trong API vẫn giới hạn 40 chất để giữ gọn hội thoại. Excel tự bổ sung toàn bộ trường báo cáo từ kho, không bắt AI liệt kê 160 tên. File nhập lại giữ nguyên danh sách chất của hội thoại, nhưng đọc được cả các cột nguồn tự nhập bổ sung; số sửa vẫn cần xác nhận lại nguồn như trước.
- Số tổng/đối chiếu/nhóm/đi chợ có kết quả lưu sẵn trong XLSX để trình xem không phải đợi Excel tính. Công thức vẫn được giữ; Excel tự tính lại khi sửa lượng, số suất, mã nguyên liệu hoặc mục tiêu. Thêm/bớt số dòng/ngày có thông báo yêu cầu xuất lại để cập nhật phạm vi các bản in chi tiết; tổng và các bảng tính nội bộ vẫn tính trên vùng nhập cho phép. Thay tên nhóm tự nhập ngoài danh sách cũng được báo chưa bao phủ đủ nhóm.
- Nút xuất web lấy dữ liệu hiện tại của kho. Trường nguồn bị cảnh báo chất lượng hoặc thiếu quy đổi có thể cho kết quả một phần khác bản chụp cũ trong trình duyệt; file ghi nguồn, cảnh báo và phần thiếu thay vì lấp bằng 0/1:1.
- Tái dùng rate limit PostgreSQL và cùng khóa xuất với hội thoại: tối đa 4 lần/phút theo nguồn web, 60 lần/giờ toàn hệ thống, chỉ một workbook tạo cùng lúc. Kiểm giới hạn bộ nhớ trước tạo ô, giữ giới hạn 5 MB/64 MB giải nén. Kỳ lớn có thể cần chia đợt để xuất đủ trường trên VPS 2 GB.
- Bộ dữ liệu quản trị `/api/admin/menu-analysis-export` cũng lấy đủ 162 trường nguồn, cùng kiểu chữ đen/nền trắng. `Khung_thuc_don` trong bộ dữ liệu này là mẫu trống để nhập mới, không phải bản khẩu phần đã lập. Phần Word cũ giữ nguyên trong đợt chỉnh Excel này.

## Vùng nhập

| Sheet | Người dùng sửa |
| --- | --- |
| `Nhap khau phan` | Ô nhập: ngày số, bữa/món, Food ID hoặc ID tự nhập, lượng g/ml, số suất, cơ sở khối lượng, hệ số/tỷ trọng và nguồn, chấp nhận tham chiếu, ghi chú. |
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
