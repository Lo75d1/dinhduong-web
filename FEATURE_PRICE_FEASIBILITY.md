# Đánh giá khả thi: Thêm GIÁ TIỀN cho thực phẩm / món ăn

> Ngày: 2026-07-20 · Trạng thái: **Slice 1 (nền dữ liệu + nhập liệu Admin) đã code
> xong, typecheck/lint/generate sạch.** Slice 2 (hiển thị chi phí món/khẩu phần)
> chờ môi trường có DB để test. Chi tiết Slice 1 ở mục 8 cuối file.
> Kết luận ngắn: **Khả thi cao về mặt kỹ thuật.** Phần khó không phải code mà là
> *mô hình dữ liệu giá* (giá biến động, không có nguồn chính thống) và *migration
> trên CSDL production đang ở trạng thái drift*. Đọc mục 4–5 trước khi làm.

---

## 1. Vì sao tính năng này đáng làm

Hiện app tính dinh dưỡng khẩu phần. Thêm giá → mỗi khẩu phần/thực đơn có **tổng
chi phí** song song tổng dinh dưỡng. Với thực đơn bệnh viện, "đủ dinh dưỡng trong
mức chi phí" là bài toán thật hằng ngày → giá trị sử dụng rõ. Ý tưởng tốt.

## 2. Code hiện tại đỡ được tới đâu (tin tốt)

Ba cơ chế cần thiết ĐÃ CÓ SẴN, giá chỉ "ăn theo":

1. **Sửa 1 trường Food + ghi nhật ký:** `src/app/api/admin/data/foods/[id]/route.ts`
   theo mẫu cực sạch — có mảng `numeric`, `text`, `snapshot`; mọi PATCH tự ghi
   `DataChangeLog` (ai/khi nào/cũ→mới, bắt buộc `reason`). Thêm trường giá =
   thêm tên vào mảng, **không phải viết logic mới**.
2. **Món ăn tự cộng từ nguyên liệu:** `DishIngredient.foodId` đã liên kết ~99%
   (README-data.md mục 16). Dinh dưỡng món đã cộng từ nguyên liệu → **chi phí món
   cộng y hệt cách đó**, không cần nhập giá riêng cho từng món.
3. **Khẩu phần snapshot dữ liệu vào từng Row:** nutrients và `classify` được chụp
   vào Row lúc thêm (xem `food-classify.ts`, PROJECT_STATUS). Giá snapshot vào Row
   **cùng cơ chế** → tổng chi phí khẩu phần = cộng theo gram, giống hệt tổng dinh dưỡng.

→ Nghĩa là "tổng tiền cả ngày", "tiền theo bữa", "tiền theo món" tái dùng đúng
khung đã có cho năng lượng/P/L/G.

## 3. Điểm mấu chốt: giá KHÁC dinh dưỡng về bản chất

| | Dinh dưỡng | Giá tiền |
|---|---|---|
| Nguồn | Chính thống (VDD/RNI), cố định | **Không có nguồn quốc gia miễn phí**; theo chợ/siêu thị, theo vùng |
| Thời gian | Gần như bất biến | **Biến động liên tục** (mùa, lạm phát) |
| Tính trên khối lượng nào | **Ăn được** (edible) | **Mua vào** (gồm phần thải bỏ: xương, vỏ) |
| Đơn vị | /100 g | thường /kg, /bó, /quả, /gói |

Ba hệ quả bắt buộc thiết kế phải xử lý:

- **A. Đơn vị & quy đổi thải bỏ:** mua 1 kg cá (có xương) nhưng ăn ít hơn. Chi phí
  tính trên **khối lượng mua** (dùng `wastePercent` đã có + `quantity.ts` đã có để
  quy đổi ăn được ↔ mua vào — đúng cơ chế app đang dùng, tái sử dụng được).
- **B. Nguồn + ngày + vùng:** theo đúng nguyên tắc dự án ("luôn hiển thị nguồn,
  không suy diễn"), mỗi giá phải kèm `priceSource`, `priceDate`, (tùy) `region`.
  Không có thì để trống, KHÔNG đoán.
- **C. Độ phủ thấp là bình thường:** sẽ không ai nhập giá cho đủ 3.719 thực phẩm.
  Tổng chi phí phải hiển thị **"—" + % độ phủ** khi thiếu, y như vi chất thiếu dữ
  liệu hiện nay (không cộng thiếu thành số giả).

## 4. Vướng mắc thật (blockers) — phải biết trước

1. **Migration trên CSDL production đang drift.** PROJECT_STATUS mục "Server
   persistence" ghi: Prisma phát hiện drift (`food_aliases`, cột recommendation)
   và đòi reset huỷ dữ liệu — migration `add_app_persistence` đang **tạm dừng**.
   Thêm trường giá cần 1 migration mới → **phải hoà giải drift trước**, TUYỆT ĐỐI
   không `migrate reset`/`--force` trên DB thật (mất dữ liệu Food/Dish).
2. **Máy này không có Node/npm** (chỉ Python — xem memory). Viết code thì được,
   nhưng `prisma migrate`/`generate`, chạy dev server, build đều **cần môi trường
   dev**. Migration nên làm qua image `migrate` trên VPS theo CLAUDE_HANDOFF, hoặc
   máy có Node.
3. **Không tự động cào giá.** Không có nguồn giá công khai đáng tin + ổn định;
   cào giá còn dính vấn đề bản quyền/điều khoản như đã né với ghi chú thuốc
   (MedicationRef chỉ lưu tên/ảnh, không lưu nội dung nguồn). → Giá **nhập tay có
   kiểm duyệt**, không scraper.

## 5. Đề xuất phạm vi (MVP gọn, đúng nguyên tắc dự án)

**Giai đoạn 1 — tối thiểu chạy được:**
- Thêm vào `Food`: `priceAmount Float?`, `priceUnit String?` (vd "VND"),
  `priceBasis String?` (per_kg | per_100g | per_piece | per_pack),
  `pricePackG Float?` (khối lượng 1 đơn vị mua nếu tính theo quả/gói),
  `priceDate DateTime?`, `priceSource String?`, `priceRegion String?`.
- API sửa: thêm các trường trên vào `numeric`/`text`/`snapshot` của route đã có →
  tự có nhật ký thay đổi. (≈ 15 dòng.)
- UI Admin `DataManager.tsx`/QuickEdit: thêm ô nhập giá + nguồn + ngày.
- Chi tiết món `/mon-an/[id]`: hiện chi phí ước tính = Σ (giá nguyên liệu × khối
  lượng mua), kèm **% nguyên liệu có giá**; thiếu → "—".
- Khẩu phần: snapshot giá vào Row; thêm dòng **Tổng chi phí** (ngày/bữa/món) cạnh
  tổng dinh dưỡng, luôn kèm % độ phủ.

**Giai đoạn 2 (sau, nếu cần):**
- Bảng `FoodPriceHistory` (foodId, amount, unit, basis, date, source, region) để
  lưu lịch sử giá + biểu đồ biến động (thay vì chỉ 1 giá hiện hành). Nhật ký
  `DataChangeLog` đã cho lịch sử ở mức tối thiểu nên G1 chưa cần bảng riêng.
- Nhập giá hàng loạt qua CSV (đối chiếu theo `source`+`sourceCode`, upsert, có
  preview — giống luồng ảnh VDD/RNI).

**Không làm:** auto-cào giá; đoán giá khi thiếu; đặt giá mặc định 0.

## 6. Ước lượng công sức

| Việc | Công sức | Ghi chú |
|---|---|---|
| Schema + migration | Nhỏ (code) | **nhưng** bị chặn bởi drift (mục 4.1) |
| API sửa giá + nhật ký | Rất nhỏ | tái dùng route có sẵn |
| UI Admin nhập giá | Nhỏ–vừa | thêm field vào form đã có |
| Chi phí món (derive) | Vừa | tái dùng liên kết nguyên liệu + wastePercent |
| Tổng chi phí khẩu phần + % phủ | Vừa | tái dùng khung tổng dinh dưỡng |
| Test thật trên trình duyệt | Vừa | cần môi trường có Node |

**Tổng:** khả thi, phần lớn là "nối dây" vào cơ chế sẵn có. Rào cản lớn nhất là
**migration an toàn trên DB production**, không phải viết code.

## 7. Cần bạn quyết trước khi tôi code

1. Phạm vi: làm **Giai đoạn 1 (MVP)** trước? (khuyến nghị: có)
2. Giá gắn ở đâu: theo **Food** rồi món/khẩu phần tự cộng? (khuyến nghị: có — đỡ nhập trùng)
3. Đơn vị nhập giá chủ yếu: **/kg**? /100g? cho phép /quả, /gói? (khuyến nghị: cho cả /kg và /piece)
4. Môi trường chạy migration: máy bạn có Node hay làm trên VPS? (quyết định tôi viết hướng dẫn nào)
5. Ai được nhập giá: chỉ Admin/Data editor (như hiện tại)? (khuyến nghị: có, kèm nhật ký)

---

## 8. Slice 1 đã triển khai (2026-07-20)

Mô hình dữ liệu đã chốt: **bảng riêng `FoodPrice`** (nhiều giá / Food, theo vùng +
nguồn + ngày), giá gắn ở Food. Đã viết + verify (typecheck/lint/prisma generate sạch;
CHƯA test browser vì DB creds lỗi trên máy — xem memory):

- `prisma/schema.prisma` — model `FoodPrice` + quan hệ `Food.prices`.
- `prisma/migrations/20260720130000_add_food_prices/migration.sql` — tạo bảng
  `food_prices` (viết tay, sẵn sàng áp qua `migrate deploy` trên VPS). **CHƯA áp** —
  DB production drift + creds lỗi, áp theo luồng CLAUDE_HANDOFF.
- `src/lib/food-price.ts` — hằng số vùng/đơn vị (per_kg/per_100g/per_piece/per_pack),
  kiểm tra, và `costForEdibleGrams()` (quy đổi ra VND, cộng lại phần thải bỏ, trả null
  khi thiếu — không đoán). Dùng cho Slice 2.
- `src/lib/food-price-admin.ts` — `parsePrice()` + `priceSelect` dùng chung 2 route.
- `src/app/api/admin/data/foods/[id]/prices/route.ts` — GET danh sách, POST thêm.
- `src/app/api/admin/data/foods/[id]/prices/[priceId]/route.ts` — PATCH, DELETE.
  Mọi ghi đều bắt buộc `reason` + ghi `DataChangeLog` (entityType `FOOD_PRICE`,
  entityId = foodId → hiện trong lịch sử của thực phẩm đó).
- `src/app/quan-tri/du-lieu/PriceEditor.tsx` — UI nhập/sửa/xoá giá; gắn trong
  `DataManager.tsx` (key theo food) dưới form sửa thực phẩm.

### Slice 2 — còn lại (cần DB để test)
1. Snapshot giá vào `Row` khi thêm thực phẩm vào khẩu phần (mirror cơ chế `nutrients`/
   `classify` trong `tinh-khau-phan/types.ts`).
2. Chọn vùng miền ở khẩu phần → lấy giá phù hợp; tính **tổng chi phí** ngày/bữa/món
   bằng `costForEdibleGrams`, kèm **% độ phủ** (thiếu → "—", không cộng số giả).
3. Trang `/mon-an/[id]`: chi phí ước tính = Σ giá nguyên liệu × khối lượng mua.
4. (Tuỳ) hiện giá tham khảo ở trang chi tiết thực phẩm công khai, có badge "tham khảo".

### Việc vận hành phải làm trước khi tính năng chạy thật
- Áp migration `20260720130000_add_food_prices` trên VPS (`migrate deploy`), sau khi
  hoà giải drift hiện có. KHÔNG reset DB.
- Nhập giá qua khu Quản trị → Dữ liệu (chọn thực phẩm → mục "Giá tham khảo").
