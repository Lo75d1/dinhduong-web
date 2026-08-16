# SPEC — Tinh chỉnh nghiệp vụ suất ăn + Ảnh đối chứng

> Người viết: Claude (điều phối). 2026-08-16. Giao Codex làm theo `AGENTS.md`
> (nhánh → PR → Claude duyệt; không merge/deploy; không migrate DB dùng chung).
> Gộp các quyết định chốt qua hội thoại. **Làm PHẦN A trước (nhỏ, deploy được),
> PHẦN B sau (cần hạ tầng lưu ảnh).**

## Bối cảnh vai trò (đã chốt)
- **Admin = trưởng khoa dinh dưỡng** = người quản lý: **phân công** điều dưỡng/bác sĩ
  vào khoa, **phân giờ chốt + lịch**.
- **Khoa/điều dưỡng**: nhập báo suất **tối giản**, theo **tổng** (không theo từng người).
- **Bác sĩ (chỉ định per-người)**: **chưa cần cho ca thường** → để **tùy chọn**.
- **Bếp**: nấu theo **mã chế độ ăn**; có **giờ chốt** (VD ăn 11:00 → chốt 09:00).

---

## PHẦN A — Tinh chỉnh nghiệp vụ (làm trước, deploy được)

### A1. Điều dưỡng: BỎ chọn khoa + nhập tối giản
- `ReportPanel` (`OperationsApp.tsx`): **bỏ dropdown "Khoa/phòng"**. Khoa **tự động
  theo `DepartmentMembership`** của user (admin đã phân công). Nếu user thuộc **1 khoa**
  → dùng luôn, ẩn selector. Nếu **nhiều khoa** → mới hiện selector (mặc định khoa đầu).
- Giữ nhập tối giản: **chế độ ăn + số suất + ghi chú** (đã đúng). Không thêm gì.

### A2. Bác sĩ / chỉ định per-người: FEATURE FLAG (mặc định TẮT)
- Thêm cờ bật/tắt (env `ENABLE_DIET_ORDERS` hoặc `SiteSetting`). **Mặc định TẮT.**
- Khi TẮT: **ẩn màn bác sĩ** (`mode="doctor"` báo "tính năng chưa bật") **và ẩn cột
  "Gợi ý từ chỉ định"** ở `ReportPanel` (điều dưỡng chỉ nhập số suất + ghi chú, không
  cần đối chiếu gợi ý). Khi lệch cũng không bắt buộc ghi chú (vì không có gợi ý).
- **GIỮ NGUYÊN code M1** (DoctorPanel, `createDietOrder`, suggestion) — chỉ ẩn sau cờ.
  BV nào cần "báo ăn nhỏ" thì bật cờ.

### A3. Admin phân công + phân giờ (xác nhận, phần lớn đã có)
- Phân công điều dưỡng/bác sĩ vào khoa: `ConfigPanel` (kind `membership`) đã có — đảm
  bảo rõ ràng, dễ dùng.
- Phân giờ chốt mỗi bữa: `MealType.cutoffLocalTime` đã có (VD Trưa phục vụ 11:00, chốt
  09:00). Quá giờ chốt → khóa nhập (logic `cutoffAt` đã có). **Chỉ cần đảm bảo admin
  cấu hình được + UI hiện rõ "chốt HH:mm".**

> A1–A3 **không đổi model DB** (trừ cờ nếu dùng SiteSetting). Deploy được cùng M1+M2.

---

## PHẦN B — Ảnh đối chứng (tính năng mới, làm SAU deploy lõi)

### Mô hình
- **Bếp chụp/tải ảnh MẪU cho mỗi (ngày × bữa × chế độ ăn)** — suất chuẩn trông thế nào.
- **Bệnh nhân quét QR khoa** → thấy **đúng ảnh của chế độ mình** cạnh thực đơn, để **so
  sánh** với suất thực nhận.
- Trung thực: **không có ảnh → không hiện** (không bịa, không ảnh mặc định gây nhầm).

### Hạ tầng (điểm cần chốt trước khi code B)
- **Lưu ảnh: Supabase Storage** (đang dùng Supabase). Bucket riêng, ảnh đối chứng cho
  bệnh nhân xem = **public-read theo đường dẫn**, KHÔNG liệt kê toàn bucket.
- Upload: chỉ **KITCHEN_STAFF/KITCHEN_MANAGER/DIETITIAN** (auth). Giới hạn kích thước +
  loại ảnh; nén nếu cần.
- Model: bảng `MealPhoto` (`mealDate`, `mealTypeId`, `dietTypeId`, `storagePath`,
  `uploadedById`, `createdAt`) — hoặc gắn ảnh vào `KitchenMenuItem` đã duyệt. Chốt khi làm.

### UI
- **Bếp**: nút "Tải ảnh đối chứng" cho từng (bữa × chế độ) trong màn bếp/quản trị.
- **Bệnh nhân** (`thuc-don/[token]`): dưới mỗi món/chế độ, hiện ảnh đối chứng nếu có.
- Theo **design-language** đã dùng (thẻ viền mảnh, tông teal — xem `ReportPanel`/trang
  bệnh nhân làm mẫu).

---

## Ngoài phạm vi (đã bỏ)
- ~~Bot báo ăn qua Gmail~~ — bỏ (bệnh nhân quét QR đã thấy món + ảnh, email thừa).

## Ràng buộc chung
- Nhánh mới `codex/...` → PR → **Claude duyệt** → mới merge. Không commit thẳng main,
  **không migrate DB dùng chung, không deploy.**
- Nghiệm thu trên **DB thử cô lập**; test logic + tsc + eslint + build; ảnh **desktop
  ~1280px** cho màn nhân viên, **mobile** cho bệnh nhân. Nộp bằng chứng vào PR.
- Chỗ nào chưa rõ (model MealPhoto, cờ env vs SiteSetting) → **HỎI, đừng đoán.**
</content>
