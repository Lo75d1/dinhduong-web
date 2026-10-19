# Excel từng ngày và thao tác nhập thực đơn nhiều ngày — 19/10/2026

Cha mẹ cần nhận từng ngày riêng, trong khi bản Excel cũ dồn thực đơn cả kỳ vào một sheet. Chế độ nhiều ngày cũng thiếu các thao tác nhập thực phẩm ngoài hệ thống và AI đang có ở chế độ một ngày.

## Kết quả

- Excel cả kỳ có thêm `Ngay 01`, `Ngay 02`… cho mọi ngày, kể cả ngày chưa nhập; mở sẵn sheet ngày đầu. Mỗi sheet chỉ có bữa, món, nguyên liệu và tổng dinh dưỡng của ngày đó. Giữ báo cáo tổng kỳ và các sheet dữ liệu/nhập liệu hiện có.
- Có bộ chọn ngày và **Excel riêng ngày này** tại nhập tay nhiều ngày và phần phân tích. File chỉ chứa đầu vào của ngày đã chọn, tên gồm nhãn/ngày ăn để gửi riêng. Khi đăng nhập, nhãn cả kỳ/riêng ngày vẫn phân biệt được; lựa chọn lưu tài khoản giữ nguyên.
- Bản mở từ chat/tài khoản cũng xuất riêng ngày sau khi xem trước và xác nhận. Chọn ngày bằng bản chuẩn đã chuẩn bị, giữ ID, g/ml, số suất, nguồn, hệ số và dữ liệu lâm sàng; tải riêng không tự tạo bản lưu tài khoản.
- Nhập tay nhiều ngày dùng lại thao tác **Thêm thực phẩm và món ăn ngoài hệ thống**, **AI hỗ trợ nhập liệu**, và mở thực đơn đã lưu. Bộ chọn ngày xác định nơi thêm. Bản từ chat/tài khoản cũng có các nút nhập liệu chung; món mới được đưa vào dữ liệu chuẩn thay vì bị mất khi chuyển từ hàng hiển thị.
- Bỏ form `TP mới` cũ trùng chức năng. Thực phẩm tự nhập xuất dưới dạng nguồn người dùng, không gửi ID cục bộ sang tra cứu CSDL. Dinh dưỡng bỏ trống giữ `null`; số 0 thật vẫn là 0.
- Không khóa sheet hoặc cố định hàng/cột. Sheet ngày dùng công thức từ đầu vào chuẩn; nếu chuyển dòng sang ngày khác trong Excel, cảnh báo yêu cầu xuất lại để chia ngày đúng. Không thay engine hoặc nguồn dinh dưỡng, không migration/seed.

## Kiểm tra

- `npm run test:nutrition-chat`: toàn bộ bộ kiểm thử hiện có và bài mới `test-nutrition-daily-export.tsx` đạt. Bài mới kiểm 7 sheet, cách ly ngày, công thức/offset, g/ml/suất, nguồn tự nhập, vòng xuất/nhập, ngày trống, null/0, tên an toàn, không khóa/cố định và thao tác chung.
- TypeScript và build Next production đạt. ESLint các file thay đổi không lỗi; 6 cảnh báo ảnh/MealBlock có sẵn còn giữ.
- Tương tác React trong JSDOM với API giả lập: thêm món thủ công/AI tại Ngày 2 không đổi Ngày 1 hoặc localStorage một ngày; chỉ có một luồng nhập ngoài hệ thống; xuất riêng Ngày 2 gửi đúng một ngày và đúng tên file, cả khi đăng nhập; thêm món vào bản liên kết giữ nguyên metadata các dòng cũ và lượng mới chưa nhập vẫn null.
- Không phải nghiệm thu trình duyệt thật, Excel desktop hoặc VPS. Chưa cập nhật website production trong lượt này.

## Cập nhật VPS

Nhánh `codex/unify-calculator-interface`, PR #5. Trên checkout VPS `/opt/dinhduong` của nhánh này, kiểm tra thay đổi cục bộ/backup theo runbook hiện hành rồi chạy:

```sh
git pull --ff-only origin codex/unify-calculator-interface
docker compose build app
docker compose up -d --no-deps app
docker compose ps app
curl -fsS https://dinhduong2598.foood/api/health
```

Không chạy migrate hoặc seed cho thay đổi này. Giữ các override cấu hình riêng của VPS.
