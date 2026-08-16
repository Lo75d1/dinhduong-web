# M2 (đi chợ/xuất ăn) — ĐỔI HƯỚNG: RÁP TỪ /tinh-khau-phan

> Người viết: Claude (điều phối). Cập nhật 2026-08-16.
> **ĐỌC TRƯỚC KHI ĐỘNG VÀO M2.** Đây là chỉ đạo đổi hướng do người dùng chốt.
> Liên quan: nhánh `codex/bao-an-m2` (PR #2), `AGENTS.md`, `PROJECT_STATUS.md`.

## 0. DỪNG — bản M2 hiện tại đi SAI HƯỚNG

Nhánh `codex/bao-an-m2` (commit code `b7dabc1`) dựng **một menu-editor riêng trong module
báo ăn**: khoa DD chọn món từ kho `Dish` + nhập gram/suất ngay trong `OperationsApp`
(`saveMenu` yêu cầu `dishId`+`servingWeightG`).

**Vấn đề:** khoa DD **đã lập thực đơn ở `/tinh-khau-phan`** (công cụ tính khẩu phần đã có
kho món + gram + đi chợ). Bắt họ chọn món lại trong meal-ops = **nhập hai lần / dựng song
song** — trái nguyên tắc `AGENTS.md` #1.

→ **KHÔNG merge `codex/bao-an-m2`. KHÔNG chạy thêm nghiệm thu cho bản này.** (Commit
`8361a80` đã nộp bằng chứng nghiệm thu cho bản sai hướng — bỏ, không dùng để merge.)

## 1. Hướng ĐÚNG

- Khoa DD lập thực đơn ở **`/tinh-khau-phan`** (nơi đã có kho món + gram + %thải bỏ + đi chợ).
- Module báo ăn/suất ăn (meal-ops) chỉ **RÁP**: lấy thực đơn đó → **nhân với số suất điều
  dưỡng đã chốt** (`MealOrder`) → ra **xuất ăn / đi chợ**. **KHÔNG nhập món trong meal-ops.**

**Tin tốt — ráp đúng thì tái dùng nhiều hơn, ít việc mới hơn:**
- `/tinh-khau-phan` lập ở mức **THỰC PHẨM + gram + %thải bỏ** (`Row[]`), chính là dữ liệu mà
  máy đi chợ `src/app/tinh-khau-phan/ShoppingList.tsx` đã tính (mua = sống sạch ÷ (1−%thải
  bỏ), thiếu → "—"). → **KHÔNG cần** phần `Dish`-linkage + `servingWeightG` mà `b7dabc1` mới
  thêm vào `KitchenMenuItem`. Cân nhắc bỏ, chỉ giữ hàm gộp `buildKitchenShoppingList` nếu tái
  dùng được ở mức thực phẩm.

## 2. ⚠️ VƯỚNG PHẢI CHỐT TRƯỚC KHI DỰNG CẦU NỐI (chưa quyết — hỏi người dùng)

`/tinh-khau-phan` lập thực đơn cho **MỘT khẩu phần / một người**, **KHÔNG có khái niệm "chế
độ ăn"** (Cơm thường / Cháo / ĐTĐ...). Còn báo ăn cần thực đơn **theo TỪNG chế độ ăn**
(`KitchenDietType`) để nhân với số suất mỗi chế độ.

**Câu phải trả lời:** khoa DD sẽ lập thực đơn cho từng chế độ ăn như thế nào? (VD: lập nhiều
thực đơn riêng ở `/tinh-khau-phan`, mỗi cái gắn nhãn một chế độ ăn, rồi đẩy sang báo ăn?)
**Chưa có câu trả lời → CHƯA dựng cầu nối.**

## 3. Bối cảnh kỹ thuật cho người dựng (khi đã chốt mục 2)

- `/tinh-khau-phan`: menu = `Row[]` (bữa→món→thực phẩm), lưu **localStorage** (`khauphan_menu_days_v1`
  cho nhiều ngày). Lưu server = `Ration`/`RationItem` (`RationItem` có `foodId`, `meal`,
  `dish` (tên chuỗi), `edibleGrams`, `wastePercent` — **mức thực phẩm, KHÔNG có `dishId`,
  KHÔNG có chế độ ăn**).
- meal-ops: `KitchenMenu` (per `mealDate`×`mealType`) + `KitchenMenuItem` (per `dietType`).
  `MealOrder`/`MealOrderItem` = số suất điều dưỡng chốt theo (khoa×ngày×bữa×chế độ).
- Cầu nối cần: đưa menu mức-thực-phẩm-theo-chế-độ từ `/tinh-khau-phan` → meal-ops (đường
  server), rồi × số suất mỗi chế độ → gộp đi chợ. Giữ trung thực: thiếu %thải bỏ/liên kết → "—"/cảnh báo, KHÔNG đoán.

## 4. Quy ước bắt buộc (đừng quên như lần trước)

- **Thiết bị:** chỉ **bệnh nhân dùng điện thoại** (mobile-first). **Bác sĩ/điều dưỡng/khoa
  DD/bếp dùng MÁY TÍNH** → màn nhân viên tối ưu desktop; **nghiệm thu chụp màn nhân viên ở
  desktop ~1280px**, chỉ trang bệnh nhân chụp mobile.
- **Quy trình `AGENTS.md`:** làm trên nhánh `codex/...` → PR → **Claude duyệt** → mới merge.
  Không commit thẳng main, không migrate DB dùng chung, không deploy.
- Điều dưỡng vẫn là người chốt số suất duy nhất; bệnh nhân chỉ xem + ghi chú (qua duyệt).

## 5. Việc kế tiếp

1. Người dùng chốt mục 2 (cách lập thực đơn theo chế độ ăn).
2. Claude viết spec cầu nối cụ thể.
3. Codex dựng trên nhánh mới → PR → Claude rà. Bản `b7dabc1`/`codex/bao-an-m2` coi như bỏ
   (hoặc làm lại từ nó nhưng gỡ phần nhập-món-trong-meal-ops).
</content>
