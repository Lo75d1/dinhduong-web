# Ghi chú chất lượng dữ liệu (VDD + RNI)

Tài liệu này giải thích các quyết định/giả định khi gộp dữ liệu từ 2 nguồn
**Viện Dinh Dưỡng Việt Nam (VDD)** và **RNI** vào schema `Food`/`Dish`. Đọc
trước khi dùng dữ liệu cho tính toán y khoa hoặc hiển thị công khai.

## 1. Các trường KHÔNG có nguồn — luôn null, cần bổ sung riêng

- **`giLevel`** (chỉ số đường huyết, 0-3): không tồn tại trong bảng thành phần
  dinh dưỡng VDD lẫn RNI. GI là chỉ số đo bằng thực nghiệm sinh lý, không suy
  ra được từ thành phần dinh dưỡng. Cần nguồn riêng (bảng GI quốc tế) hoặc bổ
  sung dần qua công cụ AI ở trang Admin cũ.

## 2. Các trường suy luận (app tự phân loại) — không phải số đo gốc

| Trường | Suy từ | Quy tắc |
|---|---|---|
| `purinLevel` | `purinMg` (chỉ RNI) | <50=0, 50-100=1, 100-150=2, >150=3 (ngưỡng lâm sàng phổ biến) |
| `cholesterolLevel` | `cholesterolMg` (cả 2 nguồn) | 0=0, 1-20=1, 20-50=2, >50=3 (do người dùng duyệt) |
| `proteinOrigin` | `vddGroupRaw` + từ khóa tên món | Chỉ áp dụng cho `source=VDD` (RNI không có cột nhóm) |
| `foodGroup` | `vddGroupRaw` (15 nhóm VDD → 10 nhóm chuẩn) | 2 nhóm "Đồ hộp", "Thức ăn truyền thống" để trống vì nội dung quá đa dạng |
| `foodType` (TS/CB/MA/SP) | từ khóa tên món + nhóm; SP = định lượng bao bì/thương hiệu (mục 14) | Best-effort, admin nên rà soát lại |

Toàn bộ quy tắc này **best-effort**, nên rà soát lại khi có thời gian —
không dùng làm căn cứ y khoa tuyệt đối.

## 3. Đơn vị KHÔNG khớp giữa 2 nguồn — cố tình để 2 cột riêng, không tự quy đổi

- **Đồng (Copper)**: VDD báo cáo `copperMgVdd` (mg), RNI báo cáo
  `copperMcgRni` (µg). Không tự nhân/chia 1000 vì không chắc đây là lỗi đơn vị
  hay khác biệt thật.
- **Vitamin A**: VDD có cột "Vit A (mg)" (`vitAMgVdd`) — đơn vị mg cho vitamin
  A là bất thường (thường là µg), nghi là lỗi trong file gốc. Không dùng cột
  này để tính `foodGroup`/hiển thị mặc định — ưu tiên `vitARaeMcg` (VDD) hoặc
  `vitAMcgRni` (RNI), cả hai đều µg, an toàn để gộp chung khi cần 1 giá trị
  VitA duy nhất.

## 4. Cột đáng ngờ trong dữ liệu gốc

- **`rniUnknownFattyAcidG`**: cột "Arginine (g)" trong file RNI gốc, nằm giữa
  nhóm axit béo bão hòa (cạnh Palmitic, Margaric, Stearic, Behenic). Có thể là
  lỗi đặt tên (nghi ngờ là Arachidic acid/C20:0) nhưng KHÔNG đoán sửa — giữ
  nguyên tên/giá trị gốc.
- **File "Món ăn của VDD.xlsx"** gốc có 56 cột nhưng ~20 cột là rác/trùng lặp
  (ví dụ tên cột `"28,8g (g)"`, `"2mg (mg)"` — số liệu bị dán nhầm vào hàng
  tiêu đề khi xuất file). Khi nhập vào `Food` (foodType=MA), các cột trùng
  nghĩa cùng đơn vị đã được coalesce (lấy giá trị đầu tiên khác rỗng); các cột
  rác/khác đơn vị bị bỏ qua.

## 5. `Dish.categoryRaw` (RNI "Nhóm món ăn") không thuần bệnh lý

115 giá trị gốc là hỗn hợp: nhóm tuổi ăn dặm ("Cháo 7-8 tháng tuổi"), loại
món/sản phẩm ăn vặt (Pizza, Gà rán, Sữa bột...), và chỉ 4 giá trị thực sự là
bệnh lý ("Món ăn cho người bệnh đái tháo đường/suy thận/tăng huyết áp/ung
thư"). `categoryRaw` luôn lưu nguyên văn; `diseaseDiet`/`ageGroup` chỉ được
điền khi khớp mẫu rõ ràng, còn lại để null (không đoán).

## 6. Quy mô dữ liệu

- `Food`: **3.557 dòng** (đã dọn trùng lặp 2026-07-12, xem mục 11 — số gốc lúc
  seed là 3.909)
- `Dish` + `DishIngredient`: từ RNI — 7.369 món / 41.446 dòng nguyên liệu
  (nhập đầy đủ theo quyết định của người dùng, không lọc bớt; không bị ảnh
  hưởng bởi đợt dọn trùng ở mục 11)

## 7. Nguồn dữ liệu gốc (file cục bộ, đọc trực tiếp bởi scripts/seed-*.ts)

- `D:\datanutrition\Thuc pham gop VDD va RNI.xlsx` + `Món ăn của VDD.xlsx`
  → `scripts/seed-foods.ts` → bảng `Food`
- `D:\datanutrition\Món ăn của RNI.xlsx` — 2 sheet ("Danh sach mon an" +
  "Chi tiet nguyen lieu") → `scripts/seed-dishes.ts` → `Dish` + `DishIngredient`
- `gg script dinhduong by claude\Webdinhduong\dataweb_chuan-1.xlsx` (sheet
  KhuyenNghi/MCDA/ChuanTreEm — dữ liệu thật, không phải template rỗng) →
  `scripts/seed-reference-tables.ts` → `NutritionRecommendation`/`DietCode`/
  `ChildGrowthStandard`

## 8. Về dự án Google Apps Script cũ (`gg script dinhduong by claude`)

Chỉ là **bản mẫu tham khảo** cho thiết kế/logic của web mới. KHÔNG sửa, KHÔNG
deploy. Dữ liệu (thực phẩm + món ăn) đã nằm hết trong Postgres/Supabase; web
mới là sản phẩm chính thức. Riêng file `dataweb_chuan-1.xlsx` trong đó vẫn
được dùng làm **nguồn đọc** cho 3 bảng tham chiếu (không sửa file, không ghi
ngược lại vào gg script).

## 9. Bảng tham chiếu (KhuyenNghi/MCDA/ChuanTreEm) — độ phủ & lưu ý

- `NutritionRecommendation` (72 dòng): `proteinMinPct/MaxPct`, `lipidMinPct/MaxPct`,
  `glucidMinPct/MaxPct` là phân số (0-1) của tổng năng lượng — ĐÚNG cho 68/72
  dòng thông thường. Riêng **4 dòng "Phụ nữ có thai/cho con bú"**: cột
  `energyKcal` lưu **số kcal CỘNG THÊM** (vd 250) chứ không phải tổng, và
  `proteinMinPct` lưu **số GRAM đạm cộng thêm** (vd 25) chứ không phải %. Web
  xử lý bằng cách: luôn dùng Mifflin-St Jeor (đã tự cộng đúng 250/450/500 kcal
  theo tình trạng sinh lý) làm mục tiêu năng lượng cho mọi người lớn, không
  đọc `energyKcal` trực tiếp; và tách riêng hiển thị "đạm cộng thêm Xg" thay
  vì gộp vào bảng %. Xem `matchRecommendation.ts`/`RecommendationComparison.tsx`.
  `waterType` đôi khi chứa công thức dạng text (vd "100 ml/kg") thay vì nhãn
  loại — giữ nguyên. `ironType` ở 3/4 dòng phụ nữ chứa text "+15mg/ngày (RDA)"
  thay vì số — cột `iron` để null, không đoán số.
- `DietCode` (246 dòng): đầy đủ mã CĐA Bộ Y tế cho cả TreEm/NguoiLon.
- `ChildGrowthStandard` (40 dòng): mốc theo **năm/nửa năm** (0–18 tuổi), KHÔNG
  phải theo tháng như chuẩn WHO đầy đủ — biểu đồ tăng trưởng sẽ có độ phân
  giải thấp hơn bản WHO gốc, đủ dùng để tham khảo chứ không thay thế đánh giá
  lâm sàng.

## 10. Độ phủ các trường phân loại thực phẩm (ảnh hưởng biểu đồ nhóm C)

| Trường | Độ phủ | Lý do |
|---|---|---|
| `giLevel` | 0% | Không có nguồn nào cung cấp GI |
| `purinLevel` | ~3.5% | Chỉ RNI có Purin thô, đa số món không đo |
| `foodGroup` | ~51.5% (đã sửa 2026-07-12, xem mục 13 — trước là ~22%) | Chỉ VDD có nhóm gốc (thực phẩm thô + món ăn); RNI không có cột nhóm |
| `proteinOrigin` | ~14% | Chỉ VDD, nhiều nhóm để trống theo quyết định trước |
| `cholesterolLevel` | ~30% | Cả 2 nguồn có cholesterol mg nhưng nhiều món không đo |

Các biểu đồ dùng những trường này (theo yêu cầu người dùng 2026-07-11) vẫn
được xây dựng bình thường nhưng PHẢI hiển thị rõ % dữ liệu thiếu/số lượng
thực phẩm "chưa phân loại" — không suy diễn số liệu còn thiếu.

## 11. Dọn trùng lặp Food (2026-07-12)

Người dùng phát hiện RNI có tái sử dụng thực phẩm của VDD (file gốc
`Thuc pham gop VDD va RNI.xlsx` tên đã gợi ý điều này). Đã kiểm tra và xử lý
qua 2 đợt, script giữ lại trong `scripts/`:

- **`check-duplicates.ts`** — script phân tích (không sửa dữ liệu), so
  `nameNormalized` để tìm (a) RNI trùng VDD, (b) trùng nội bộ cùng 1 nguồn.
- **`dedupe-foods.ts`** — đợt 1: xoá 279 dòng (162 RNI trùng VDD theo tên đầy
  đủ + trùng nội bộ). Chạy `--apply` để thực thi, không có flag = dry run.
- **`dedupe-foods-vi-name.ts`** — đợt 2: xoá thêm 73 dòng trùng theo **tên
  tiếng Việt** (bỏ phần gloss tiếng Anh) — bắt được các cặp chỉ khác lỗi
  chính tả/định dạng tiếng Anh gốc (vd "Cari powder " thừa dấu cách, "Yellow
  -coloured **weeding** pastry" → "**wedding** pastry") mà so tên đầy đủ bỏ
  sót.

**Nguyên tắc an toàn cả 2 đợt** (đọc trước khi chạy lại hoặc mở rộng):
- Chỉ xoá khi **toàn bộ 4 chỉ số chính** (kcal/đạm/béo/đường) khớp gần tuyệt
  đối (sai số < 0.5) trong cả nhóm — tên trùng nhưng số liệu khác (vd "Bánh
  giò" có 7 biến thể macro khác hẳn nhau) là **món khác nhau thật**, KHÔNG
  đụng vào, kể cả khi rất giống tên.
- Trước khi xoá 1 dòng, **bù mọi field mà dòng giữ lại đang null nhưng dòng
  sắp xoá có giá trị** (quan trọng nhất: `purinMg`/`cholesterolMg` — RNI có
  nhiều dòng đo được các chỉ số này mà bản VDD trùng tên lại để trống; xoá
  thẳng sẽ mất dữ liệu quý cho biểu đồ Purin/Cholesterol nhóm C).
- Ưu tiên giữ **VDD** khi trùng khác nguồn (RNI là bên tái sử dụng).
- Đã xác nhận qua `DishIngredient.foodId` (FK `ON DELETE SET NULL`, duy nhất
  trỏ vào `Food`) = 0 dòng tham chiếu tới các bản bị xoá ở CẢ 2 đợt — không
  ảnh hưởng `Dish`/`DishIngredient` (vẫn 7.369/41.446 sau khi dọn).

Kết quả: `Food` 3.909 → 3.630 (đợt 1) → **3.557** (đợt 2). Còn lại 43 nhóm
tên trùng chỉ khác `null` (VDD, chưa đo) vs `0` (RNI) — CHƯA xử lý (để ngỏ,
vì không chắc `0` của RNI là đo được thật hay quy ước thiếu dữ liệu khác).

## 12. Tên gọi khác/địa phương — model `FoodAlias` (2026-07-12)

Theo yêu cầu người dùng, thêm bảng `food_aliases` (model `FoodAlias`, quan hệ
`Food.aliases`) lưu tên gọi khác/vùng miền — KHÔNG BAO GIỜ thay `Food.name`
gốc, chỉ phục vụ tìm kiếm (`/api/foods/search` đã OR thêm điều kiện
`aliases.some.aliasNormalized contains`). Mọi alias có `verified: false` —
đây là gợi ý theo kiến thức chung của Claude, KHÔNG có nguồn kiểm chứng.

**⚠️ Sự cố đã xảy ra khi seed đợt 1 — đọc trước khi thêm alias mới:**
Bản đầu của `scripts/seed-food-aliases.ts` dùng `normalizeVi()` (bỏ dấu) để
so khớp tên thực phẩm cần gắn alias — nhưng bỏ dấu làm nhiều từ tiếng Việt
khác nghĩa trùng chữ: "dừa"/"dứa"/"dưa" đều thành "dua", "ngô" khớp nhầm cả
"ngọt"/"ngỗng", "lạc" khớp nhầm cả "Cá lác" và tên thương hiệu "Similac".
Hậu quả: 622 alias sai bị gắn vào hàng trăm thực phẩm không liên quan (dưa
hấu bị gắn nhầm alias "Thơm" của dứa, sữa bột trẻ em bị gắn nhầm "Đậu
phộng"...). Đã xoá sạch bảng và làm lại.

**Cách làm ĐÚNG (bản hiện tại của `seed-food-aliases.ts`):**
- So khớp GIỮ NGUYÊN DẤU tiếng Việt (không dùng `normalizeVi` để tìm thực
  phẩm cần gắn — chỉ dùng nó để lưu `aliasNormalized` phục vụ tìm kiếm sau
  này).
- Chỉ khớp "tên thực phẩm BẮT ĐẦU BẰNG cụm từ mục tiêu" (`startsWith`, theo
  token/âm tiết), không phải "chứa" (`contains`) — tránh khớp vào giữa từ.
- Vẫn cần soát bằng mắt từng ứng viên trước khi ghi (xem cách làm việc: viết
  1 script dry-run chỉ đọc để in ứng viên trước, review xong mới sửa script
  chính thức để ghi) — đã loại "Rau mùi tàu" (rau khác hẳn: ngò gai) khỏi
  rule "rau mùi" (ngò/ngò rí) theo cách này.
- Đợt 1 chỉ gồm 13 cặp Bắc/Nam chắc chắn, phổ biến rộng rãi (ngô/bắp,
  lạc/đậu phộng, dứa/thơm/khóm, rau mùi/ngò, thịt lợn/thịt heo, sắn/khoai
  mì, bí ngô/bí đỏ, bí xanh/bí đao, na/mãng cầu, mướp đắng/khổ qua, rau
  ngót/rau bồ ngót, đậu tương/đậu nành) — 91 alias, đã kiểm tra qua
  `/api/foods/search`.

## 13. Sửa `foodGroup` — thêm nhóm mới + phân loại "Món ăn" (2026-07-12)

Người dùng phát hiện nhãn nhóm sai (vd "Bánh bích quy" bị xếp vào nhóm tên
"Nước ngọt" dù là bánh quy, không phải nước uống) và yêu cầu kiểm tra lại.
Gốc rễ: script seed gốc (`NHOM_MAP` trong `scripts/seed-foods.ts`) chỉ map
15 "Nhóm" của file thực phẩm thô gộp (`Thuc pham gop VDD va RNI.xlsx`), còn
file **"Món ăn của VDD.xlsx"** (1.250 dòng, `foodType=MA`) có **hệ Nhóm
riêng hoàn toàn khác** (~20 giá trị kiểu "Các loại bánh", "Món xào", "Cơm,
cháo, xôi"...) mà `seedVddMonAn()` chưa từng gán `foodGroup` — toàn bộ
"Món ăn" luôn `null`. Đã kiểm tra file nguồn: **RNI không có cột nhóm cho
từng thực phẩm** (0/1.806 dòng) nên không có gì để lấy từ RNI — foodGroup
chỉ có thể đến từ VDD.

**Đã sửa 2 việc** (`scripts/fix-food-groups.ts`, chạy trực tiếp trên DB
sống — KHÔNG seed lại vì sẽ xoá mất kết quả dọn trùng mục 11):

1. Tách nhãn `"Nước ngọt"` (đang gộp lẫn `Nước giải khát` + `Đồ ngọt`)
   thành 2 nhóm rõ nghĩa: **"Nhóm nước giải khát"** và
   **"Nhóm bánh kẹo, đồ ngọt"** — sửa đúng lỗi "Bánh bích quy".
2. Gán `foodGroup` cho "Món ăn" theo `vddGroupRaw` đã có sẵn trong DB, chỉ
   với nhóm **chắc chắn 1 loại nguyên liệu chủ đạo** (đã soát mẫu tên món
   thật cho từng nhóm trước khi quyết định):
   - Các loại trái cây → Nhóm rau củ quả khác
   - Ngao, ốc / Món xào / Các món chế biến sẵn → Nhóm thịt các loại, cá và hải sản
   - Các món trứng, sữa và chế phẩm → Nhóm sữa và các chế phẩm từ sữa
   - Chè, caramen, kem / Các món xôi, chè / Các món bánh, kẹo → Nhóm bánh kẹo, đồ ngọt
   - Giải khát → Nhóm nước giải khát

   Phần còn lại (đa số, **873 dòng**) là **món hỗn hợp nhiều nhóm nguyên
   liệu** (vd "Lẩu hải sản" = hải sản+rau, "Xôi thịt thập cẩm" = tinh
   bột+thịt) — gán 1 nhóm nguyên liệu duy nhất sẽ sai. Theo quyết định của
   người dùng (2026-07-12): thêm nhãn riêng **"Món ăn hỗn hợp"** thay vì để
   `null`, để biểu đồ phân biệt được "đã biết đây là món hỗn hợp" khác với
   "chưa có dữ liệu phân loại" (`UNCLASSIFIED_GROUP`/"Chưa phân nhóm" —
   luôn xám, xem `food-classify.ts`; "Món ăn hỗn hợp" có màu categorical
   riêng vì là thông tin thật, không phải thiếu dữ liệu).

   Riêng `vddGroupRaw="Đồ hộp"` (23 dòng) CỐ Ý bỏ qua — mẫu quá hỗn tạp
   (trái cây ngâm đường lẫn đậu phộng rang dầu), không có nhãn nào đúng.

Kết quả: `foodGroup` phủ **~22% → ~51,5%** (1.833/3.557 dòng có nhóm).
Toàn bộ 1.149 lượt cập nhật đã dry-run + soát số trước khi `--apply`.
`scripts/seed-foods.ts` cũng đã sửa (`NHOM_MAP` + `MONAN_GROUP_MAP` mới)
để lần seed lại từ đầu sau này ra kết quả đúng ngay, không cần chạy
`fix-food-groups.ts` lại. `src/lib/food-classify.ts` → `FOOD_GROUP_ORDER`
đã thêm 3 nhóm mới (màu categorical riêng, xem file đó).

## 14. Bổ sung `foodType="SP"` (Sản phẩm) (2026-07-13)

App cũ (gg script, `Admin/JS_Core.html`) định nghĩa **4 giá trị gốc** cho
`LoaiThucPham`/`foodType`: `MA` (món ăn), `CB` (chế biến), `TS` (tươi sống),
`SP` (sản phẩm — hàng đóng gói có thương hiệu). Script seed hiện tại
(`scripts/seed-foods.ts`) trước đó **chưa từng gán `SP`** — mọi thứ chỉ rơi
vào TS (mặc định) hoặc CB (theo từ khóa chế biến chung chung), kể cả sữa bột
trẻ em, mì gói có thương hiệu, đồ ăn nhanh (KFC/Pizza Hut/Domino's...) — đều
bị coi là "Tươi sống" một cách vô lý.

**Đã sửa** (`scripts/fix-food-sp-type.ts`, chạy trực tiếp trên DB sống):
gán `foodType="SP"` dựa trên 2 tín hiệu (đã soát bằng mắt TOÀN BỘ 570+124
dòng ứng viên trước khi ghi, không thấy sai):
1. Có **định lượng bao bì** trong tên: `\d+(g|ml|kg|l)/(gói|hộp|túi|lon|chai|hủ|ly|thanh|viên|cái|miếng)`.
2. Có **tên thương hiệu** nhận diện được — danh sách `SP_BRANDS` trong
   `seed-foods.ts`/`fix-food-sp-type.ts` (Vinamilk, NutiFood, Abbott, Nestle,
   Wakodo, Acecook, Vifon, Masan, KFC, Pizza Hut, Domino's, Vitadairy,
   Frisolac, Enfamil, Similac, TH true Milk, Dutch Lady, Hảo Hảo, Omachi...).

So khớp **giữ nguyên dấu/hoa thường gốc** (bài học sự cố alias mục 12 —
KHÔNG dùng `normalizeVi` để quyết định phân loại, chỉ dùng cho tìm kiếm).

Kết quả: `foodType` từ {TS: 2251, CB: 253, MA: 1053} → {**TS: 1700, CB:
234, MA: 1053, SP: 570**}. Đã wire `SP` vào 2 chỗ UI/API đang validate cứng
danh sách loại (`src/app/thuc-pham/page.tsx`, `src/app/api/foods/search/route.ts`)
— chỉ thêm `"SP"` vào mảng cho phép + nhãn hiển thị, KHÔNG đổi logic/UI khác
(Codex đang làm UI phần `tinh-khau-phan`, không đụng vào file đó).
`scripts/seed-foods.ts` cũng đã thêm luật này để seed lại từ đầu ra đúng
ngay, không cần chạy `fix-food-sp-type.ts` lại.

## 15. Mở rộng `proteinOrigin` cho "Món ăn" + "Đồ hộp"/"Thức ăn truyền thống" (2026-07-13)

Cùng lỗ hổng như `foodGroup` (mục 13): `proteinOrigin` trước đó chỉ được gán
cho thực phẩm thô (file gộp), toàn bộ 1.053 dòng "Món ăn" luôn `null`
(0%) — kể cả `Đồ hộp`/`Thức ăn truyền thống` (2 nhóm merged-file đã bỏ ngỏ
từ mục 13) cũng chưa có.

**Đã sửa** (`scripts/fix-protein-origin.ts`, chạy trực tiếp trên DB sống),
cùng nguyên tắc mục 13 — chỉ gán khi chắc chắn, còn lại dùng nhãn riêng
**"Hỗn hợp"** (khác `null`/"Chưa phân loại" — đã biết là món nhiều nguồn
đạm, vd "Cơm sườn" = tinh bột + thịt):

- Chắc chắn 1 nguồn đạm: Các loại trái cây → Thực vật; Ngao, ốc → Thịt
  trắng; Các món trứng, sữa và chế phẩm / Chè, caramen, kem → Trứng sữa;
  Các món chế biến sẵn → Chế biến.
- **"Món xào"** (15 dòng) — gán **thủ công theo từng tên** (không dùng từ
  khóa `RED_MEAT_KW`/`WHITE_MEAT_KW` có sẵn vì "sườn"/nội tạng không khớp),
  đã soát toàn bộ 15 tên trước khi quyết định.
- Phần còn lại (13 nhóm vddGroupRaw, 1.002 dòng — cơm/cháo/xôi/bánh
  đa/bún/phở/lẩu/bánh mỳ/đồ hộp/giải khát...) → "Hỗn hợp".

Kết quả: `proteinOrigin` phủ **~13,4% → ~44,5%** (1.582/3.557 dòng).
`src/lib/food-classify.ts` → `PROTEIN_ORIGIN_ORDER` đã thêm "Hỗn hợp" (màu
categorical riêng, ngay sau Thịt trắng). `scripts/seed-foods.ts` đã thêm
đầy đủ luật này (merged-food loop + `seedVddMonAn()`) để seed lại từ đầu
sau này ra đúng ngay.

## 16. Sửa lỗi liên kết `DishIngredient.foodId` — 4,5% → ~99% (2026-07-13)

Rà soát phát hiện `scripts/link-ingredients.ts` (chạy 1 lần lúc seed ban
đầu) chỉ liên kết được **1.881/41.446 nguyên liệu (4,5%)** — tức 95,5%
công thức món ăn RNI KHÔNG có `foodId`, nên trang `/mon-an` không tính
được dinh dưỡng cho hầu hết nguyên liệu.

**Nguyên nhân:** script so khớp tên ĐẦY ĐỦ (`DishIngredient.foodNameRaw`
với `Food.name`) — nhưng `Food.name` luôn có chú thích tiếng Anh/định
lượng trong ngoặc (vd `"Gạo tẻ máy (Ordinary polished rice, raw)"`) trong
khi nguyên liệu công thức chỉ ghi tên trần (`"Gạo tẻ máy"`) → không bao
giờ khớp tuyệt đối.

**Đã sửa:** thêm tầng so khớp thứ 2 — nếu không khớp tên đầy đủ, so phần
tên TRƯỚC dấu "(" đầu tiên (cắt ở CẢ 2 phía, vì nguyên liệu cũng có ghi
chú kiểu `"(muỗng lường 41g)"`). Kết quả: **39.160/39.565 nguyên liệu còn
lại khớp thêm (99,0%)** → tổng liên kết ~99% (41.041/41.446).

## 17. Số liệu bất khả thi trong nguồn VDD "Món ăn" — đã null riêng field sai (2026-07-13)

Rà soát sanity-check (tổng Đạm+Béo+Bột đường+Nước+Tro phải ≤ ~100g/100g)
phát hiện **270 dòng** (266 VDD, chủ yếu `foodType=MA`) có tổng vượt
115g/100g — về mặt vật lý không thể. Đã tra ngược **file Excel gốc**
(`Món ăn của VDD.xlsx`) — số liệu sai NẰM SẴN TRONG FILE NGUỒN (vd
"Thịt lợn xá xíu" cột 6 "Chất đạm (g)" = 503 ngay trong file gốc), không
phải do script seed đọc nhầm cột.

**Không thể biết số ĐÚNG là bao nhiêu** nên KHÔNG đoán số thay thế —
thay vào đó (`scripts/fix-impossible-macros.ts`, đã `--apply`) chỉ
**null riêng field nào TỰ NÓ bất khả thi bất kể ngữ cảnh** (không đụng
các field khác cùng dòng):

- `proteinG > 100` (14 dòng) — 100g đạm/100g thực phẩm là giới hạn TOÁN
  HỌC tuyệt đối (khối lượng đạm không thể vượt khối lượng thực phẩm).
  Ví dụ: "Thịt lợn xá xíu" 503g, "Kem tươi" 335g, "Sữa chua chân trâu" 244g.
- `cholesterolMg > 10000` (3 dòng — CHỈ 3, không phải 6) — cố tình đặt
  mốc cao hơn nhiều lần giá trị cực đoan nhưng CÓ THẬT (óc bò ~3000-3300mg,
  tim/bầu dục ~5600mg/100g đều là số liệu hợp lý, KHÔNG null) để chỉ bắt
  đúng 3 dòng "Lẩu" sai rõ rệt 25000-35000mg (Lẩu ếch/Lẩu gà/Lẩu cua-thịt bò).

Còn lại phần lớn 270 dòng ban đầu KHÔNG bị đụng vào — tổng >115g chỉ vì
thiếu dữ liệu Nước/Tro (tính là 0 trong phép kiểm tra), không hẳn là sai
thật; null nhầm sẽ mất dữ liệu tốt. Nếu muốn rà soát sâu hơn (so từng dòng
với file Excel gốc), đây vẫn là việc còn để ngỏ.

## 18. `foodGroup` cho phần còn lại (chủ yếu RNI) — suy luận theo tên (2026-07-13)

Sau mục 13, `foodGroup` còn **1.724 dòng null** — gần hết là RNI (file
nguồn RNI không có cột nhóm cho từng thực phẩm, xem mục 13). Theo yêu cầu
người dùng ("điền trước, để soát lại sau, dùng hết token để duyệt lun
cũng đc"), đã viết `scripts/fix-foodgroup-rni.ts` suy luận nhóm từ TỪ
KHOÁ trong TÊN (giữ nguyên dấu, so theo từ/cụm từ nguyên vẹn — không phải
substring, bài học từ sự cố alias mục 12). Đây là suy luận theo tên, **độ
tin cậy thấp hơn dữ liệu có nguồn gốc** — người dùng sẽ tự soát lại.

Kiến trúc so khớp (đọc kỹ trước khi sửa thêm — đã qua 4 đợt soát bằng mắt
phát hiện nhiều lỗi khớp từ):

1. Cổng nhận diện TÊN MÓN chạy trước (Bánh/Chè/Kẹo/Mứt/Kem/Thạch/Pizza/
   Hamburger/Sushi/Hạt/Cháo/Sinh tố...) để hương vị/nguyên liệu phụ phía
   sau tên không gây nhiễu.
2. So khớp nguyên liệu chỉ trong 4 từ đầu tên (nguyên liệu chính thường
   đứng đầu).
3. **Tầng A** (mọi cụm từ ≥2 từ của mọi nhóm) luôn chạy trước **Tầng B**
   (từ đơn) — cụm từ cụ thể ("tương ớt", "bột nêm") luôn thắng từ đơn
   chung chung ("ớt", "rau") dù nhóm nào đứng trước trong mảng RULES.
4. Trong Tầng B, từ đơn khớp ở **vị trí sớm nhất trong tên** thắng — không
   phải nhóm nào đứng trước trong mảng RULES thắng (sửa lỗi "Rau giấp cá"
   bị "cá" bắt nhầm thành thịt dù "rau" đứng từ đầu tiên).
5. Tên có từ "chay" (đồ chay/giả mặn, vd "Cá lóc chay", "Đùi gà chay")
   KHÔNG được gán Nhóm thịt dù trùng từ khoá con vật — thà để trống.
6. `bột` không dùng làm từ đơn tự do (bột đạm/whey/maltodextrin — thực
   phẩm bổ sung — không phải lương thực) — chỉ nhận diện qua cụm từ cụ
   thể (bột gạo/bắp/ngô/mì/sắn/nếp/năng/đậu tương).

Các lỗi khớp từ cụ thể đã tìm và sửa qua nhiều vòng: "Hạt nêm" (gia vị)
bị cổng "hạt" bắt nhầm; "Chuối tiêu"/"Nhãn hạt tiêu" bị "tiêu" (gia vị)
thắng; "Quả trứng gà (lê ki ma)" — một loại quả — bị "trứng" thắng; "Đậu
gà" (chickpea) bị "gà" thắng thành thịt; "Đậu bắp" (okra, một loại quả)
bị "đậu" thắng thành nhóm hạt; "Thịt heo muối xông khói" (bacon) từng bị
"muối" thắng thành gia vị; dầu ăn (dầu cám gạo/dầu ngô), rượu (rượu nếp/
rượu cam chanh) từng bị nguyên liệu gốc (gạo/ngô/cam) thắng.

**Kết quả:** phân loại được **1.513/1.724** dòng (~87,7%), còn lại 211
dòng để trống — phần lớn là thực phẩm bổ sung tăng cơ/protein bar
thương hiệu nước ngoài (Whey/Mass Gainer/Protein Bar...) không khớp bất
kỳ nhóm VDD nào, để trống đúng hơn là đoán. Phủ `foodGroup` toàn bộ
bảng `foods`: **~51,5% → ~94,1%** (3.346/3.557 dòng có nhóm).

Đã `--apply` và xác nhận `verify-seed.ts` không đổi `foodCount/dishCount/
ingCount`. Người dùng sẽ tự soát lại thủ công phần suy luận theo tên này,
đặc biệt các dòng biên/thương hiệu.

## 19. Cập nhật `nutrition_recommendations` theo "Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam" bản 2026 (2026-07-13)

Người dùng gửi file PDF chính thức bản 2026 (Viện Dinh dưỡng, Bộ Y tế),
thay thế bản 2016 mà bảng `nutrition_recommendations` (72 dòng) được khởi
tạo theo trước đây. Theo yêu cầu người dùng ("rà soát toàn bộ 72 dòng ×
tất cả các trường theo tài liệu 2026 này rồi cập nhật lại CSDL"), đã đối
chiếu **toàn bộ 72 dòng × tất cả các trường** (năng lượng, cân nặng tham
chiếu, tỉ lệ đạm/béo/đường, 12 vitamin, 6 khoáng chất, chất xơ/nước/natri/
kali/clorua) với các bảng Phụ lục 1-7 của tài liệu mới.

Quy ước dữ liệu áp dụng xuyên suốt (giữ nguyên từ trước, tiếp tục dùng cho
dữ liệu 2026): **sắt lấy cột "hấp thu 10%"**, **kẽm lấy cột "mức hấp thu
vừa"** — vì app không phân biệt được mức hấp thu thực tế của người dùng.
Với các dòng "Phụ nữ có thai/cho con bú", `proteinMinPct/MaxPct` tiếp tục
lưu **số gam chênh lệch tuyệt đối** (không phải phân số) — UI
(`RecommendationComparison.tsx`) đã xử lý riêng trường hợp này qua cờ
`proteinIsExtraGrams`. Trường béo (lipid) không có quy ước gam-chênh-lệch
tương tự nên bị để `null` ở các dòng này (tài liệu chỉ cho số gam tăng
thêm, không có % và không có field riêng để lưu).

Đã viết `scripts/_ref2026.ts` (transcribe số liệu từ Phụ lục) và
`scripts/_audit2026.ts` (diff DB hiện tại vs. số liệu tham chiếu, `--apply`
để ghi). Qua nhiều vòng dry-run và soát tay từng dòng/từng bảng trong PDF
đã phát hiện và sửa ~15 lỗi tự nhập liệu (nhầm cột EAR/RDA, thiếu override
theo giới tính cho vitE/vitK, thiếu sắt cho nhóm thai phụ, lỗi `undefined`
trong object spread làm mất giá trị kế thừa...) trước khi áp dụng.

**Kết quả:** đã cập nhật **72/72 dòng**, tổng 574 ô dữ liệu thay đổi.
Đáng chú ý nhất:
- Năng lượng: sửa nhiều nhóm tuổi (15-17, 18-29, 30-49, 50-64 tuổi cả hai
  giới, 50-64 tuổi) theo mức hoạt động thể lực mới.
- Canxi: tăng 800→1000mg cho nữ 10-11/12-14/15-17 tuổi (bug gốc được
  người dùng phát hiện ban đầu).
- Nhóm **≥75 tuổi**: trước đây **hoàn toàn thiếu** ~15 trường vi chất
  (vitamin A/D/E/K/nhóm B/C, canxi, sắt, kẽm, magiê, i-ốt) — tài liệu 2016
  không tách riêng nhóm tuổi này; nay đã điền đủ theo tài liệu 2026.
- Thêm giá trị vitE/vitK theo giới tính cho nhiều nhóm tuổi (trước đây
  toàn bộ nữ kế thừa nhầm giá trị nam do thiếu override).
- Chuẩn hoá nhãn `*Type` (vd `phosphorusType`: "RDA"→"AI", thêm hậu tố
  "(hấp thu 10%)"/"(hấp thu vừa)" cho sắt/kẽm, "(delta)" cho các trường
  chênh lệch thai kỳ/cho con bú) để khớp đúng cột nguồn trong tài liệu.

**Giới hạn đã biết (không sửa, ghi nhận để người dùng lưu ý):**
- `energyKcal` của các dòng người lớn (không phải trẻ em ≤18 tuổi) hiện
  **không được UI đọc** — `RecommendationComparison.tsx` tính năng lượng
  mục tiêu người lớn bằng công thức Mifflin-St Jeor, không lấy từ DB. Vẫn
  sửa đúng theo tài liệu vì lý do toàn vẹn dữ liệu, nhưng không ảnh hưởng
  UI hiện tại.
- Tương tự, `energyKcal` của các dòng thai phụ/cho con bú lưu đúng số
  chênh lệch (+50/+250/+450/+500) theo tài liệu, nhưng UI dùng hằng số
  `PHYS_BONUS` riêng (250/450/500) và **hiện chưa cộng bonus cho tam cá
  nguyệt đầu** (+50) — đây là khoảng trống trong code UI, không phải dữ
  liệu, nên không tự sửa (file thuộc phạm vi Codex đang chỉnh sửa song
  song); nêu ra để người dùng cân nhắc.

Đã `--apply`, xác nhận `verify-seed.ts` không đổi `foodCount/dishCount/
ingCount`, và dry-run lại lần cuối cho ra `0/72 dòng lệch`.

## 20. Chuẩn tăng trưởng WHO dùng cho Z-score (2026-07-14)

Website dùng bộ LMS đóng gói tại `src/lib/who-growth-data.generated.json`, được tạo lại bằng
`node scripts/generate-who-growth-data.mjs` từ các workbook WHO gốc người dùng cung cấp ở thư mục
gốc dự án. Dữ liệu này tách biệt hoàn toàn với `Food`, `Dish` và bảng mốc cũ
`child_growth_standards`.

- **WHO Child Growth Standards 2006, 0–5 tuổi:** cân nặng-theo-tuổi (WFA),
  chiều dài/chiều cao-theo-tuổi (LHFA), cân nặng-theo-chiều dài (WFL),
  cân nặng-theo-chiều cao (WFH), BMI-theo-tuổi (BFA); đủ bé trai/bé gái.
- **WHO Growth Reference 2007, 5–19 tuổi:** BMI-theo-tuổi (BFA) và chiều cao-theo-tuổi (LHFA),
  đủ bé trai/bé gái; cân nặng-theo-tuổi (WFA) chỉ có 5–10 tuổi theo phạm vi WHO.
- Z-score tính bằng công thức LMS từ tuổi theo tháng hoặc chiều dài/chiều cao gần nhất.
  Vì hồ sơ hiện chỉ nhập tuổi thay vì ngày sinh, kết quả hiển thị là ước tính theo mốc tháng.
  Không áp dụng cho trẻ sinh non hay trường hợp cần quy trình chuyên môn riêng.
