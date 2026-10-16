# Gỡ nội dung dự án khác — 16/10/2026

- Chủ dự án yêu cầu gỡ quản lý suất ăn và thông tin PC07 vì thuộc dự án khác.
- Tìm trước: ba lối vào nằm trong menu tài khoản, một lối trong trang quản trị và một liên kết hướng dẫn gán khoa ở quản trị người dùng. PC07 nằm trong `defaultSiteSettings.organization`, có thể hiện lúc ContactForm khởi tạo hoặc khi đọc thiết lập lỗi. Không có mục suất ăn trong header source; override layout VPS chỉ thêm Thông tin mới.
- Bỏ các liên kết quản lý/báo suất ăn/ca trực bếp và hướng dẫn gán khoa; lưới quản trị còn bốn mục. Ba URL cũ `/quan-tri/suat-an`, `/bao-suat-an`, `/bep` trả notFound theo cơ chế Next hiện có. Không dựng hệ hoặc chức năng thay thế.
- Bỏ tổ chức PC07 khỏi giá trị mặc định. Trước triển khai, VPS có organization là dấu chấm và address là địa chỉ bệnh viện tại Đà Nẵng; chỉ xóa giá trị tổ chức cũ/placeholder với điều kiện chặt, giữ thông tin liên hệ thực tế và bộ đếm. Backup trước và ghi DataChangeLog cho thay đổi thiết lập.
- Không sửa Food/Dish/nguyên liệu, schema hay lịch sử migration; không xóa dữ liệu nghiệp vụ của module cũ. Thay đổi này gỡ giao diện khỏi website Dinh dưỡng 2598, không phải migration phá dữ liệu giữa các dự án.
- Prisma generate, TypeScript và ESLint bảy file sửa đạt. Không viết test mới cho việc gỡ liên kết; kiểm trang và thiết lập qua HTTPS sau triển khai.
- Nghiệm thu VPS và giới hạn trình duyệt sẽ bổ sung sau khi kiểm tra xong.
