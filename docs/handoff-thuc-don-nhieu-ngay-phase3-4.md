# Bàn giao: Thực đơn nhiều ngày — Phase 3 & 4 (cho Codex)

> Người viết: Claude. Trạng thái: **Phase 1 + 2 đã xong, push `main`, CHƯA deploy VPS.**
> Đọc kèm `PROJECT_STATUS.md` (quy ước chung của repo web).

## 1. Bối cảnh & những gì đã có

Chế độ **"Thực đơn nhiều ngày"** ở trang `/tinh-khau-phan` (phục vụ bếp): ngoài chế
độ một ngày sẵn có, thêm 1 chế độ lập thực đơn nhiều ngày. Thiết kế đã chốt với người
dùng qua nhiều lần sửa mockup:

- Các **ngày xếp hàng dọc** (bao quát cả đợt), mỗi ngày là **hàng ngang các bữa**.
- Đơn vị làm việc là **TỪNG BỮA** (mỗi bữa một khối riêng). Bấm 1 bữa → riêng bữa đó
  sổ ra; **mở một MÓN ra ("cửa sổ TP") mới chọn THỰC PHẨM; ở mức bữa thì ô tìm chọn MÓN.**
- Số ngày **tùy ý** (không cố định 7). Tông **xanh dương** phân biệt chế độ một ngày (xanh rêu).

### Commit đã push
- `f4c262b` — Phase 1: data model + board + toggle chế độ + theming.
- `fad1d59` — Phase 2: thêm bữa/món/thực phẩm trực tiếp trên board + search theo ngữ cảnh.

### Files
| File | Vai trò |
|---|---|
| `src/app/tinh-khau-phan/multi-day.ts` | Data model `MenuDay`, storage, helper tính kcal + thêm bữa/món/TP |
| `src/app/tinh-khau-phan/MultiDayBoard.tsx` | UI board: `MultiDayBoard`, `DayCard`, `MealPanel`, `GramInput`, `EditableText` |
| `src/app/tinh-khau-phan/MenuFoodSearch.tsx` | Ô tìm theo ngữ cảnh (`kind: "food" \| "dish"`) |
| `src/app/tinh-khau-phan/Calculator.tsx` | Toggle `pageMode` "single"/"multi" (đầu trang) |
| `src/app/globals.css` | Keyframes `menu-day-enter`, `menu-drop` |

### Data model & storage
- `MenuDay = { id, label, date, rows: Row[] }`. `rows` **tái dùng nguyên `Row`** của chế
  độ một ngày — `row.meal` / `row.dish` là thuộc tính trên từng dòng. Một bữa/món "tồn
  tại" khi có ≥1 row (kể cả row giữ chỗ `foodId===""`).
- localStorage: `khauphan_menu_days_v1` (mảng `MenuDay`), `khauphan_pagemode_v1`.
- Màu: `INK = "#0C447C"`, `ACCENT = "#185FA5"`, nền nhạt `#E6F1FB`/`#F4F9FE`, viền `#B5D4F4`.

## 2. ⚠️ BẪY quan trọng trước khi làm Phase 3 (kéo-thả bữa)

`dayMeals()` trong `multi-day.ts` gọi `buildTree()` (`types.ts`), mà `buildTree`
**sắp bữa theo `mealOrder()` lâm sàng dựa trên TÊN bữa** (Sáng < phụ sáng < Trưa <
… < Tối). Hệ quả: nếu kéo "Tối" lên trước "Sáng", buildTree vẫn xếp lại theo tên →
**kéo-thả bữa KHÔNG dính** (giống bug của `moveMeal` trong `MealInput.tsx`: chỉ đổi
được thứ tự khi các bữa cùng `mealOrder`, vd "Bữa 1/2/3" đều = 100).

**Cách xử lý:** cho board dùng một hàm gom **GIỮ THỨ TỰ tường minh** (theo lần xuất
hiện đầu tiên của bữa trong `rows`, KHÔNG sort theo `mealOrder`). Đề xuất thêm vào
`multi-day.ts`:

```ts
// Gom bữa→món theo THỨ TỰ XUẤT HIỆN trong rows (không sort lâm sàng) — để kéo-thả dính.
export function dayMealsOrdered(day: MenuDay): MealNode[] {
  const order: string[] = [];
  const map = new Map<string, MealNode>();
  for (const r of day.rows) {
    if (!map.has(r.meal)) { map.set(r.meal, { meal: r.meal, dishes: [] }); order.push(r.meal); }
    const m = map.get(r.meal)!;
    let d = m.dishes.find((x) => x.dish === r.dish);
    if (!d) { d = { dish: r.dish, rows: [] }; m.dishes.push(d); }
    if (r.foodId) d.rows.push(r);
  }
  return order.map((name) => map.get(name)!);
}
```

Rồi trong `MultiDayBoard.tsx` đổi `dayMeals(day)` → `dayMealsOrdered(day)` **ở board**
(giữ `dayMeals`/`buildTree` cho chế độ một ngày). Reorder bữa = sắp lại các **nhóm
row theo bữa** trong `day.rows` (xem `moveMeal` trong `MealInput.tsx` làm mẫu: gom
rows theo bữa rồi ghép lại theo thứ tự mới).

Reorder **NGÀY** thì dễ: chỉ đổi thứ tự mảng `days` (đã có `moveDay` ▲▼ để tham chiếu).

## 3. Phase 3 — kéo-thả (@dnd-kit, chạy cả cảm ứng)

1. **Cài lib:** `npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers`.
   > `package.json` đang có 1 thay đổi CHƯA commit (script `test:menu-export` của bạn).
   > Sau khi `npm i`, nhớ **giữ nguyên** thay đổi đó, đừng để bị revert.
2. **Kéo NGÀY (dọc):** `DndContext` + `SortableContext` (`verticalListSortingStrategy`)
   quanh danh sách `DayCard`; `onDragEnd` → `arrayMove(days, from, to)` rồi `saveMenuDays`.
   Biến tay nắm **⋮⋮ (hiện là placeholder)** thành drag handle thật (`useSortable`
   `listeners`/`attributes` trên nút ⋮⋮). Giữ ▲▼ làm phương án phụ (accessibility).
3. **Kéo BỮA trong ngày (ngang):** `SortableContext` (`horizontalListSortingStrategy`)
   cho các meal-block; `onDragEnd` → sắp lại nhóm rows theo bữa. **Cần `dayMealsOrdered`
   (mục 2).** Tay nắm là chính khối bữa hoặc thêm icon ⠿.
4. **(Tùy chọn, rất hữu ích cho bếp) Kéo BỮA sang NGÀY khác:** multi-container dnd-kit;
   `onDragEnd` chuyển các row của bữa từ `dayA` sang `dayB` (giữ `meal`, cấp uid mới
   để an toàn). Nếu quá phức tạp thì thay bằng nút "Chuyển bữa sang ngày…".
5. **Cảm ứng:** `useSensors(PointerSensor, TouchSensor)` với `activationConstraint`
   (delay ~150ms + tolerance) để vẫn cuộn được trên điện thoại. **Test cả `mobile`
   preset** trong Browser pane.
6. Giữ tông xanh + animation. Dùng `DragOverlay` cho khối đang kéo cho mượt.

## 4. Phase 4 — phân tích nhiều ngày + xuất báo cáo

1. **Phân tích:** hiện mới có thanh kcal/ngày ở cuối `MultiDayBoard`. Bổ sung:
   - Mỗi **ngày × mỗi bữa** đạt/thiếu so nhu cầu — tái dùng logic đối chiếu của chế độ
     một ngày (`EnergyDistribution.tsx`, `RecommendationComparison.tsx`,
     `matchRecommendation.ts`). Cần hồ sơ (`khauphan_profile_v1`) để có nhu cầu.
   - **Đa dạng món:** đếm số nhóm thực phẩm distinct qua `row.classify.foodGroup`.
   - Trung bình cả đợt; đánh dấu ngày đạt/thiếu.
   - **TRUNG THỰC:** thiếu dữ liệu → "—", **KHÔNG bịa số**.
2. **Xuất Word/Excel cả đợt:** tái dùng cách xuất của chế độ một ngày (`ReportActions.tsx`
   + API xuất). Mỗi ngày một mục; kèm **bảng đi chợ gộp cả đợt** (cột sống sạch / mua /
   thải bỏ — giống bản offline). Có thể gộp `rows` tất cả ngày, giữ nhãn ngày, rồi nhóm.

## 5. Quy ước bắt buộc (giữ nguyên xuyên suốt)

- **Trung thực số liệu:** không bịa nutrient/DOI/số; thiếu → "—"/blank. Nguồn VDD/RNI.
- **localStorage-first, CHƯA đụng DB** (drift chặn migrate — xem PROJECT_STATUS.md mục
  "Server persistence"). Không migrate/reset DB. Server sync để sau.
- **Test UI thật trên trình duyệt.** DB dev auth FAIL (P1000) → API search KHÔNG chạy
  local; test bằng **override `window.fetch`**. Lưu ý `window.alert` **chặn renderer**
  khi test tự động — nhớ đóng dialog / đổi tab.

### Mẹo test khi DB dev down (override fetch)
```js
window.__origFetch = window.__origFetch || window.fetch;
window.fetch = function (url) {
  if (typeof url === "string" && url.includes("/api/foods/search"))
    return Promise.resolve(new Response(JSON.stringify({ items: [
      { id: "ftest", name: "Trứng gà (test)", source: "VDD",
        energyKcal: 166, proteinG: 14.8, lipidG: 11.6, glucidG: 0.5, wastePercent: 12 } ] }),
      { status: 200, headers: { "Content-Type": "application/json" } }));
  return window.__origFetch.apply(this, arguments);
};
```
Kịch bản thao tác controlled-input trong dnd/React: set value qua native setter →
dispatch `input` → **nhấn Enter (focusout)**, đừng dispatch `blur` trần (React onBlur
nghe `focusout`, không nghe `blur`).

## 6. Sau khi xong mỗi phase

- Typecheck: `npx tsc --noEmit`. **Bỏ qua** lỗi ở `.next/dev/types/routes.d.ts` (file
  Next tự sinh) và `scripts/test-menu-analysis-workbook.ts` (không thuộc phần này).
- Commit riêng từng phase (message tiếng Việt không dấu như repo). Push `main`.
- Deploy (khi người dùng đồng ý): `cd /opt/dinhduong && git pull && docker compose up -d --build`
  — **bỏ qua `prisma migrate`** (feature thuần client).
