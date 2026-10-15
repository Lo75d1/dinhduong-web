# Thư viện cá nhân — 15/10/2026

- Chủ dự án chọn **thêm, sửa và lưu thực phẩm/món ăn độc lập để dùng trong nhiều thực đơn**, mở rộng kế hoạch gốc chỉ lưu trong Ration. Giữ nguyên kho Food/Dish chung.

## Giao diện và tái dùng

- Menu tài khoản có ba lối vào: `/tai-khoan/thuc-don`, `/tai-khoan/thuc-pham`, `/tai-khoan/mon-an`.
- Thực đơn của tôi đọc chung Ration theo chủ: cả bản web cũ revision 0 và bản chat/nhiều ngày/Excel. Tái dùng RationItem/nút mở công cụ cũ hoặc trang bản lưu hội thoại; tìm tên, phân trang 20 mục.
- Thực phẩm riêng: tên, nguồn/link, xác nhận nguồn, cơ sở 100 g/100 ml/theo phần, các chất trong metadata hiện có, tỷ lệ thải bỏ khi biết. Thiếu giữ null, khác số 0; không tự đổi ml thành g.
- Món riêng: một MenuInput công thức, không hồ sơ/mục tiêu; chọn nguyên liệu hoặc công thức trong kho và mục cá nhân. Giữ Food ID, nguồn công thức gốc, đơn vị/định lượng/ghi chú.
- Biểu mẫu có xem trước/xác nhận. Sửa/xóa kiểm revision và lý do; DataChangeLog chỉ lưu tên/phiên bản/lý do, không nhân bản toàn bộ số liệu/hồ sơ.
- “Dùng trong thực đơn” mở `/tai-khoan/thuc-don/moi`, tái dùng ReuseSavedMenu/prepare/save/analysis: thêm ngày, bữa/món, lượng/suất và mục thư viện; không dựng bộ tính hay bảng thực đơn khác.
- Bản lưu có lối chọn một thực phẩm ngoài kho hoặc món để mở biểu mẫu thư viện điền sẵn. Vẫn cần xem/xác nhận trước khi lưu độc lập; không tự tạo hàng loạt hoặc sao chép Food chuẩn.
- ID nguồn thực phẩm gồm ID thư viện và revision: hai phiên bản có thể cùng nằm trong một thực đơn. Món/thực đơn giữ snapshot lúc dùng; sửa/xóa thư viện không đổi bản cũ. Food chuẩn vẫn tính lại/báo nguồn thay đổi theo luồng bản lưu hiện có.

## Dữ liệu, API và quyền

- Ration/RationItem giữ thực đơn như trước. FoodSubmission là đề xuất kiểm duyệt vào kho chung, không dùng làm thư viện cá nhân.
- Hai mô hình còn thiếu: `PersonalFood` / `PersonalDish`, gồm ownerId, tên, JSON đầu vào có schema, revision, requestKey và mốc thời gian. Không sửa Food/Dish/DishIngredient.
- Migration mới `20261015140000_personal_nutrition_library`: thêm hai bảng/index/FK, bật RLS, revoke PUBLIC/anon/authenticated; giữ backend owner/BYPASSRLS như Ration/OAuth.
- `GET /api/personal-library/{food|dish}`: q/page hoặc id. Danh sách chỉ metadata; chi tiết món có preview từ bộ tính hiện có.
- `POST`: `{content,requestKey,reason,confirmed:true,id?,expectedRevision?}`; tạo chống lặp, sửa cần revision. `DELETE`: `{id,expectedRevision,reason}`. Không nhận owner/role/cột tự do từ client.
- Tái dùng session/OAuth, scope read/write, Origin/CSRF, đọc JSON streaming và rate limit DB. Giới hạn ban đầu: 512 KB/mục, 200 mục mỗi loại, tổng nội dung thư viện 25 MB/tài khoản; ghi 20/phút, đọc 120/phút. Đây là giới hạn kỹ thuật, chưa phải đo sức chứa VPS.
- Khóa transaction theo chủ bảo vệ quota/idempotency; ownerId nằm trong truy vấn từng mục. Tên/nguồn là nội dung, không phải chỉ dẫn cho mô hình.
- MCP thêm hai tool chỉ đọc `list_personal_library` / `get_personal_library_item`, tổng **13**; scope nutrition:read. Chat dùng content làm customFood/công thức, cấp ID dòng riêng, prepare/chốt/tính. Thêm/sửa/xóa thư viện thực hiện trên web; chưa có tool ghi thư viện trong chat.

## Kiểm chứng và triển khai

- Prisma generate, TypeScript, lint file sửa và build Next production đạt.
- Suite Nutrition Chat: core67, báo cáo37, OAuth thuần89, OAuth/PGlite261, storage82, HTTP201, thư viện riêng60; workbook/parser và báo cáo đủ chất đạt.
- Thư viện được thử bằng migration SQL thật trên PostgreSQL WASM riêng: CRUD/idempotency, owner khác404, revision, nguồn/đơn vị/null/0, hai phiên bản cùng thực đơn, lấy mục từ bản lưu, audit metadata, CSRF/token/body size, RLS/ACL. PGlite không chứng minh khóa giữa nhiều PostgreSQL worker.
- Browser với component React thật, service/API + DB fixture riêng: thêm thực phẩm 100 ml có Canxi, tạo món có nguyên liệu kho (230 kcal), lưu món, tạo thực đơn mới, sửa nguồn lên revision2 và xác minh thực đơn cũ giữ230. Sau sửa ID nguồn, thử lại thực đơn hai ngày chứa phiên bản cũ/mới: tổng320 kcal, trung bình160; xác nhận/lưu/mở lại đạt. Điều hướng Next được thay trong harness; không coi là nghiệm thu đăng nhập/SSR với DB production.
- Next production thật tại localhost: ba thư mục và link chọn mục riêng đều chuyển người chưa đăng nhập về login với next đúng. Không đăng nhập DB production tại localhost.
- **Phần thư viện mới chưa áp migration/deploy VPS.** Theo AGENTS/CLAUDE_HANDOFF, chỉ áp sau merge bằng image migrate no-cache. Không tự merge/main/deploy; không seed/reset hoặc rollback bằng xóa bảng.
- Sau merge: backup DB đã kiểm chứng; build migrate no-cache/run migrate thành công; build app; thử hai tài khoản, ba thư mục, CRUD/dùng lại/xuất và ACL/RLS; đối chiếu Food/Dish trước/sau. Excel/link bản lưu đã nghiệm thu trước đó là phần riêng tại `saved-menu-links-2026-10-15.md`.
- Bằng chứng cục bộ giả lập ở thư mục ignore `evidence/nutrition-chat/personal-library-*`; không có bí mật/hồ sơ production.
