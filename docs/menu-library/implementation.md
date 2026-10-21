# Kho mẫu thực đơn — bàn giao bản nền v1.0.0

Ngày: 21/10/2026. Repository: https://github.com/Lo75d1/dinhduong-web

Nhánh: `codex/menu-library-foundation`, xây từ `codex/unify-calculator-interface`
tại `436682b44d54924b29be52a2e57277cd71de1808`. Nhánh nền đang có các thay đổi
bộ tính mới hơn `main`; không thay thế bằng `main` cũ khi triển khai.

## Kết quả và đường dẫn

- `/quan-tri/kho-thuc-don`: mục lục, phân loại, nguồn, tỷ lệ bữa tham khảo,
  lịch sử và nút sao chép hai hướng dẫn AI.
- `/api/admin/menu-library`: danh mục JSON chỉ đọc có phiên bản, khả năng,
  nguồn và ví dụ cấu trúc nháp.
- `/api/admin/menu-library/guide`: TXT cho AI lập thực đơn.
- `/api/admin/menu-library/guide?mode=implementation`: TXT giao việc cho AI lập trình.
- Lối vào chỉ hiện sau khi Admin đăng nhập tại `/quan-tri`.

Mọi đường dẫn mới kiểm tra phiên hiện tại trên máy chủ. API trả 401/403/503,
không trả nguồn hay nội dung AI nếu không xác thực được Admin. Nội dung chỉ đọc,
private/no-store, noindex. Cookie đăng nhập website không được chia sẻ cho AI;
Admin sao chép nội dung khi AI không truy cập được đường dẫn bảo vệ.

## Phạm vi đã làm

Danh mục nguồn tĩnh quản lý bằng Git; có loại nguồn, phạm vi, phiên bản, vị trí
trích dẫn và trạng thái đối chiếu. Không phải trang CRUD nguồn hay kho mẫu đã lưu.
Mọi tỷ lệ bữa mới là tham khảo, chưa được bộ tính tự động sử dụng. RNI 2026 và tiêu
chí mầm non thí điểm chưa có bản gốc đầy đủ nên không cấp trị số cho quy tắc.

Không thêm migration, không đổi dữ liệu Food/Dish/RNI hoặc logic tính cá nhân.
Không sửa nội dung công khai `/ket-noi-ai/bat-dau/huong-dan.txt`.
Chưa có lưu mẫu, tính nhiều nhóm, xuất đi chợ tập thể hoặc kê đơn bệnh lý tự động.

## Tệp cần đọc và ràng buộc cho AI tiếp theo

Đọc `AGENTS.md`, tài liệu Next đúng phiên bản trong `node_modules/next/dist/docs/`,
`PROJECT_STATUS.md`, rồi:

- `src/lib/menu-library/contracts.ts`: kiểu dữ liệu nháp; **khác** MenuInput của
  Nutrition Chat. Chưa có validator runtime hoặc API ghi nhận kiểu này.
- `src/lib/menu-library/catalog.ts`: nguồn, tỷ lệ, phân loại và capabilities.
- `src/lib/menu-library/guide.ts`: nội dung dùng chung giữa trang, TXT và bản sao chép.
- `src/lib/menu-library/access.ts`: quyền phiên Admin; không dùng mật khẩu preview.
- `src/app/quan-tri/kho-thuc-don/`: giao diện nội bộ và nút sao chép.
- `src/app/api/admin/menu-library/`: API chỉ đọc, từng handler tự kiểm tra quyền.
- `scripts/test-menu-library.tsx`: hồi quy nguồn, cấu trúc và các tầng quyền bằng fixture.

Giữ kho thực phẩm/công thức chung. Mẫu theo đối tượng; bản áp dụng cho đơn vị
phải lưu templateId/version và không ghi ngược về mẫu. Nhóm tuổi không suy cứng
từ lớp. Lưu bữa độc lập với dòng nguyên liệu. Số suất theo ngày × bữa × nhóm,
null khác 0. Mã bữa ổn định, nhãn bữa sửa được. Tách sống sạch, mua vào, nấu chín,
dự phòng và làm tròn. Mốc nhu cầu ngày khác tỷ lệ bữa. Mốc có nguồn/version,
đơn vị, mẫu số và loại target/range/minimum/maximum; thiếu số không biến thành 0.

Khi triển khai persistence, bổ sung nguồn được duyệt, người duyệt, thời điểm và
lịch sử thay đổi; tránh gắn nhãn “được phê duyệt” cho dữ liệu mới đối chiếu.

## Thứ tự làm tiếp

1. Chốt migration và validator: đơn vị, nhóm, mẫu, bản áp dụng, nguồn có phiên bản.
2. Lưu nháp và biên tập Admin; xác nhận đầu vào, phạm vi bữa, số suất từng nhóm.
3. Tính dinh dưỡng riêng từng nhóm và đối chiếu nguồn được chọn.
4. Phiếu chia suất và tổng nguyên liệu đi chợ. Không nhân đồng loạt nguyên liệu.
5. Biên soạn mẫu thật, duyệt chuyên môn, xuất báo cáo và mở phạm vi sử dụng.

Mỗi API/Server Action phải kiểm tra quyền riêng. Chỉ đổi capability từ false sang
true khi tính năng đã nối dữ liệu, kiểm thử và nghiệm thu. Giữ quy trình hiện có:
tra dữ liệu → chuẩn bị toàn bộ nguyên liệu → người dùng duyệt → tính → link thật;
chỉ lưu khi được yêu cầu. Tập thể chưa có bộ tính nên không dùng kết quả cá nhân
để tuyên bố đã giải quyết suất ăn nhiều nhóm.

## Kiểm tra và triển khai

```bash
npm ci
npx prisma generate
npm run test:menu-library
npx tsc --noEmit
npm run build
```

Kiểm tra trình duyệt desktop/mobile: mục lục, trích dẫn, sao chép đầy đủ, TXT/JSON;
khách chưa đăng nhập, tài khoản thường/EDITOR/CLINICIAN và Admin. Nếu dùng fixture,
ghi rõ fixture; không gọi đó là nghiệm thu phiên đăng nhập trên VPS.

Bản nền không cần migration. Trên VPS được phép truy cập, ghi lại commit/image
đang chạy, kiểm tra working tree, fetch và chọn commit đã được xem xét của nhánh
bản nền; đọc diff so với phiên bản đang chạy. Không force/reset bỏ sửa đổi hiện có.
Sau đó, theo cấu hình Docker hiện tại trong `DEPLOY_VPS.md`:

```bash
docker compose build app
docker compose up -d app
docker compose ps
docker compose logs --tail=100 app
```

Không seed/reset database hoặc chạy migrate chỉ vì bản nền này. Nếu có thay đổi
khác trên nhánh cần migration thì xem riêng và sao lưu trước. Kiểm tra `/api/health`,
đăng nhập Admin, mở các đường dẫn ở trên; xác nhận khách không đọc được nội dung.
Rollback bằng commit/image đã ghi và cấu hình triển khai hiện có nếu nghiệm thu lỗi.
Không ghi “đã lên website” khi chưa kiểm tra website thật.

Các ca cho giai đoạn tính tập thể: 120 × 60 g + 100 × 70 g + 80 × 80 g = 20,6 kg;
1 kg sống sạch / 0,8 = 1,25 kg mua; bữa xế có số suất khác trưa; nguyên liệu ml
không tự đổi thành g; thiếu hệ số quy đổi phải báo chưa đủ dữ liệu.

## Bằng chứng kiểm tra bản nền

- `test:menu-library`: 152 kiểm tra nguồn/version, cấu trúc nháp, tham chiếu,
  quyền khách/USER/EDITOR/CLINICIAN/ADMIN và lỗi phiên bằng session fixture độc lập.
- TypeScript, ESLint các tệp mới, `git diff --check` và production build đạt.
- Hồi quy hướng dẫn AI125 và giao diện bộ tính dùng chung31 đạt.
- Chromium thật, component thực với fixture nội dung:17 kiểm tra ở1440×1000 và
  390×844, không tràn ngang toàn trang, mục lục, trích dẫn, sao chép cả hai bản,
  mở TXT và fallback chọn nội dung khi clipboard bị từ chối. Không lỗi JavaScript.
- Next production chạy cục bộ, không cookie: cả3 API trả401, trang trả307 về đăng
  nhập, tất cả no-store/noindex, không lộ nguồn hoặc hướng dẫn.

Chưa nghiệm thu phiên Admin với database thật hoặc triển khai VPS. Không phát
sinh thao tác ghi vào database sản xuất trong các kiểm tra trên.
