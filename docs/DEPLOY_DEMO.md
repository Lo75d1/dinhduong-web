# Deploy DEMO tự chứa (app + Postgres riêng + full data)

> Demo công khai để mọi người xem cách làm. **Không dùng Supabase, không đụng bất
> kỳ DB production nào.** Toàn bộ chạy trong Docker trên 1 VPS: `app + Postgres + data`.
> Data nền (foods/dishes/ingredients) đã commit sẵn ở `data/reference/*.jsonl`.

## 0. Chuẩn bị
- VPS Ubuntu 22.04/24.04 (≥ 2 vCPU / 4 GB RAM / 40 GB SSD).
- 1 domain, bản ghi **A** trỏ về IP VPS (trỏ TRƯỚC khi bước 6 để Caddy xin HTTPS).
- Token GitHub (repo private) để clone.

## 1. Cài Docker + firewall
```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"      # rồi ĐĂNG XUẤT/vào lại 1 lần
docker --version && docker compose version
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable
```

## 2. Lấy mã nguồn (nhánh có sẵn app + data)
```bash
sudo mkdir -p /opt/dinhduong-demo && sudo chown "$USER":"$USER" /opt/dinhduong-demo
git clone -b codex/reference-data-seed \
  https://<TOKEN>@github.com/Lo75d1/dinhduong-web.git /opt/dinhduong-demo
cd /opt/dinhduong-demo
```

## 3. Tạo biến môi trường (điền bằng nano — KHÔNG dán qua chat)
```bash
# Mật khẩu DB nội bộ (đặt 1 chuỗi mạnh, dùng lại y hệt ở 2 chỗ dưới)
printf 'DB_PASSWORD=%s\n' "$(openssl rand -hex 16)" > .env
cat .env                                   # copy phần sau DB_PASSWORD=

cp .env.production.example .env.production
openssl rand -hex 32                        # copy làm APP_SECRET
nano .env.production
chmod 600 .env .env.production
```
Trong **`.env.production`** điền:
| Biến | Giá trị |
|---|---|
| `DOMAIN` | tên miền demo |
| `DATABASE_URL` | `postgresql://nutrition:<DB_PASSWORD>@db:5432/nutrition?sslmode=disable` |
| `DATABASE_SSL` | `disable` |
| `APP_SECRET` | chuỗi `openssl rand -hex 32` |
| `PUBLIC_SITE_URL` | `https://<DOMAIN>` |
| `ENABLE_DIET_ORDERS` | `false` |
| `ENABLE_PREVIEW_ADMIN` | `false` |
| `SUPABASE_URL / SERVICE_ROLE_KEY / MEAL_PHOTO_BUCKET` | để trống (ảnh nằm im) |
> `<DB_PASSWORD>` trong `DATABASE_URL` phải TRÙNG giá trị trong file `.env`.

## 4. Dựng DB → migrate → seed
```bash
D="-f compose.yaml -f compose.demo.yaml"
docker compose $D up -d db                                  # bật Postgres, chờ healthy
docker compose $D --profile maintenance run --rm migrate    # tạo schema (DB trống, KHÔNG drift)
docker compose $D --profile maintenance run --rm seed       # nạp 3.719 foods + 7.369 dishes + 41.457 ingredients
```
Kỳ vọng seed in ra số dòng đã nạp. (Chạy lại `seed` sẽ dừng vì bảng đã có dữ liệu — đúng thiết kế.)

## 5. Chạy web
```bash
docker compose $D up -d --build
docker compose $D ps
docker compose $D logs -f app        # chờ app "healthy", Ctrl+C thoát
```

## 6. Kiểm tra sống
```bash
curl -s https://<DOMAIN>/api/health   # kỳ vọng {"status":"ok"}
```
Mở `https://<DOMAIN>` — Caddy tự cấp HTTPS sau khi DNS trỏ đúng.

## 7. Tạo tài khoản demo (admin) để trải nghiệm suất ăn
Ứng dụng chưa có seed tài khoản. Tạo 1 admin bằng cách chạy trong container app hoặc
qua trang đăng ký nội bộ (nếu có). *(Chốt cách tạo admin đầu tiên khi lên VPS — có thể
thêm 1 script seed-demo-users nhỏ nếu cần.)*

## Ghi chú
- **Chưa có**: `nutrition_recommendations` / `diet_codes` / `child_growth_standards`
  (file jsonl rỗng) → các bảng đối chiếu (khuyến nghị, mã CĐĂ, tăng trưởng) trống trong
  demo. Bổ sung sau từ `dataweb_chuan-1.xlsx` nếu cần.
- **CHƯA CHẠY THỬ** cụm Docker này ở máy dev (không có Docker/Postgres) → **kiểm ngay
  trên VPS**; lỗi ở bước nào báo lại để sửa tại chỗ.
- Sao lưu: `docker compose $D exec db pg_dump -U nutrition nutrition > backup.sql`.
</content>
