# Audit dữ liệu nền và dữ liệu vận hành

## Hệ lưu trữ

Ứng dụng dùng PostgreSQL (Supabase) qua Prisma 7 và adapter `@prisma/adapter-pg`.
Không dùng SQLite/MySQL và không cần commit database binary.

## Phân loại bảng

### Reference/master được đóng gói trong dataset này

- `foods`: VDD/RNI, thành phần dinh dưỡng và phân nhóm có nguồn.
- `food_aliases`: mapping tên tìm kiếm, không sửa tên gốc.
- `dishes`, `dish_ingredients`: món mẫu RNI và công thức nền.
- `nutrition_recommendations`: khuyến nghị dinh dưỡng.
- `diet_codes`: mã chế độ ăn bệnh lý nền.
- `child_growth_standards`: bảng tăng trưởng tham chiếu đang lưu trong DB.

`food_prices` không đưa vào snapshot: giá biến động theo thời điểm/vùng, không phải số
liệu dinh dưỡng chuẩn. `medication_refs` là reference dược riêng, ngoài phạm vi VDD/RNI.
`departments`, `meal_types`, `kitchen_diet_types` là cấu hình vận hành từng bệnh viện,
không phải dữ liệu VDD/RNI dùng chung.

### Operational — không commit dữ liệu

`patients`, `rations`, `ration_items`, `food_submissions`, `contact_messages`,
`sus_responses`, `page_visits`, `app_error_logs`, `data_change_logs`, `departments`,
`department_memberships`, `meal_types`, `kitchen_diet_types`, `meal_orders`,
`meal_order_items`, `kitchen_menus`, `kitchen_menu_items`, `kitchen_shifts`,
`kitchen_shift_members`, `kitchen_tasks`, `meal_operation_audits`,
`meal_order_change_requests`, `diet_orders`, `public_meal_reports`, `meal_photos`.

Các bảng vận hành chỉ tham chiếu dữ liệu nền; importer không cập nhật record báo ăn.

### Authentication/security — không commit dữ liệu

`users`, `sessions`, `site_settings`. `site_settings` có thể chứa cấu hình/secret đã mã
hóa nên không được coi là reference dataset. `.env`, password, token và API key luôn bị
loại khỏi Git.

## Nguồn hiện có

- Excel VDD/RNI nằm ngoài repo trong `D:\datanutrition\du-lieu-nguon`.
- Dữ liệu chuẩn đang phục vụ ứng dụng nằm trong PostgreSQL và đã qua các đợt sửa có
  kiểm soát ghi tại `README-data.md`.
- Một số dữ liệu tăng trưởng WHO còn có bản generated JSON trong `src/lib`.

Vì database hiện tại đã qua dedupe/link/null hóa có kiểm soát, snapshot phải được xuất
từ trạng thái DB chuẩn hiện tại; không chạy lại seed Excel cũ để thay thế snapshot.

## Nguyên tắc import

Importer giữ nguyên ID, null, đơn vị và mọi giá trị nguồn. Nó không tự làm sạch, không
suy diễn và không xóa/upsert. Nếu bảng đích không rỗng, import dừng trước khi ghi.
