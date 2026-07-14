# Trạng thái dự án — Web Dinh Dưỡng Việt Nam

Đọc file này TRƯỚC khi làm bất cứ việc gì trong `D:\datanutrition\web`. Đây là
bản tóm tắt để phiên chat mới (theo đúng khuyến nghị: chia nhỏ hội thoại, ghim
tài liệu nền tảng) không phải dò lại từ đầu.

## Bối cảnh

Rebuild lại 1 app dinh dưỡng cũ (Google Apps Script, thư mục
`gg script dinhduong by claude`) thành web thật (Next.js). **Bản Apps Script
CHỈ LÀ MẪU THAM KHẢO — không sửa, không deploy nó.** Dữ liệu thực phẩm/món ăn
lấy từ 2 nguồn chính thống: Viện Dinh Dưỡng Việt Nam (VDD) + RNI.

## Ngăn xếp công nghệ

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind
- Prisma 7 + Supabase Postgres (đã có dữ liệu thật, xem bên dưới)
- Không dùng thư viện chart ngoài — tự vẽ bằng SVG/div thuần theo skill `dataviz`
  (palette đã validate CVD-safe, xem `RationCharts.tsx`/`MealCharts.tsx`/`GrowthChart.tsx`)
- Máy dev **không có Python**, Node.js cài qua winget. Mọi lệnh npm/npx/tsx
  trong PowerShell phải nạp PATH trước: xem cách gọi trong lịch sử, dùng
  `$env:Path = [System.Environment]::GetEnvironmentVariable(...)`

## ⚠️ Bẫy hay gặp nhất: Prisma client cache

Sau MỌI lần `prisma migrate`/`prisma db push`/`prisma generate`, PHẢI **restart
dev server** (dừng rồi `preview_start` lại). Turbopack cache bản Prisma Client
cũ trong bộ nhớ → gọi model/field mới sẽ báo lỗi 500 "Cannot read properties of
undefined" dù code đúng. Gặp lỗi này → restart trước khi debug gì khác.

## Dữ liệu đã seed (Supabase, xem chi tiết + mọi giả định trong `README-data.md`)

| Bảng | Số dòng | Script seed |
|---|---|---|
| `foods` | **3.557** (đã dọn trùng 2026-07-12, xem README-data.md mục 11) | `scripts/seed-foods.ts` |
| `dishes` + `dish_ingredients` | 7.369 / 41.446 | `scripts/seed-dishes.ts` (+ `link-ingredients.ts`) |
| `nutrition_recommendations` | 72 | `scripts/seed-reference-tables.ts` |
| `diet_codes` | 246 | (cùng script trên) |
| `child_growth_standards` | 40 | (cùng script trên) |

**Luôn đọc `README-data.md` trước khi dùng bất kỳ trường nào có vẻ mơ hồ** —
nhiều cột trong dữ liệu gốc dùng quy ước KHÔNG nhất quán (vd 4 dòng "Phụ nữ
có thai/cho con bú" trong `nutrition_recommendations` lưu số CỘNG THÊM chứ
không phải tổng — đã có bug thật vì hiểu nhầm cái này, xem mục 9 file đó).

RNI có tái sử dụng thực phẩm của VDD (352 dòng trùng đã xoá qua 2 script
`scripts/dedupe-foods.ts` + `dedupe-foods-vi-name.ts`, luôn bù dữ liệu thiếu
trước khi xoá, ưu tiên giữ VDD — xem README-data.md mục 11 trước khi seed
lại hoặc thêm dữ liệu food mới, tránh tái tạo trùng lặp).

`foodGroup` đã sửa (2026-07-12, `scripts/fix-food-groups.ts`, xem README-data.md
mục 13): tách nhãn sai "Nước ngọt" → "Nhóm nước giải khát" + "Nhóm bánh kẹo, đồ
ngọt"; gán nhóm cho 1.149 dòng "Món ăn" VDD trước đó luôn null (script seed gốc
chưa map hệ Nhóm riêng của file Món ăn); món hỗn hợp nhiều nguyên liệu (873
dòng) → nhãn riêng "Món ăn hỗn hợp" (khác "Chưa phân nhóm" — đó là thiếu dữ
liệu thật). RNI không có cột nhóm cho từng thực phẩm (đã kiểm tra file nguồn)
— không có gì để phân loại từ nguồn cho RNI.

`foodGroup` phần còn lại (2026-07-13, `scripts/fix-foodgroup-rni.ts`, xem
README-data.md mục 18): 1.724 dòng null còn lại (chủ yếu RNI) được suy luận
theo TỪ KHOÁ trong TÊN (độ tin cậy thấp hơn dữ liệu có nguồn gốc, theo yêu cầu
người dùng "điền trước, để soát lại sau") — phân loại được 1.513/1.724
(~87,7%), 211 dòng để trống (chủ yếu thực phẩm bổ sung/protein bar thương hiệu
ngoại không khớp nhóm VDD nào). Phủ `foodGroup` toàn bảng: ~51,5% → **~94,1%**.
Người dùng sẽ tự soát lại thủ công phần suy luận theo tên này.

`foodType` đã bổ sung nốt loại thứ 4 "SP" (Sản phẩm) còn thiếu từ đầu
(2026-07-13, `scripts/fix-food-sp-type.ts`, xem README-data.md mục 14) — 570
dòng sữa bột/mì gói/đồ ăn nhanh có thương hiệu trước đó bị coi nhầm là "Tươi
sống". Đã thêm `"SP"` vào 2 chỗ validate loại cứng (`thuc-pham/page.tsx`,
`api/foods/search/route.ts`) — KHÔNG đụng file UI Codex đang sửa
(`tinh-khau-phan/*`).

`proteinOrigin` đã mở rộng tương tự (2026-07-13, `scripts/fix-protein-origin.ts`,
xem README-data.md mục 15): ~13,4% → ~44,5%, dùng nhãn "Hỗn hợp" cho món nhiều
nguồn đạm (khác "Chưa phân loại" — thiếu dữ liệu thật).

**Bug lớn đã sửa (2026-07-13, README-data.md mục 16):** `DishIngredient.foodId`
chỉ liên kết được 4,5% (script cũ so tên đầy đủ kèm chú thích tiếng Anh, không
bao giờ khớp) → sửa `scripts/link-ingredients.ts` thêm tầng so tên trước dấu
"(" → **99,0%**. Ảnh hưởng trực tiếp tới dinh dưỡng nguyên liệu ở `/mon-an`.

**Số liệu nguồn VDD có chỗ bất khả thi** (2026-07-13, README-data.md mục 17):
270 dòng "Món ăn" có tổng macro > 100g/100g — tra ngược Excel gốc thì sai NẰM
SẴN trong nguồn, không phải lỗi đọc. Đã null riêng field bất khả thi tuyệt đối
(`proteinG>100`, `cholesterolMg>10000` — 17 dòng), KHÔNG đoán số thay thế,
KHÔNG đụng field khác cùng dòng. Phần còn lại (thiếu Nước/Tro làm tổng lệch)
chưa rà soát sâu — còn để ngỏ nếu muốn làm tiếp.

**`nutrition_recommendations` cập nhật theo tài liệu 2026** (2026-07-13,
README-data.md mục 19): người dùng gửi bản PDF chính thức 2026 (thay bản 2016
seed gốc), yêu cầu rà soát toàn bộ 72 dòng × tất cả các trường rồi cập nhật
CSDL. Đã cập nhật 72/72 dòng (574 ô), đáng chú ý nhất: năng lượng nhiều nhóm
tuổi trưởng thành, canxi nữ 10-11/12-14/15-17 tuổi (800→1000mg), và nhóm
**≥75 tuổi** trước đây thiếu HOÀN TOÀN ~15 trường vi chất (bản 2016 không
tách riêng nhóm tuổi này) nay đã điền đủ. Giữ nguyên quy ước cũ: sắt = cột
"hấp thu 10%", kẽm = cột "mức hấp thu vừa", protein thai phụ/cho con bú lưu
số gam chênh lệch (không phải %). Lưu ý còn tồn: `energyKcal` người lớn
không được UI đọc (dùng Mifflin-St Jeor), và UI hiện chưa cộng bonus năng
lượng cho tam cá nguyệt đầu (+50 kcal theo tài liệu mới) — khoảng trống ở
code UI, không sửa vì thuộc phạm vi Codex đang chỉnh song song.

## Trang đã xây (`src/app/...`)

- `/` — trang chủ, thống kê
- `/thuc-pham`, `/thuc-pham/[id]` — tra cứu thực phẩm (tìm không dấu, chi tiết ~170 chất)
- `/mon-an`, `/mon-an/[id]` — tra cứu món ăn RNI (công thức nguyên liệu)
- `/tinh-khau-phan` — trang chính, gồm (thứ tự render trong `Calculator.tsx`):
  1. `PersonalProfile.tsx` — hồ sơ cá nhân, BMI, Mifflin-St Jeor TDEE, biểu đồ
     tăng trưởng WHO cho trẻ em (`GrowthChart.tsx`)
  2. `MealInput.tsx` — nhập Bữa ăn → Món ăn → Thực phẩm (cây, lưu localStorage)
  3. Tổng dinh dưỡng cả ngày (18 chất cốt lõi, `lib/nutrient-fields.ts`)
  4. `RecommendationComparison.tsx` — đối chiếu tự động theo tuổi/giới (khớp
     qua `matchRecommendation.ts`)
  5. `DietCodeComparison.tsx` — đối chiếu mã CĐĂ bệnh lý (chọn thủ công, 2 tầng lọc)
  6. `MealCharts.tsx` — biểu đồ theo từng bữa: năng lượng, P/L/G, chất xơ+GI, Purin+đạm,
     Cholesterol+béo, Natri theo bữa+nhóm thực phẩm (7 biểu đồ "nhóm C" ở đây + RationCharts,
     xem chi tiết bên dưới)
  7. `RationCharts.tsx` — biểu đồ tổng cả ngày (P/L/G, đóng góp theo thực phẩm)
  8. `OriginCharts.tsx` — phân bố cả ngày: Nguồn gốc Protein, Nguồn gốc Lipid (suy luận theo
     tên món, không có trường gốc), Nhóm thực phẩm theo khối lượng

Field phân loại (foodGroup/proteinOrigin/giLevel/purinLevel/cholesterolLevel) được snapshot
vào `Row.classify` lúc thêm thực phẩm (xem `src/lib/food-classify.ts`) — cùng cơ chế với
`Row.nutrients`. `loadRows()` bù `EMPTY_CLASSIFY` cho rows cũ lưu trước khi có field này.

## API routes

`/api/foods/search`, `/api/growth-standards`, `/api/nutrition-recommendations`,
`/api/diet-codes` — đều là route.ts đơn giản, đọc Prisma trực tiếp.

## localStorage keys (client-side, chưa có đăng nhập/lưu server)

`khauphan_rows_v1` (bữa/món/thực phẩm), `khauphan_profile_v1` (hồ sơ cá nhân),
`khauphan_dietcode_v1` (mã CĐĂ đã chọn).

## Việc CÒN LẠI

### Rebuild tính khẩu phần (đang thực hiện theo từng bước)

- Bước 1 (2026-07-12): đã chốt đặc tả tại `REBUILD_SPEC.md`; không thay đổi
  dữ liệu VDD/RNI hoặc Apps Script cũ.
- Bước 2 (2026-07-12): thêm `quantity.ts`, mô hình chế độ `recall24h`/`menu`,
  snapshot `wastePercent` vào từng `Row` và test quy đổi. `Row.grams` tiếp tục
  là gram ăn được chuẩn hóa để không đổi kết quả của khẩu phần cũ. Giao diện
  chọn chế độ và bảng quy đổi chưa làm; đó là bước tiếp theo.
- Bước 3 (2026-07-12): rebuild `MealInput.tsx` có nút chọn **Khẩu phần 24 giờ**
  / **Lập thực đơn**, lưu chế độ vào localStorage và đổi các cột nhập theo chế
  độ. Dòng có đủ tỷ lệ thải bỏ được quy đổi khi đổi chế độ; dòng thiếu dữ liệu
  không bị đoán 0% và được cảnh báo. `test:ration`, TypeScript và lint các file
  đã sửa đều đạt.
- Bước 4 (2026-07-12): thêm `RationDetail.tsx` sau tổng dinh dưỡng: bảng theo
  **Bữa → Món → Thực phẩm** (ăn được, nguyên liệu, Kcal/P/L/G) và bảng gộp
  nguyên liệu. Logic thuần ở `ration-detail.ts`, có `test:ration-detail`; nếu
  một dòng chưa đủ tỷ lệ thải bỏ thì tổng nguyên liệu hiển thị `—`, không cộng
  thiếu thành số giả.
- Bước 5 (2026-07-12): làm lại bảng **Dinh dưỡng khẩu phần chi tiết** với dòng
  tổng món màu vàng, tổng bữa xanh nhạt và tổng ngày xanh đậm. Nút **Chọn chất**
  cho phép chọn cột dinh dưỡng; API `report-nutrients` chỉ đọc CSDL để lấy các
  chất đã chọn. Bổ sung bảng dữ liệu gốc /100g (có năng lượng, nguồn và hao hụt)
  và `test:ration-report` kiểm tra các tổng món/bữa/ngày.
- Bước 6 (2026-07-12): rebuild khu **Tìm & thêm thực phẩm**: bộ lọc loại
  `TS`/`CB`/`MA`/`SP`, kết quả có nhãn loại, năng lượng /100g và nguồn. Có thể
  tạo thực phẩm tự nhập chỉ trong khẩu phần cục bộ hoặc mở món nhanh; không có
  API ghi CSDL, không migration/seed/sửa dữ liệu nguồn.
- Hiệu chỉnh bộ lọc theo CSDL (2026-07-12): kiểm tra chỉ-đọc cho thấy chỉ có
  `TS`/`CB`/`MA` (không có `SP`), nguồn `VDD`/`RNI` và 11 nhóm VDD. Đã bỏ nhãn
  `SP`, thêm lọc nguồn và nhóm bằng API chỉ-đọc `filter-options`.
- Trang danh mục (2026-07-12): trang **Thực phẩm** lọc theo tên/loại/nguồn/nhóm
  thực phẩm; trang **Món ăn** lọc theo tên/`categoryRaw`/`ageGroup`/`diseaseDiet`
  (toàn bộ món hiện là nguồn RNI). Các trường lọc đều lấy từ dữ liệu hiện có.
- Bước 7 (2026-07-12): thêm `EnergyDistribution.tsx`: bảng trung tâm **Phân bổ
  năng lượng & đối chiếu**, gồm năng lượng thực tế/nhu cầu/chênh lệch, P:L:G theo
  Atwater và tỷ trọng kcal từng bữa. Người lớn dùng Mifflin-St Jeor; trẻ dùng RNI
  theo hồ sơ khi có khuyến nghị. Không thay đổi CSDL.
- Bước 8 (2026-07-12): thêm `MicronutrientComparison.tsx`: chọn vi chất/khoáng
  chất, tổng hợp theo khẩu phần, đối chiếu RNI theo hồ sơ và đánh dấu `≥` khi dữ
  liệu thực phẩm thiếu. `report-nutrients` nâng giới hạn đọc lên 100 trường;
  toàn bộ đều là API chỉ-đọc.
- Bước 9 (2026-07-12): port bảng **Quy đổi đơn vị ăn / nhóm thực phẩm** từ Apps
  Script. `exchange-units.ts` có test cho quy tắc glucid/đạm/béo/gia vị và sửa
  lỗi dò từ khóa `ca` có thể nhầm với `các`; nhóm chưa phân loại không bị đoán.
- Bước 10 (2026-07-12): thay cụm biểu đồ rời bằng `LegacyChartReport.tsx` gồm
  10 mục đánh số theo bố cục script cũ: 5 biểu đồ theo bữa và 5 biểu đồ phân bổ,
  mỗi mục có số liệu kèm theo; bổ sung tỷ lệ năng lượng giữa các bữa.
- Xuất báo cáo & khả năng đọc (2026-07-12): thêm nút **In / Lưu PDF** theo chế
  độ in của trình duyệt và **Xuất CSV (Excel)** cho dòng khẩu phần; tăng cỡ chữ,
  độ tương phản và kẻ ô bảng rõ hơn trên toàn giao diện.
- Bố cục tính khẩu phần (2026-07-12): tách 2 vùng **Nhập dữ liệu** và **Kết quả
  & phân tích**; kết quả mặc định chỉ mở Tổng quan. Người dùng tự tích các nhóm
  Khuyến nghị/Vi chất, Quy đổi hoặc 10 biểu đồ để tránh màn hình quá dài.
- Giao diện hệ thống (2026-07-12): chuyển sang nhận diện chuyên môn với nền giấy
  trung tính, xanh rêu, điều hướng chuẩn hóa và vùng làm việc `max-w-7xl` cho
  các bảng báo cáo rộng. Không thay đổi dữ liệu hay thuật toán tính.

7 biểu đồ "Nhóm C" (GI+xơ, Purin, Cholesterol, Natri+nhóm, Nguồn gốc Protein/Lipid,
Nhóm thực phẩm theo khối lượng) đã xây xong (2026-07-11) trong `MealCharts.tsx` +
`OriginCharts.tsx` — xem mục "Trang đã xây" ở trên. Không dùng dual-axis (theo skill
dataviz): mỗi cặp đại lượng khác thang đo tách thành 2 mini-chart riêng thay vì 1 biểu
đồ 2 trục. GI luôn 0% dữ liệu (không có nguồn) nên chỉ hiện ghi chú, không vẽ biểu đồ.
Nguồn gốc Lipid không có trường gốc trong CSDL — suy luận heuristic theo TÊN món
(mirror `getLipidOrigin` của app cũ), có ghi rõ đây là ước lượng.

Sau đó (chưa bàn tới): auth/lưu khẩu phần trên server, deploy Vercel, trang Admin.

## Quy trình làm việc đã thống nhất với người dùng

- Làm **từng phần nhỏ**, xong 1 phần thì báo cáo + demo trước khi làm tiếp
- MỌI thay đổi UI phải **test thật trên trình duyệt** (Browser pane), không
  chỉ tin `tsc`/`build` — nhiều bug (vd lỗi chọn món trống, lỗi dữ liệu mang
  thai) chỉ lộ ra khi thao tác thực tế
- Ưu tiên số liệu đúng > đầy đủ tính năng — thà để "–"/ghi chú thiếu dữ liệu
  còn hơn đoán số
- gg script cũ: KHÔNG đụng vào, chỉ đọc tham khảo
## Server persistence (pending safe database synchronization)

- Added isolated application schema for `User`, `Session`, `Patient`, `Ration`, and `RationItem`; it does not alter `Food` or `Dish` data.
- Added server-side session authentication and protected APIs for saving, listing, opening, and updating personal rations.
- Added in-calculator account/login and “Lưu lên server” controls.
- Migration application is intentionally paused: Prisma detected existing database drift (`food_aliases` and nutrition recommendation columns) and requested a destructive reset. Do not reset the shared database; reconcile the pre-existing migration history before applying `20260712190000_add_app_persistence`.
