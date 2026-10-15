# Nghiệm thu quản lý tài khoản trên VPS — 15/10/2026

- Yêu cầu: bổ sung OAuth thủ công và quản lý đầy đủ tài khoản cá nhân/quản trị. Người dùng xác nhận cả hai phạm vi. Tiếp tục nhánh thử và quyền triển khai VPS đã được cấp; không merge main.
- Commit chức năng `fe53aaa`, tương thích client OAuth `c9c74fb`. VPS `/opt/dinhduong`, app c9c74fb healthy. Migration `20261015100000_account_management` áp thành công bằng migrate image no-cache; 24 migration up to date. Maintenance timer tiếp tục dùng cấu hình có sẵn.

## Trước và sau migration

- Đọc trạng thái VPS thật: nhánh đúng, app healthy; xác nhận role app có owner/BYPASSRLS trên ba bảng tài khoản/phiên/audit. Không suy diễn từ checkout local.
- Backup `/opt/dinhduong-release-backups/nutrition-account-20261015-074636-codex`: env/patch/layout/Caddy/Google/image rollback và archive DB 3.713.053 byte. Thư mục 0700, file credential/DB 0600; không đưa lên Git.
- Phục hồi archive public vào container PostgreSQL 17 riêng, network none, rồi áp migration tài khoản đạt. 0 tài khoản cũ bị khóa; không chạy seed/reset production.
- Sau migration: `app_users`, `app_sessions`, `data_change_logs` có RLS và không còn SELECT của anon/authenticated/PUBLIC; Prisma app vẫn hoạt động. Không đổi default privileges hoặc kho dữ liệu nguồn.

## Kiểm chứng chức năng

- Local: `npm run test:accounts` 62 checks, dùng auth thực và PostgreSQL PGlite, cookie/Prisma adapters riêng. Kiểm Basic authorization-code + PKCE, POST refresh, từ chối thiếu secret, ràng buộc chủ manual client, thu hồi, mật khẩu, role/CSRF/Origin, audit không credential và ACL/RLS.
- Nutrition Chat regression đạt: core67, report37, OAuth thuần73, OAuth DB254, storage82, HTTP167 và workbook. Sau sửa tương thích Basic/POST, chạy lại OAuth254 và account62 đạt. Fixture không chứng minh liên kết platform thật hoặc tranh chấp nhiều worker.
- Prisma generate, TypeScript, lint tất cả file sửa và build Linux/Next16.4.0 đạt. Prettier chỉ áp lên file mới/viết lại của phần việc. Lỗi lint/test/SCA cũ ngoài phạm vi ghi ở verification cũ vẫn không được coi là đã sửa.
- HTTPS **74 checks**: login/register/session cookie thật; không tự cấp Admin; 401/403/CSRF/Origin/trường không được phép; không thu hồi phiên/cấu hình người khác; profile cập nhật; thu hồi thiết bị khác; tạo user bằng Admin; tìm/lọc; chặn tự khóa/gỡ Admin; đổi vai trò thu hồi phiên; khóa/mở; reset mật khẩu; mật khẩu cũ bị từ chối; bearer bị chặn sau khóa; khẩu phần giữ nguyên; tạo secret một lần/hash/owner; thu hồi client; audit; bootstrap cũ bị chặn.
- Browser thật: khách được dẫn đúng về đăng nhập; đăng nhập quay lại tài khoản; lưu tên cập nhật ngay menu và thông báo. Các tab bảo mật/phiên, kết nối/manual OAuth và lịch sử hiển thị đúng. Admin tìm đúng một user, chọn, xem audit, đổi lựa chọn thao tác và thấy các trường xác nhận; không đổi quyền tài khoản thật qua UI.
- Viewport **390 px/document375/content375** và **1280 px/document1265/content1265**; không tràn ngang. Reset viewport sau thử. Ảnh ignore: `vps-account-mobile.jpg`, `vps-account-manual-mobile.jpg`, `vps-account-admin-mobile.jpg`, `vps-account-admin-desktop.jpg`.

## Dọn dữ liệu và giữ trạng thái

- Bốn user và một client bearer kiểm thử đã dọn theo ID + namespace riêng; FK dọn session/token/khẩu phần/cấu hình của chính user kiểm thử. Audit chỉ dọn entityId kiểm thử. Xác nhận 0 user thử còn lại; file credential thử local/remote đã xóa, bằng chứng không credential giữ riêng.
- Food **3719**, digest `f3cc7fe1a1871ab20afa334665a7c8a5`; Dish **7369**, `13629ddecc9ac8584dc544819272e05f`; ingredient **41457**, `aaba9f5e13c9cc4e8f0f306801a4973e`. Count+digest trước/sau migration/thử/dọn khớp.
- Bộ đếm kết nối thật vẫn ChatGPT0/Claude0; không tạo authorization-code grant giả trên production để tăng lượt. OAuth đầy đủ manual client kiểm ở fixture; HTTPS kiểm tạo/thu hồi client và bearer thử riêng.
- Env, sáu dòng nav layout riêng, Caddy và file Google khớp hash backup; timer active; swap build đã gỡ. Không thay APP_SECRET, proxy hoặc upstream `/thong-tin-moi/`.

## Giới hạn

- Chưa nghiệm thu OAuth/tính/xuất với tài khoản ChatGPT hoặc Claude thật. Cấu hình thủ công thay bước đăng ký tự động; không tự gắn công cụ vào chat bị thiếu tool.
- Khôi phục mật khẩu qua quản trị, chưa có gửi thư xác minh/reset tự động, MFA hoặc xóa user. Email cá nhân chỉ đọc, quản trị thay sau xác minh ngoài hệ thống; không gắn nhãn email đã xác thực.
- Bản chạy thử chưa merge main. Rollback app bằng image backup, giữ migration bổ sung; không xóa cột/bảng hoặc restore DB đang phục vụ chỉ để đổi app.
