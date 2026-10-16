# Đầu vào MenuInput v1

Schema công cụ đang kết nối là nguồn sự thật. Bảng này giải thích nghĩa nghiệp vụ, không thay thế schema.

`clinicalContext` tùy chọn: `conditions` (tối đa10 dữ kiện đã cung cấp), `notes`, `targetGroup` (`NguoiLon`/`TreEm`), `dietCodeId` thật từ kho, `selection` (`proposed`/`user_confirmed`/`prescribed`). Có ID phải kèm đối tượng và trạng thái. Tra bằng `search_diet_codes` rồi `get_diet_code`, không bịa mã hay tự ghép ngưỡng. Khoảng MCDA được đối chiếu riêng; `comparison` tiếp tục giữ mục tiêu cá nhân. Mã đang proposed/chọn sai đối tượng chưa được chốt. Không có mã vẫn tính thành phần được. Ghi chú nguồn theo kg và số nước chưa rõ đơn vị không tự quy đổi.

| Mức | Trường và nghĩa |
| --- | --- |
| Menu | `title`; `mode` = `recall24h` / `menu`; `days`; `comparison`; tùy chọn `fields`, `profile`, `aiComment`. |
| Ngày | `id`, `label`, `date`, `rows`. Giữ cả ngày chưa nhập nếu người dùng chủ ý để trống; không đánh giá như ngày đã ăn. |
| Dòng | `id`, `meal`, `dish`, một trong `foodId` hoặc `customFood`; `quantity`, `unit`, `servings`, `basis`, `recipeSource`. |
| Nguồn công thức | `kind` = `catalog` / `user` / `ai`; `label`; `dishId` nếu lấy từ kho; `url` nếu có. |
| Thay/ước tính | `replacedFromFoodId`; `actualFoodName`; `estimateAccepted`; `note`. Những thông tin này phải đi cùng bản đã chốt. |
| Quy đổi | `conversionFactor` + `conversionSource`; `densityGPerMl` + `densitySource`. Chỉ nhập khi có căn cứ và đã giải thích. |
| Hỏi ghi 24h | `mealTime` dạng HH:mm; `householdMeasure` khi biết số bát/cốc…; `sourceState` = raw_clean/cooked/as_sold là trạng thái dữ liệu nguồn đã xác minh, không suy từ tên. |
| Dấu sao | `aiFilledFields`: quantity, servings, conversionFactor, densityGPerMl, mealTime, householdMeasure, customFood.portionAmount, customFood.wastePercent, customFood.nutrients.<key>. Khai mọi số AI tự điền; JSON giữ số, chỉ hiển thị thêm `*`. Dấu sao vẫn giữ sau chốt. |
| Nhu cầu | `comparison.mode: "none"` chỉ tính; `"profile"` dùng hồ sơ; `"manual"` dùng `targets` có `key`, `value`, `source`, tùy chọn `isUpperLimit`. |

`customFood` gồm `id`, `name`, `source`, `basis`, `nutrients`, tùy chọn thải bỏ/nhóm. `source` gồm `kind`, `label`, `confirmed`, tùy chọn URL. Cơ sở `portion` phải có lượng và đơn vị của một phần. Các khóa nutrient phải nằm trong danh sách server hỗ trợ, số thiếu để `null`.

Không gửi tên/số ID tự suy đoán cho thực phẩm trong kho. Không nhét giá trị nutrient tự tính vào dòng có `foodId`: server đọc dữ liệu nguồn.

## Hồ sơ cơ thể và phần còn thiếu

- `profile` tùy chọn khi chỉ tính thành phần (`comparison.mode=none`) hoặc đối chiếu mục tiêu có nguồn (`manual`). Không cần có tuổi/giới để cộng dinh dưỡng từ thực phẩm.
- Nếu gửi `profile`, phải có `age`, `ageUnit` (`tuoi`/`thang`), `gender` (`Nam`/`Nữ`), `activityLevel` và `physiology` đúng schema. Tuổi/cân nặng/chiều cao là chuỗi số, ví dụ `"60"`, không phải số JSON. Không tự gán giới hoặc trạng thái sinh lý mặc định khi chưa biết.
- Có cân nặng/chiều cao/vận động nhưng chưa biết tuổi/giới: hỏi đúng phần chưa có nếu muốn tính nhu cầu. Lỗi trả `field` và `guidance.stage=needs_input`; giữ dữ kiện đã có, không gửi lại nguyên hồ sơ thiếu.
- Nếu người dùng chỉ muốn tính thành phần, giải thích chọn `none` và bỏ `profile` chưa đầy đủ; nếu có mục tiêu xác nhận kèm nguồn thì dùng `manual`. Không âm thầm bỏ hồ sơ/đổi chế độ để qua lỗi. Hồ sơ đã biết giữ trong hội thoại để bổ sung sau.

## Xác nhận, lưu và dùng lại

- `prepare_menu` tạo preview, `review.text` và token. Trình review để duyệt; rút gọn phải chia kỳ xem đủ. Token gắn với đầu vào, dữ liệu, tài khoản và thời hạn; không đưa token cho người dùng sao chép.
- `calculate_menu` / `export_workbook` nhận bản đang được xác nhận. Khi người dùng đổi một lượng hoặc nguồn, không dùng token cũ.
- `save_menu`: dùng khóa chống trùng ổn định cho một thao tác lưu. Bản mới theo chủ ý có khóa mới; thử lại sau timeout giữ khóa cũ. Sửa bản cũ cần ID và revision hiện hành.
- `get_saved_menu` trả đầu vào để dựng lần tính mới. Giữ nguồn bản cũ, không mặc định dữ liệu gốc hiện tại bằng snapshot đã tính trước đây.
