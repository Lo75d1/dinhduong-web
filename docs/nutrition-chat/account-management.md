# Quản lý tài khoản và cấu hình OAuth thủ công

Ngày: 15/10/2026. Mở rộng theo yêu cầu người dùng, gồm cả cá nhân và quản trị. Giữ nhánh `codex/nutrition-chat-api`, PR #4; không khôi phục cửa Claude duyệt đã được người dùng bỏ.

## Phạm vi và tái dùng

- `/tai-khoan`: hồ sơ, mật khẩu, các phiên website, kết nối OAuth, tạo/thu hồi cấu hình thủ công, số khẩu phần/hồ sơ và 20 thao tác tài khoản gần nhất.
- `/quan-tri/nguoi-dung`: tìm tên/email, lọc vai trò/trạng thái, phân trang 20; tạo tài khoản; sửa tên/email/vai trò; khóa/mở; đặt lại mật khẩu; thu hồi phiên/kết nối; nhật ký theo tài khoản.
- Tái dùng `User`, `Session`, `NutritionOAuthClient/Code/Token`, hạn mức PostgreSQL và `DataChangeLog`. Không dựng hệ tài khoản/API key/analytics mới. Nhật ký tài khoản được lọc khỏi API lịch sử biên tập nguồn.
- Vai trò, thành viên khoa và dữ liệu khẩu phần tiếp tục dùng hệ hiện có; gán khoa tại Quản lý suất ăn. Không sửa Food/Dish, công thức nguồn hoặc bộ tính.
- Khóa tài khoản giữ dữ liệu và thu hồi phiên/token/code/cấu hình thủ công. Mở lại không khôi phục các quyền đã thu hồi. Đổi mật khẩu, email hoặc vai trò thu hồi phiên/token/code; cấu hình client còn hiệu lực vẫn cần người dùng đăng nhập và cấp quyền lại.
- Tự đổi mật khẩu phải nhập mật khẩu hiện tại. Quản trị tạo/sửa/khóa/reset/thu hồi phải nhập mật khẩu quản trị và lý do. Chặn tự khóa/tự gỡ quyền và giữ ít nhất một Admin hoạt động; thao tác quản trị và cấp token đồng bộ bằng khóa PostgreSQL.
- Email cá nhân hiển thị chỉ đọc, quản trị có thể sửa sau xác minh ngoài hệ thống. Không tuyên bố email đã xác thực. Chưa có gửi thư khôi phục mật khẩu, MFA hoặc xóa tài khoản; quên mật khẩu được hỗ trợ qua quản trị, dùng khóa tài khoản để giữ hồ sơ.

## Cấu hình thủ công

1. Đăng nhập → Tài khoản → Kết nối ứng dụng → Kết nối thủ công.
2. Đặt tên, chọn ChatGPT/Claude và quyền; xác nhận mật khẩu hiện tại.
3. Sao chép URL MCP, Client ID và Client Secret vào cài đặt OAuth của plugin. Nếu giao diện yêu cầu riêng, dùng authorize/token URL được hiển thị; ưu tiên `client_secret_basic`, cũng chấp nhận `client_secret_post` với cùng secret cho client thủ công. DCR vẫn kiểm đúng phương thức đã đăng ký.
4. Hoàn tất đăng nhập/cấp quyền, kiểm tra công cụ và tra thực phẩm. Đây là phương án thay bước đăng ký client tự động, không sửa được lỗi host không nạp công cụ.

- Secret ngẫu nhiên chỉ trả một lần sau khi tạo, lưu hash; không nhúng trong HTML tải lại, localStorage, URL, log hoặc gói plugin. Mất secret → thu hồi và tạo mới. Đây là credential do chính người dùng yêu cầu tạo, không phải APP_SECRET/API key của VPS.
- Client thủ công chỉ cho phép tài khoản tạo client cấp quyền, callback chính xác theo nền tảng; không hỗ trợ callback tùy ý. DCR hiện có giữ `ownerId = null` và tiếp tục hoạt động như trước.
- Tối đa 5 cấu hình thủ công chưa hết hạn/thu hồi, 10 lần tạo/ngày/tài khoản. Cấu hình có TTL không hoạt động 30 ngày, gia hạn khi grant/refresh hợp lệ theo OAuth có sẵn.
- Không dán secret hoặc bearer token vào hội thoại. Không tạo nút giả “kết nối thành công”: danh sách kết nối chỉ chứa grant đã cấp thực sự.

## Migration và vận hành

- `20261015100000_account_management`: thêm `User.disabledAt`, `Session.userAgent`, `NutritionOAuthClient.ownerId` nullable + FK/index; không cập nhật dữ liệu nguồn hay khóa tài khoản cũ.
- Bật RLS và revoke quyền PUBLIC/anon/authenticated trên `app_users`, `app_sessions`, `data_change_logs`. Phải xác nhận role kết nối ứng dụng là owner/BYPASSRLS trước áp, thử trên bản restore riêng; không đổi schema default privileges. App/API tiếp tục dùng Prisma phía server.
- Request thay đổi tài khoản kiểm Origin cùng website + JSON có giới hạn + CSRF ký; kiểm quyền ở API. Login/register có hạn mức dùng lại PostgreSQL window. Mật khẩu và token không vào audit.
- Migration theo `CLAUDE_HANDOFF.md`: image migrate build `--no-cache`, áp trước app mới. Giữ env/Caddy/layout/Google file riêng trên VPS. Rollback app dùng image đã lưu; giữ migration bổ sung, không rollback bằng xóa bảng/cột.

## Kiểm chứng

- `npm run test:accounts`: fixture PostgreSQL PGlite dùng auth thực, cookie adapter và Prisma adapter kiểm thử; kiểm chủ sở hữu, role/CSRF/origin, secret hash, OAuth PKCE manual client, thu hồi, đổi/reset mật khẩu, ACL/RLS.
- `npm run test:nutrition-chat`: hồi quy OAuth/MCP/lưu/xuất; các fixture đã áp migration tài khoản mới.
- Prisma generate, TypeScript và ESLint file thay đổi; build Linux, migration restore, HTTP thật và trình duyệt ghi riêng khi đã chạy. Không coi fixture là nghiệm thu plugin tài khoản ChatGPT/Claude thật.
