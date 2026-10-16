# Gỡ nội dung dự án khác — 16/10/2026

- Chủ dự án yêu cầu gỡ quản lý suất ăn và thông tin PC07 vì thuộc dự án khác.
- Tìm trước: ba lối vào nằm trong menu tài khoản, một lối trong trang quản trị và một liên kết hướng dẫn gán khoa ở quản trị người dùng. PC07 nằm trong `defaultSiteSettings.organization`, có thể hiện lúc ContactForm khởi tạo hoặc khi đọc thiết lập lỗi. Không có mục suất ăn trong header source; override layout VPS chỉ thêm Thông tin mới.
- Bỏ các liên kết quản lý/báo suất ăn/ca trực bếp và hướng dẫn gán khoa; lưới quản trị còn bốn mục. Ba URL cũ `/quan-tri/suat-an`, `/bao-suat-an`, `/bep` trả notFound theo cơ chế Next hiện có. Không dựng hệ hoặc chức năng thay thế.
- Bỏ tổ chức PC07 khỏi giá trị mặc định. Trước triển khai, VPS có organization là dấu chấm và address là địa chỉ bệnh viện tại Đà Nẵng; chỉ xóa giá trị tổ chức cũ/placeholder với điều kiện chặt, giữ thông tin liên hệ thực tế và bộ đếm. Backup trước và ghi DataChangeLog cho thay đổi thiết lập.
- Không sửa Food/Dish/nguyên liệu, schema hay lịch sử migration; không xóa dữ liệu nghiệp vụ của module cũ. Thay đổi này gỡ giao diện khỏi website Dinh dưỡng 2598, không phải migration phá dữ liệu giữa các dự án.
- Prisma generate, TypeScript và ESLint bảy file sửa đạt. Không viết test mới cho việc gỡ liên kết; kiểm trang và thiết lập qua HTTPS sau triển khai.

## Nghiệm thu VPS

- Source app **b60b934723b9411f2bb94538eaa80f6e4982db20**, nhánh `codex/nutrition-chat-api`, chưa merge main. Backup/rollback image: `/opt/dinhduong-release-backups/nutrition-project-scope-20261016-135612-codex`. Build Linux/TypeScript và health đạt; không migration mới.
- Thiết lập `public.organization` từ placeholder `.` thành null trong transaction, backup trước và ghi DataChangeLog với tác nhân bảo trì theo yêu cầu chủ dự án. Digest mọi trường còn lại (trừ updatedAt) khớp ngay trong transaction; giữ địa chỉ bệnh viện, tên/điện thoại/Zalo và bộ đếm. Không thay bằng một đơn vị tự suy đoán.
- **HTTPS48**: settings no-store, không PC07, địa chỉ bệnh viện giữ đúng, bộ đếm còn số; home/hướng dẫn/liên hệ/quản trị không nhãn/link suất ăn; cả10client assets tải thật không còn PC07 hoặc các nhãn menu đã gỡ. Ba URL cũ404 và không render module; health/OAuth discovery/OpenAPI/trang bắt đầu chat200.
- Công cụ browser trả inventory rỗng nên chưa kiểm tương tác/ảnh desktop-mobile trực tiếp; không coi HTTPS và đọc bundle là kiểm trình duyệt.
- Canonical count/digest trước/sau khớp (Food3719/Dish7369/nguyên liệu41457), migration25 giữ nguyên. SHA env/layout/Caddy/Google khớp, timer active/enabled, app healthy/OOMKilled=false, không còn swap build. Không tạo fixture tài khoản.
- Bước đầu wrapper deploy có lỗi cú pháp ở allowlist và dừng trước checkout/build; đã sửa và chạy lại với pin commit cùng tám file được phép. Bản cũ không bị thay trong lần lỗi đó.

## Liên kết sang ứng dụng suất ăn

- Theo yêu cầu tiếp theo của chủ dự án, thêm một thẻ “Suất ăn bệnh viện” ở trang chủ, ngay sau phần chức năng tra cứu/tính khẩu phần; dẫn chính xác tới `https://suatanbv.io.vn/` trong tab mới, có nhãn truy cập và `noopener noreferrer`.
- Tái dùng bố cục, màu và lớp giao diện trang chủ; không thêm package, API hay dữ liệu. Các URL suất ăn nội bộ đã gỡ vẫn trả404; đây là liên kết sang ứng dụng riêng của chủ dự án.
- Prisma generate, TypeScript và ESLint file sửa đạt; kiểm HTTPS sau khi cập nhật ứng dụng.
