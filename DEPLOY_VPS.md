# Đưa Dinh Dưỡng Việt Nam lên VPS Ubuntu

Kiến trúc: `domain → Caddy (HTTPS) → Next.js/Docker → PostgreSQL/Supabase`.
Database hiện tại được giữ nguyên. Không chạy seed, không xóa và không thay đổi dữ liệu Food/Dish khi triển khai.

## 1. Chuẩn bị

- VPS Ubuntu 24.04, tối thiểu 2 vCPU / 4 GB RAM / 50 GB SSD.
- Một domain đã có bản ghi `A` trỏ tới IP VPS.
- Mở firewall cho cổng `22`, `80`, `443`; không mở `3000` ra Internet.
- Chuỗi `DATABASE_URL` của Supabase/PostgreSQL và (nếu dùng) Gemini API key.

## 2. Cài Docker trên VPS

Đăng nhập SSH, rồi cài Docker Engine và Docker Compose Plugin theo tài liệu chính thức Docker. Sau đó kiểm tra:

```bash
docker --version
docker compose version
```

## 3. Đưa mã nguồn lên VPS

Khuyến nghị dùng Git repository riêng tư. Ví dụ:

```bash
sudo mkdir -p /opt/dinhduong
sudo chown "$USER":"$USER" /opt/dinhduong
git clone <PRIVATE_REPOSITORY_URL> /opt/dinhduong
cd /opt/dinhduong
```

Nếu chưa dùng Git, có thể nén thư mục dự án (không kèm `.env`, `node_modules`, `.next`) rồi tải lên `/opt/dinhduong` bằng SFTP/WinSCP.

## 4. Tạo biến môi trường thật

```bash
cp .env.production.example .env.production
nano .env.production
chmod 600 .env.production
```

Điền `DOMAIN`, `DATABASE_URL`, và Gemini key nếu muốn bật AI. Không điền mật khẩu kiểm tra mẫu trên website chính thức; để `ENABLE_PREVIEW_ADMIN=false`.

## 5. Kiểm tra migration trước khi chạy

Lệnh này chỉ áp dụng các migration schema còn thiếu; không seed và không xóa dữ liệu nguồn.

```bash
docker compose --profile maintenance run --rm migrate
```

Nếu database hiện tại là database đang dùng ở máy phát triển, hãy sao lưu Supabase trước khi chạy migration.

## 6. Khởi chạy website

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Khi `app` là `healthy`, mở `https://TEN-MIEN/api/health`. Kết quả mong đợi:

```json
{"status":"ok"}
```

Caddy tự xin và gia hạn HTTPS sau khi DNS đã trỏ đúng. Cổng 80/443 phải được nhà cung cấp VPS và firewall cho phép.

## 7. Cập nhật phiên bản sau này

```bash
cd /opt/dinhduong
git pull
docker compose --profile maintenance run --rm migrate
docker compose up -d --build
docker image prune -f
```

## 8. Vận hành an toàn

- Sao lưu PostgreSQL/Supabase hằng ngày trước khi chỉnh dữ liệu nguồn.
- Không đặt `.env.production` trong Git, email, ảnh chụp màn hình hay chat.
- Chỉ mở `22`, `80`, `443`; dùng SSH key thay vì mật khẩu nếu có thể.
- Kiểm tra log: `docker compose logs --tail=200 app`.
- Sau khi vận hành ổn, hãy tắt/đổi toàn bộ key thử nghiệm và tạo tài khoản quản trị thật.
