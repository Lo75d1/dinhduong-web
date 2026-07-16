# Bàn giao dự án Dinh dưỡng 2598

Ngày cập nhật: 2026-07-16  
Website: `https://dinhduong2598.food`  
VPS: `/opt/dinhduong` (Docker Compose + Caddy + Next.js + Prisma/Supabase)

## Nguyên tắc bắt buộc

- Đây là công cụ hỗ trợ chuyên môn dinh dưỡng của Bệnh viện Đa khoa Nam Liên Chiểu, Sở Y tế TP. Đà Nẵng. Giao diện cần trang trọng, rõ ràng, ưu tiên người dùng là bác sĩ/dinh dưỡng viên/PT/gia đình.
- **Không tự ý sửa hoặc xoá dữ liệu Food/Dish hiện có.** Mọi nhập/cập nhật dữ liệu phải có bước xem trước, lý do, xác nhận rõ của Admin và ghi `DataChangeLog` (ai sửa, lúc nào, giá trị cũ/mới).
- Ưu tiên nguồn chính thức; luôn hiển thị nguồn và không suy diễn dữ liệu thiếu.
- Tên đề tài/website đúng: **Dinh dưỡng 2598** (không phải 2597).
- Không đưa bí mật (DATABASE_URL, API key, APP_SECRET) vào Git hoặc giao diện.

## Triển khai VPS

Code thường:

```bash
cd /opt/dinhduong
git pull origin main
docker compose up -d --build
```

Khi có Prisma migration mới phải dùng image `migrate` không cache:

```bash
cd /opt/dinhduong
git pull origin main
docker compose --profile maintenance build --no-cache migrate
docker compose --profile maintenance run --rm migrate
docker compose up -d --build
```

Chờ dòng `All migrations have been successfully applied.` trước khi build app. Không dùng `git reset --hard`.

## Git và trạng thái gần nhất

- Repository: `https://github.com/Lo75d1/dinhduong-web`
- Nhánh: `main`
- Commit gần nhất lúc bàn giao: `4a56a85` — VDD ghép món theo tên chuẩn hoá và lưu mã nguồn/ảnh.
- Các commit ảnh liên quan trước đó:
  - `e1b8299`: thêm ảnh RNI có audit.
  - `5ac50b3`: gộp UI quét VDD + RNI.
  - `f33e14e`: tăng timeout transaction RNI từ 5s lên 60s.
  - `7f6e313`: header RNI giống script Python.
  - `4a56a85`: VDD fallback name-normalized.

## Dữ liệu nguồn đã kiểm tra

### VDD — Viện Dinh dưỡng Việt Nam

- API: `https://viendinhduong.vn/api/fe/tool/getPageFoodData`
- Trang nguồn: `https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an`
- File đối chiếu: `D:\datanutrition\mon_an_vdd_co_anh.xlsx`
- Có khoảng 1.250 món, mã kiểu `HAP-223025`, cột `Mã số`, `Tên món ăn`, dinh dưỡng, `URL anh`.
- Script tham khảo: `D:\datanutrition\fetch_mon_an_api.py`.
- VDD món ăn được seed vào **Food** với `source="VDD"`, `foodType="MA"`, không phải `Dish` vì không có công thức nguyên liệu.
- Lỗi lịch sử: `scripts/seed-foods.ts` khi seed VDD món ăn không ghi `sourceCode`, nên API ảnh ghép mã HAP không khớp.
- Đã sửa preview endpoint `src/app/api/admin/data/images/sync-preview/route.ts`: lần đầu ghép chính xác bằng `nameNormalized`; khi Admin xác nhận, endpoint `images/commit` lưu `sourceCode`, `imageUrl`, `imageSourceUrl`. Những lần sau sẽ ghép mã trực tiếp.
- Không tự động ghép các tên gần giống; nếu trùng tên phải báo `AMBIGUOUS` để Admin quyết định.

### RNI — app.thucdongiadinh.vn

- API danh sách món: `https://app.thucdongiadinh.vn/api/services/app/MonAn/GetAllServerPaging`
- API nguyên liệu: `https://app.thucdongiadinh.vn/api/services/app/MonAn/GetAllTpFromMa?MonAnId=<id>`
- API ảnh: `https://app.thucdongiadinh.vn/api/services/app/DanhMucNhomThucPham/GetImg?imgId=<uuid>` (trả base64 PNG).
- File đối chiếu: `D:\datanutrition\Món ăn của RNI.xlsx`:
  - 7.369 món ở sheet `Danh sach mon an`.
  - ~41.447 dòng nguyên liệu ở sheet `Chi tiet nguyen lieu`.
- Script tham khảo chính xác: `D:\datanutrition\fetch_monan_dungsan_api.py`.
- RNI yêu cầu gửi header giống trình duyệt/script: `User-Agent`, `Referer`, `Origin`, `Accept: application/json, text/plain, */*`, `Content-Type: application/json`, `X-Requested-With: XMLHttpRequest`.
- `Dish` lưu RNI, gồm `sourceCode`, `imageSourceId`, `imageSourceUrl`. Không lưu base64 vào database; ảnh được proxy qua `src/app/api/dish-images/rni/[imageId]/route.ts`.
- RNI commit nhiều món từng bị Prisma interactive transaction hết hạn 5 giây. Đã đặt `maxWait: 10_000`, `timeout: 60_000` tại `src/app/api/admin/data/images/rni-commit/route.ts`.

## UI/Admin hiện có

- Trang biên tập: `src/app/quan-tri/du-lieu/page.tsx`.
- Khối quét chung: `src/app/quan-tri/du-lieu/ImageSourceSync.tsx`.
  - Quét đồng thời VDD và RNI.
  - Hiển thị preview từng nguồn rồi mới cho xác nhận.
  - Cần theo dõi thực tế timeout khi quét/commit lượng lớn.
- Editor dữ liệu Food cũ: `DataManager.tsx`. Hiện phần quét VDD cũ bị ẩn bằng CSS trong `page.tsx`; nên refactor sạch hơn khi có thời gian, tránh selector `section:nth-of-type(2)` dễ vỡ.
- Nhật ký thay đổi: `DataChangeLog`.
- Nhật ký lỗi: `AppErrorLog`; các migration đã tồn tại.

## Việc cần làm tiếp (ưu tiên)

1. **Kiểm thử trên VPS** commit `4a56a85`: quét VDD + RNI, xem số lượng VDD `MATCHED` có tăng; xác nhận thử ở lượng nhỏ/nếu UI hỗ trợ.
2. Refactor quy trình đồng bộ thành tác vụ nền có tiến độ:
   - VDD có thể quét/cập nhật toàn bộ từ API trong một job vừa phải.
   - RNI metadata + ảnh quét được theo trang; nhưng cập nhật đầy đủ công thức/nguyên liệu cho 7.369 món là hơn 7.000 request và phải chạy worker/CLI có checkpoint, rate limit và resume, không nên chạy trong một HTTP request của browser.
3. Luồng “cập nhật lại toàn bộ trực tiếp RNI + VDD” nên có:
   - preview số thêm/sửa/bỏ qua/trùng;
   - chọn phạm vi nguồn (VDD / RNI / cả hai);
   - batch nhỏ, progress, retry và audit tổng hợp;
   - không xoá record cũ; chỉ upsert theo `(source, sourceCode)`;
   - RNI nguyên liệu chỉ thay sau khi job đầy đủ thành công cho món đó.
4. Mapping đầy đủ các chất VDD/RNI cần dùng bảng mapping có kiểm thử, không map bằng suy đoán chữ. Có thể đối chiếu với logic/import mapping của `scripts/seed-foods.ts` và workbook gốc.
5. Public danh sách/chi tiết món cần hiển thị thumbnail khi `Dish.imageSourceId` (RNI) hoặc `Food.imageUrl` (VDD) có giá trị, kèm badge nguồn. Hiện ảnh RNI chỉ chắc chắn dùng được trong preview/proxy.
6. Khôi phục/hoàn thiện giao diện để người dùng có API Gemini cá nhân nếu đã được hứa; API dùng chung nằm tại Admin, phải mã hoá và không hiện lại khoá.

## Một số file quan trọng

- `prisma/schema.prisma`
- `prisma/migrations/20260716010000_add_dish_image_references/`
- `src/app/api/admin/data/images/sync-preview/route.ts` — VDD preview
- `src/app/api/admin/data/images/commit/route.ts` — VDD commit/audit
- `src/app/api/admin/data/images/rni-sync-preview/route.ts` — RNI preview
- `src/app/api/admin/data/images/rni-commit/route.ts` — RNI commit/audit
- `src/app/api/dish-images/rni/[imageId]/route.ts` — proxy ảnh RNI
- `scripts/seed-foods.ts`, `scripts/seed-dishes.ts` — logic nhập lịch sử để đối chiếu, không chạy thẳng trên production vì có thao tác xoá dữ liệu cũ.

