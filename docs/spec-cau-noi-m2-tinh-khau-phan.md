# SPEC M2 (cầu nối) — Thực đơn theo NGÀY × CHẾ ĐỘ ĂN → báo ăn/đi chợ

> Người viết: Claude (điều phối). 2026-08-16. Người dùng đã **chốt phương án mỗi
> ngày × chế độ ăn**. Đây là spec để Codex làm lại M2 trên **nhánh mới**.
> Đọc kèm: `handoff-m2-doi-huong-rap-tinh-khau-phan.md`, `AGENTS.md`, `PROJECT_STATUS.md`.
> **PR #2 `codex/bao-an-m2` (`b7dabc1`) coi như BỎ — không merge/deploy.**

## 1. Mô hình nghiệp vụ (đã chốt)

- Khoa DD lập **một bộ thực đơn cho mỗi (NGÀY × CHẾ ĐỘ ĂN)** tại `/tinh-khau-phan`.
  Mỗi bộ có các **bữa** (Sáng/Trưa/Chiều) + dữ liệu **món → thực phẩm → gram/người →
  %thải bỏ** (đúng cấu trúc `Row[]` hiện tại).
- UI có ô chọn **"Chế độ ăn"** (`KitchenDietType`: Cơm thường, Cháo, ĐTĐ…). **Sao chép
  từ chế độ khác rồi chỉnh** để đỡ nhập.
- Bấm **"Duyệt và chuyển sang báo ăn"** → lưu **bản chụp đã duyệt** lên server, tách
  theo từng bữa để nối `KitchenMenu`.
- **Meal-ops chỉ ĐỌC thực đơn đã duyệt**, nhân định lượng × **tổng số suất điều dưỡng
  chốt theo từng chế độ**. KHÔNG cho nhập lại món/gram trong meal-ops.
- Chế độ chưa có thực đơn duyệt → **cảnh báo, không tính số mua đoán**.
- **Thực đơn dùng chung toàn viện**; số suất **cộng từ các khoa** theo cùng (ngày×bữa×chế độ).
- Ví dụ: `18/08/2026 → ĐTĐ → Sáng/Trưa/Chiều → duyệt → Σ suất ĐTĐ các khoa → bảng đi chợ`.

## 2. Quyết định kỹ thuật (đề xuất — chốt lại nếu cần)

### 2.1 Lưu snapshot ở đâu — đóng băng mức THỰC PHẨM vào JSON
- Bỏ hướng `dishId`/`servingWeightG` của `b7dabc1`. Thay bằng: khi duyệt, ghi vào
  `KitchenMenuItem` một cột **`snapshotJson`** đóng băng chi tiết mức-thực-phẩm cho
  (bữa × chế độ):
  ```jsonc
  // KitchenMenuItem.snapshotJson (đóng băng lúc DUYỆT, không đổi khi Food/menu nháp đổi)
  {
    "dishes": [
      { "dish": "Cá kho", "foods": [
          { "foodId": "...", "foodName": "Cá lóc", "gramsPerServing": 80, "wastePercent": 40 },
          ...
      ]},
      ...
    ]
  }
  ```
- Giữ `dishName` (chuỗi tóm tắt các món, VD "Cá kho · canh rau") để **trang bệnh nhân
  M1 hiển thị** không cần đọc JSON. Bỏ `dishId`/`servingWeightG` khỏi schema (rollback
  phần `b7dabc1` thêm).
- **Vì sao JSON đóng băng:** đúng nghĩa "bản chụp đã duyệt" — sửa `/tinh-khau-phan`
  hay dữ liệu `Food` sau này KHÔNG làm lệch bản đã chốt. (Cùng tinh thần `Row.nutrients`
  snapshot ở `/tinh-khau-phan`.)

### 2.2 Nơi lập thực đơn theo chế độ ăn — mở rộng `/tinh-khau-phan`
- Mở rộng chế độ **nhiều-ngày** (`MultiDayBoard`, `multi-day.ts`): thêm **ô "Chế độ ăn"**
  (chọn `KitchenDietType`) + **ngày** cho mỗi bộ thực đơn. Đơn vị làm việc = **(ngày ×
  chế độ)**, bên trong là các bữa (tái dùng `Row[]`).
- **"Sao chép từ chế độ khác"**: copy toàn bộ `Row[]` của (ngày, chế độ nguồn) sang
  chế độ đích rồi cho chỉnh.
- Nút **"Duyệt và chuyển sang báo ăn"** (chỉ hiện khi đã đăng nhập DIETITIAN): POST
  server tạo/ghi đè snapshot đã duyệt cho (ngày × chế độ). Dữ liệu nguồn vẫn giữ
  localStorage như hiện tại; chỉ **bản duyệt** mới lên server.

### 2.3 Ghi server khi duyệt — action mới
- Thêm action (VD `POST /api/kitchen-menu/approve` hoặc mở rộng `saveMenu`+`approveMenu`):
  payload = `{ mealDate, dietTypeId, meals: [{ mealTypeId, dishes:[{dish, foods:[{foodId,
  foodName, gramsPerServing, wastePercent}] }] }] }`.
  - `requireManager(user, ["ADMIN","DIETITIAN"])`.
  - Với mỗi bữa: upsert `KitchenMenu(mealDate, mealTypeId)` (tạo nếu chưa có) →
    upsert `KitchenMenuItem(menuId, dietTypeId)` với `snapshotJson` + `dishName` tóm
    tắt + **`approvedAt`/`approvedById`** (duyệt mức item — xem 2.4). Đặt
    `KitchenMenu.status = APPROVED` khi có ≥1 item duyệt (chỉ để hiển thị).
  - `audit` entityType `KITCHEN_MENU` (hoặc `KITCHEN_MENU_ITEM`).

### 2.4 Duyệt TỪNG CHẾ ĐỘ ở KitchenMenuItem (ĐÃ CHỐT 2026-08-16)
Mỗi `KitchenMenuItem` = một (bữa × chế độ ăn); các chế độ duyệt **độc lập**. Duyệt cả
`KitchenMenu` sẽ vô tình duyệt đồng loạt mọi chế độ cùng bữa → SAI mô hình. Chốt:
- Thêm **`approvedAt DateTime?`** + **`approvedById String?`** trên `KitchenMenuItem`.
- **MỌI đường ĐỌC lọc theo `item.approvedAt != null`** — bếp (`operationsContext`),
  bảng đi chợ, và **trang bệnh nhân M1** (hiện đang lọc theo `KitchenMenu.status` →
  ĐỔI sang lọc item-level, kẻo hiện nhầm/giấu nhầm).
- **`KitchenMenu.status`** chỉ giữ để tương thích/hiển thị (đặt `APPROVED` khi ≥1 item
  được duyệt); **KHÔNG dùng để gate đọc dữ liệu.**
- Duyệt lại một chế độ → **ghi đè `snapshotJson` + cập nhật `approvedAt/approvedById`
  của đúng item đó + audit chế độ đó**; KHÔNG ảnh hưởng chế độ khác cùng bữa.
- Chưa duyệt (`approvedAt == null`) → **không đưa vào tính mua, hiện cảnh báo**.
- **Nhất quán action cũ:** M1 có `approveMenu` (duyệt cả menu). Luồng mới là duyệt-item
  → thay/tách rõ, **không để 2 cơ chế duyệt song song** đá nhau.

### 2.5 Đi chợ trong meal-ops — chỉ đọc, cộng toàn viện
- Trong `operationsContext` (đã có sườn M2): với mỗi (mealDate, mealType, dietType) đã
  APPROVED, lấy `snapshotJson`; **tổng số suất** = Σ `MealOrderItem.quantity` của **mọi
  khoa** theo (mealDate, mealType, dietType). Đi chợ = Σ over food:
  `edible = gramsPerServing × tổng_suất`; `mua = edible ÷ (1 − %thải bỏ)`; thiếu
  %thải bỏ → "—"; thiếu snapshot/chế độ chưa duyệt → **cảnh báo, không đoán**.
- Tái dùng hàm gộp kiểu `buildKitchenShoppingList` nhưng đầu vào là **snapshot mức
  thực phẩm** (không phải Dish). Bỏ phần đọc `dish.ingredients` của `b7dabc1`.
- **Bếp (`KITCHEN_STAFF`) chỉ thấy `APPROVED`** (đã đúng ở M2, giữ nguyên).

## 3. Ràng buộc bắt buộc
- Meal-ops **không có ô nhập món/gram** cho khoa DD. Chỉ đọc.
- Điều dưỡng vẫn là người chốt số suất duy nhất; bệnh nhân chỉ xem + ghi chú (qua duyệt).
- **Thiết bị:** bệnh nhân = điện thoại; **khoa DD/điều dưỡng/bếp = máy tính (desktop)**
  → màn nhân viên tối ưu desktop; **nghiệm thu chụp desktop ~1280px** cho màn nhân viên,
  chỉ trang bệnh nhân chụp mobile.
- Trung thực số liệu: thiếu → "—"/cảnh báo, không bịa.
- **Quy trình `AGENTS.md`:** nhánh mới `codex/...` → PR → **Claude duyệt** → mới merge.
  Không commit thẳng main, **không migrate DB dùng chung, không deploy.** Nghiệm thu trên
  **DB thử cô lập** (như M1/M2 trước).

## 4. Việc & thứ tự
1. Rollback phần schema `b7dabc1` không cần (`dishId`/`servingWeightG`); thêm
   `KitchenMenuItem.snapshotJson` + (nếu chọn 2.4) cờ duyệt mức item. Migration mới.
2. `/tinh-khau-phan`: thêm chiều **chế độ ăn** + ngày + copy-from-diet + nút "Duyệt và
   chuyển" (ghi server). **(Phần nặng nhất.)**
3. API duyệt (2.3) + audit.
4. Meal-ops: đi chợ đọc snapshot × Σ suất toàn viện + cảnh báo (2.5). Bỏ menu-editor.
5. Trang bệnh nhân: hiển thị `dishName` tóm tắt từ snapshot (giữ tương thích M1).
6. Test logic (gộp đi chợ từ snapshot) + nghiệm thu DB thử + ảnh **desktop** (nhân viên)
   / **mobile** (bệnh nhân).

## 5. Ngoài phạm vi (ghi để nhớ)
- Snapshot đã có sẵn kcal/macro/vi chất từng chế độ (do `/tinh-khau-phan` tính) → sau
  này hiện dinh dưỡng từng chế độ cho bếp/khoa mà không tính lại. Chưa làm bây giờ.
</content>
