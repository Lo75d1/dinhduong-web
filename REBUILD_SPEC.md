# Đặc tả rebuild — Tính khẩu phần

## Mục tiêu

Xây lại trải nghiệm tính khẩu phần thành một luồng thống nhất, giữ dữ liệu VDD/RNI
và các phép tính đã có của website. Apps Script cũ là tài liệu tham khảo nghiệp vụ;
không chép hoặc triển khai lại mã Google Apps Script.

## Phạm vi đợt rebuild đầu tiên

Chỉ thay đổi trang `/tinh-khau-phan` và phần logic trực tiếp phục vụ nó. Không đổi
schema dữ liệu thực phẩm/món ăn hiện có, không làm Admin, tài khoản, AI hay triển
khai server trong đợt này.

## Luồng người dùng chuẩn

1. Người dùng nhập hồ sơ (tuổi, giới, cân nặng, chiều cao, vận động, sinh lý).
2. Người dùng chọn một chế độ làm việc:
   - **Khẩu phần 24 giờ**: ghi lượng thực phẩm *ăn được*; hệ thống cho biết lượng
     nguyên liệu sống/xuất kho tương ứng khi có tỷ lệ thải bỏ.
   - **Thực đơn**: lập kế hoạch theo nguyên liệu sống sạch; giao diện phải ghi rõ
     đơn vị đang nhập và cách quy đổi áp dụng.
3. Người dùng lập cây **Bữa ăn → Món ăn → Thực phẩm**, tìm và thêm từ CSDL.
4. Hệ thống hiển thị tổng dinh dưỡng, đối chiếu khuyến nghị thường và mã CĐĂ.
5. Người dùng xem bảng chi tiết, bảng quy đổi và biểu đồ.
6. Ở đợt sau, người dùng có thể xuất báo cáo, lưu lên server và gửi dữ liệu chờ duyệt.

## Quy tắc nghiệp vụ bắt buộc

- Dữ liệu chất dinh dưỡng là theo 100 g; công thức tổng là `giá trị/100 g × khối lượng/100`.
- Không đoán số liệu còn thiếu. Hiển thị thiếu dữ liệu/độ phủ khi phù hợp.
- Tỷ lệ thải bỏ phải được chụp cùng dòng khẩu phần khi người dùng chọn thực phẩm,
  để kết quả lịch sử không thay đổi khi dữ liệu gốc được hiệu chỉnh.
- Phân loại thực phẩm (nhóm, nguồn protein, mức GI/purin/cholesterol) cũng được
  chụp cùng dòng như cách web hiện đang làm.
- Các nhãn suy luận như GI, purin, nguồn lipid phải có ghi chú giới hạn dữ liệu.
- Công cụ là hỗ trợ phân tích dinh dưỡng, không thay thế tư vấn/điều trị y khoa.

## Thành phần giao diện

| Khối | Vai trò | Tái sử dụng |
|---|---|---|
| Hồ sơ | BMI, TDEE, chuẩn tăng trưởng | `PersonalProfile`, `GrowthChart` |
| Chế độ & cây nhập liệu | Chọn chế độ, bữa/món/thực phẩm, khối lượng | Rebuild `MealInput`, giữ cấu trúc `Row` |
| Tổng hợp | 18 chất cốt lõi và cảnh báo dữ liệu thiếu | Logic `Calculator` |
| Đối chiếu | Khuyến nghị tuổi/giới và mã CĐĂ | `RecommendationComparison`, `DietCodeComparison` |
| Bảng kiểm tra | Chi tiết theo bữa/món, quy đổi sống/ăn được | Mới, dựa nghiệp vụ Apps Script |
| Biểu đồ | Theo bữa và tổng ngày | `MealCharts`, `RationCharts`, `OriginCharts` |

## Tiêu chí nghiệm thu đợt rebuild đầu tiên

- Người dùng luôn biết đang ở chế độ nào và đang nhập loại khối lượng nào.
- Đổi chế độ không làm mất dữ liệu đã nhập; dữ liệu được chuyển đổi hoặc yêu cầu xác nhận
  khi không thể quy đổi an toàn.
- Thêm, đổi tên, xóa bữa/món/thực phẩm hoạt động trên cả hai chế độ.
- Tổng dinh dưỡng, khuyến nghị, CĐĂ và biểu đồ cập nhật đúng theo dữ liệu mới.
- Có bảng quy đổi nguyên liệu rõ ràng khi dữ liệu tỷ lệ thải bỏ tồn tại.
- Giao diện dùng tốt trên màn hình điện thoại và máy tính.
- Kiểm thử trực tiếp trên trình duyệt với tối thiểu: người lớn, trẻ em và khẩu phần có
  thực phẩm tỷ lệ thải bỏ khác 0.

## Ngoài phạm vi của đợt này

- Đăng nhập, lưu khẩu phần vào server và lịch sử.
- Người dùng gửi thực phẩm/món mới; quy trình duyệt Admin.
- Nhập liệu hỗ trợ AI.
- CSV/PDF, Docker, domain và triển khai server riêng.

## Thứ tự thực hiện chi tiết

1. Đặc tả này và sơ đồ màn hình — hoàn thành khi được chấp thuận.
2. Bổ sung mô hình dữ liệu cho hai chế độ và hàm quy đổi, kèm test logic.
3. Rebuild giao diện nhập liệu; thử trực tiếp trên trình duyệt.
4. Thêm bảng chi tiết/quy đổi, ghép lại các khối đối chiếu và biểu đồ; thử trực tiếp.
5. Báo cáo và demo trước khi chuyển sang xuất file/lưu server.
