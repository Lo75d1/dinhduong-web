# Cập nhật kho thực đơn — 23/10/2026

Bản hiện tại thêm ba kho Cá thể/Tập thể/Bệnh viện, nhóm tuổi là bộ lọc, các bước chế biến và hướng dẫn bắt buộc khi duyệt mới, ngừng dùng có lý do, và đối chiếu bảng KhuyenNghi sẵn có theo hồ sơ nhóm. Hợp đồng nháp 1.2.0 tương thích 1.0/1.1; lưu các trường bổ sung trong JSON hiện có, không cần migration mới. Xem `docs/design/menu-library-daily-selection.md` và schema do get_admin_menu_workflow công bố. Chưa deploy, không tự sửa hay xóa dữ liệu thật. Phần dưới là tài liệu nền ngày 21/10, được giữ để truy nguyên.

# Kho mẫu thực đơn và ủy quyền AI — v1.1.0

Ngày: 21/10/2026. Repository: https://github.com/Lo75d1/dinhduong-web
Nhánh: `codex/admin-menu-api`, tiếp nối `codex/menu-library-foundation` tại `d63cf7b`.

## Hành vi đã có

Admin mở `/quan-tri` và chọn một trong ba nhóm:

| Nhóm | Nội dung |
| --- | --- |
| Dữ liệu & thực đơn | Biên tập thực phẩm/món ăn, kho mẫu, xuất dữ liệu |
| Người dùng & AI | Phân quyền người dùng, ủy quyền AI kho mẫu, cấu hình Gemini |
| Website & vận hành | Thông tin website, tin nhắn, thống kê và nhật ký lỗi |

Tổng quan hiển thị ba nhóm dưới dạng hàng thao tác ngắn, mở trực tiếp công việc;
thanh nhóm cho phép tập trung vào từng phần. Vùng Admin rộng tối đa1600px. Mỗi
trang có một thanh trắng “Trợ giúp & hướng dẫn” thu gọn mặc định.

Kho mẫu có danh sách hàng, tìm tên và lọc cá nhân/tập thể ở máy chủ trước phân
trang; mỗi mẫu có nút xem/chép liên kết. Chi tiết chọn ngày, bữa và nhóm, giữ nguyên
null/0, nguồn món và định lượng sống sạch. Lưu ý/lịch sử mở khi cần.
Hướng dẫn riêng `/quan-tri/kho-thuc-don/huong-dan` gom trong một khung trắng với
bốn tab, mục nội dung thu gọn và bộ lọc tỷ lệ theo đối tượng; trích dẫn mở đúng
nguồn, bản sao chép/TXT vẫn đầy đủ. Cấp/thu hồi AI đặt ngay dưới thanh trợ giúp.

Admin kết nối ChatGPT/Claude qua OAuth hiện có, mở `/quan-tri/ket-noi-ai`, chọn đúng
phiên của chính tài khoản, quyền đọc hoặc đọc/lưu/sửa nháp, hạn1/8/24 giờ hoặc7 ngày.
Sau đó tải lại danh sách công cụ trong ứng dụng AI. Không cần sao chép token hay
nhập thực đơn bằng JSON vào giao diện web.

AI đã được ủy quyền có thể tạo và sửa mẫu thật trong PostgreSQL, nhận URL thật để
Admin mở xem. Mẫu chỉ có trạng thái `draft`; lưu nháp không đồng nghĩa duyệt chuyên
môn hoặc đã tính dinh dưỡng. Website có phân tích một suất cho từng nhóm và duyệt theo phiên bản; chưa có phiếu chia suất, xuất đi chợ,
phát hành mẫu hoặc xóa mẫu qua API. Không thay Food/Dish/RNI hay luồng Ration cá nhân.

## Quyền và lưu trữ

- Ba bảng mới: `menu_library_templates`, `menu_library_versions`,
  `menu_library_grants`; RLS bật, thu hồi quyền PUBLIC/anon/authenticated.
- Đây là kho dùng chung cho Admin. Một Admin có thể sửa mẫu của Admin khác, nhưng
  phải đọc đúng revision; mọi phiên bản ghi người thao tác, client và lý do.
- Ủy quyền chỉ dành cho cặp user/client/token-family cụ thể, không cấp toàn bộ
  website hoặc quyền truy vấn SQL. OAuth refresh giữ family nên vẫn dùng được;
  phiên khác của cùng client không tự có quyền.
- Mọi thao tác kiểm tra vai trò ADMIN hiện tại, tài khoản hoạt động, phiên OAuth,
  grant và thời hạn. Thu hồi grant, thu hồi OAuth, hết hạn, khóa tài khoản hoặc bỏ
  vai trò Admin đều chặn truy cập. Guest và API token cá nhân không nhận quyền này.
- Cấp/thu hồi grant chỉ qua phiên Admin trên website, Origin chính xác và
  `x-menu-library-csrf`; Bearer không tự cấp/gia hạn/thu hồi quyền. Có nhật ký grant.
- Ghi từ trình duyệt vào mẫu cũng cần Origin và CSRF. Bearer hợp lệ có grant được
  phép dùng API từ máy chủ. Header Bearer sai không được hạ xuống phiên cookie.
- Ghi có giới hạn tốc độ, JSON tối đa512KiB, transaction và khóa tương ứng với
  quản lý tài khoản/OAuth hiện có. Sửa dùng optimistic revision và lịch sử chỉ thêm
  qua API. Tạo dùng requestKey chống lặp; thử lại tạo sau khi mẫu đã được sửa không
  ghi đè bản mới.

## API và công cụ AI

| Đường dẫn | Chức năng / quyền |
| --- | --- |
| `GET /api/admin/menu-library` | Danh mục nguồn/quy tắc tham khảo; phiên Admin |
| `GET /api/admin/menu-library/guide` | TXT đầy đủ; phiên Admin |
| `GET /api/admin/menu-library/templates?q=&offset=0&direction=collective` | Danh sách; Admin hoặc OAuth được ủy quyền đọc |
| `POST /api/admin/menu-library/templates` | Tạo nháp; Admin hoặc OAuth có quyền ghi |
| `GET /api/admin/menu-library/templates/{id}` | Đọc nháp, lịch sử, tên thực phẩm hiện tại |
| `PUT /api/admin/menu-library/templates/{id}` | Sửa với expectedRevision |
| `GET/POST/DELETE /api/admin/menu-library/delegations` | Liệt kê/cấp/thu hồi; chỉ phiên Admin website |
| `POST /api/admin/menu-library/tools` | REST `{name,arguments}`; Bearer được ủy quyền |

MCP hiện có `/api/nutrition/v1/mcp` công bố sẵn bốn công cụ; kiểm tra ủy quyền ở mỗi lần gọi: `get_admin_menu_workflow`, `list_admin_menu_templates`,
`get_admin_menu_template`, `save_admin_menu_template`. Grant chỉ đọc không được gọi công cụ lưu. Danh mục 20 công cụ giữ nguyên trước/sau cấp quyền; hướng dẫn và ZIP công khai
không chứa dữ liệu kho Admin. Bộ scope OAuth hiện có giữ nguyên; grant kho mẫu là
một bước đồng ý riêng, không tự phát sinh khi đăng nhập.

Tạo: `{content,requestKey,reason}` với `content.version=1`. Sửa thêm
`expectedRevision`, giữ ID và dùng `content.version=expectedRevision+1`. Với công
cụ lưu, thêm `templateId` khi sửa; REST PUT lấy ID từ URL. Chỉ báo đã lưu sau phản
hồi thành công có id/revision/url;409 phải đọc lại mẫu trước khi sửa tiếp.

## Dữ liệu và ràng buộc

Đọc `AGENTS.md`, tài liệu Next trong `node_modules/next/dist/docs/`,
`PROJECT_STATUS.md`, rồi các tệp:

- `src/lib/menu-library/contracts.ts`: hợp đồng tài liệu v1.0.0; khác MenuInput cá nhân.
- `validation.ts`: JSON schema và validator dùng chung. Chỉ nhận draft; chặn trường
  lạ, ID trùng, ngày không tồn tại, nhóm không tồn tại, quy tắc sai bữa/đối tượng,
  mục tiêu sai loại/đơn vị và nguồn chờ xác minh. Tối đa31 ngày/20 nhóm/1.200 dòng.
- `store.ts`: xác thực, ủy quyền, transaction, Food/Dish/DietCode thật, unit và lịch sử.
- `ai-tools.ts`: schema/dispatch/discovery của bốn công cụ Admin.
- `catalog.ts`, `guide.ts`: căn cứ, hướng dẫn và khả năng thực tế có phiên bản.
- `src/app/quan-tri/kho-thuc-don/`: danh sách/xem nháp và bài hướng dẫn riêng.
- `src/app/quan-tri/ket-noi-ai/`: chọn phiên, cấp và thu hồi grant.

Giữ các nhóm tuổi riêng, bữa tồn tại khi rỗng, số suất theo ngày × bữa × nhóm.
Chưa biết là null, xác nhận không phục vụ mới là0. ID/mã bữa độc lập nhãn bữa.
Định lượng một suất dùng g/ml sống sạch; tỷ lệ ăn được khác hiệu suất nấu. Không
nhập số dinh dưỡng tự đoán. Tỷ lệ bữa tham khảo vẫn chưa thành bộ tính tự động.
RNI2026 và tiêu chí mầm non thí điểm chờ nguồn gốc không được cấp trị số.

## Kiểm tra

```bash
npm ci
npx prisma generate
npx prisma validate
npm run test:menu-library
npm run test:menu-library-write
npm run test:nutrition-chat
npx tsc --noEmit
npm run build
```

Các kiểm tra backend dùng PGlite, migration thật và phiên giả lập; không thay cho
nghiệm thu PostgreSQL nhiều process hay hội thoại ChatGPT/Claude thật. Kiểm tra UI
bằng Chromium ở desktop/mobile với phản hồi API fixture; chưa phải phiên Admin VPS.

## Triển khai VPS hiện có

Bản1.1 **cần migration mới** `20261021090000_admin_menu_library`. Đây là migration
bổ sung ba bảng riêng; không seed/reset và không thay dữ liệu nguồn. Ghi lại commit,
image, cấu hình đang chạy và sao lưu database trước khi áp dụng. Giữ layout/Caddy/
Google verification và `.env.production` cục bộ; không force/reset/clean nếu Git báo
xung đột. Nhánh triển khai vẫn tiếp nối bộ tính đang dùng, không checkout main cũ.

Sau khi fetch và chọn đúng commit của nhánh, chạy tại `/opt/dinhduong`:

```bash
docker compose build app migrate
docker compose --profile maintenance run --rm migrate
docker compose up -d --wait --wait-timeout 180 app
docker compose ps
curl -fsS https://dinhduong2598.food/api/health
```

Nếu migration hoặc build lỗi, không thay app đang chạy. Nghiệm thu: Admin thấy ba
nhóm, cấp quyền cho một phiên AI, tải lại tools, tạo nháp, mở URL, sửa lênv2,
thu hồi grant rồi thử lại phải bị chặn. Khách/người dùng thường không đọc được kho.
Rollback bằng image/commit đã ghi; các bảng mới bổ sung có thể giữ nguyên, không
xóa bảng để rollback giao diện. Chưa ghi nhận triển khai hoặc nghiệm thu VPS bản1.1.

## Kết quả kiểm tra trước bàn giao

- 153 kiểm tra hướng dẫn/cấu trúc/trang/quyền; 94 kiểm tra lưu nháp và ủy quyền bằng
  migration thật trên PGlite, phiên giả lập, không chạm dữ liệu sản xuất.
- Toàn bộ 19 script Nutrition Chat đạt, gồm HTTP425, OAuth261, storage100,
  personal library60, workbook/import và các màn bộ tính hiện có.
- TypeScript, Prisma validate/generate, ESLint tệp sửa và production build đạt.
- Chromium thật với API fixture: 48 kiểm tra desktop1440/mobile390, ba nhóm Admin,
  form cũ, cấp/thu hồi grant, bản nháp/null/0 và clipboard; không lỗi JavaScript.
- Next production HTTP cục bộ: 30 kiểm tra quyền khách/cache/không lộ nội dung trên
  10 yêu cầu đọc/ghi/trang. Chưa nghiệm thu Admin với PostgreSQL/VPS hoặc nền tảng AI thật.


## Sửa tay, phân tích và duyệt (22/10/2026)

- Chạy migration `20261022120000_menu_library_reviews` trước khi khởi động bản mới.
  Bảng `menu_library_reviews` bật RLS, không cấp PUBLIC/anon/authenticated; mỗi
  quyết định tham chiếu cặp templateId/revision bất biến. Không sửa nguồn Food/Dish.
- Mở mẫu → **Chỉnh khẩu phần** → **Lưu thay đổi**; ghi chú điều chỉnh là tùy chọn. Có thêm/xóa món,
  tra/thêm/xóa thực phẩm thật, sửa lượng g/ml. Món sửa được ghi `manual` và bỏ
  recipeId để không giả là nguyên bản RNI. Khi chưa lưu có cảnh báo rời trang.
- `groups[].designEnergyKcal` tùy chọn là mục tiêu thiết kế do người dùng nhập;
  chưa biết để null/không khai báo. Không lấy số trong tiêu đề làm mục tiêu và
  không gán nguồn RNI cho mục tiêu tự chọn.
- `POST templates/{id}/analysis` nhận `{expectedRevision, content?}`; content là bản đang chỉnh, chưa lưu. Dùng engine hiện có,
  giữ null/0, kiểm tra mẫu số VDD nguyên món và g/ml, theo một suất mỗi nhóm/ngày;
  không nhân số suất hay lấy trung bình các nhóm. Hiển thị theo bữa và tổng bữa.
- `POST templates/{id}/review` nhận `{expectedRevision, decision, note,
  analysisDigest, acknowledged:true}`. Chỉ phiên Admin website + Origin + CSRF;
  OAuth/AI không được duyệt. `approved` cần đủ cấu trúc/cơ sở tính;
  `changes_requested` cần nhận xét. Chất thiếu vẫn hiển thị rõ, không được hiểu
  rằng duyệt mẫu đồng nghĩa đủ tất cả dinh dưỡng hoặc phù hợp mọi bệnh nhân.
- Máy chủ tính lại từ bản lưu và nguồn hiện tại trước khi ghi; từ chối 409 khi
  revision hoặc digest khác bản đã xem. Dùng cùng khóa mẫu với lưu sửa, kiểm tra
  tài khoản trong transaction. Retry cùng quyết định không tạo bản trùng.
- Duyệt lưu người duyệt từ phiên, thời gian, ghi chú và phân tích. GET mẫu trả
  lịch sử quyết định, `currentReview` cùng snapshot phân tích của phiên bản hiện tại.
  Sửa tạo revision mới tự hiển thị chưa duyệt; không xóa phê duyệt cũ.
- `GET foods?q=` dành cho Admin website để chọn thực phẩm. Mọi endpoint mới giữ
  private/no-store, không mở thêm scope hay công cụ MCP.

Kiểm tra cho thay đổi này: 283 kiểm tra PGlite/route/quyền/lưu/duyệt và lịch sử;
14 kiểm tra tính một suất từng nhóm, null/0, dữ liệu thiếu, g/ml, digest;
26 kiểm tra tương tác DOM sửa tay, giữ nội dung khi 409, phân tích và xác nhận duyệt;
165 kiểm tra danh mục/hướng dẫn/trang. Bộ `test:nutrition-chat`, TypeScript, ESLint,
Prisma validate và production build đạt. Đã thêm kiểm tra Chromium thật trên bản xem thử; chưa nghiệm thu trên VPS thật. Không tự duyệt bảy mẫu đang lưu của người dùng.


## Giao diện cho bác sĩ dinh dưỡng — 22/10/2026

- Bảng chính giữ bữa → món → thực phẩm → lượng, không ép bác sĩ đọc mã hoặc hợp đồng JSON.
  Tên thực phẩm rút phần dịch tiếng Anh khi hiển thị; tên đầy đủ và nguồn vẫn giữ ở chi tiết.
- Kcal, gram và tỷ lệ P–L–G ở ngay trên bảng món. Mở mẫu tự tính; sửa gram tự tính lại sau
  450ms ngừng nhập. Chuyển ngày/nhóm chỉ đổi phần đang xem, giữ lượng của các nhóm riêng.
- Bản đang sửa hiển thị rõ chưa lưu. Tính thử không thêm bản hoặc tự duyệt; digest của bản
  chưa lưu không dùng duyệt bản đã lưu. Cần Lưu thay đổi rồi xác nhận duyệt riêng.
- Yêu cầu cũ được hủy khi nhập tiếp; phản hồi chậm không được ghi đè số liệu mới. Ô lượng
  trống/không hợp lệ giữ trạng thái chưa biết, không tự thành 0. Không có nút tính ở luồng chính.
- Phân tích theo bữa, vi chất, thực phẩm thiếu số liệu, nguồn và lịch sử nằm dưới bảng món,
  mở khi cần. Không giấu cảnh báo thiếu P–L–G hoặc thiếu cơ sở tính trong phần thu gọn.
- Bố cục bảng ba cột trên máy tính; điện thoại đưa tên món lên dòng riêng, tên thực phẩm và
  số gram căn hai phía. Giữ Times/nền trắng ấm, các màu P–L–G chỉ hỗ trợ đọc số liệu.
- Endpoint tính thử vẫn chỉ Admin website, Origin/CSRF đúng; tính chỉ đọc dùng giới hạn đọc
  120/phút, không tiêu hạn ghi 30/phút của việc lưu/duyệt. Không mở thêm công cụ AI hay scope.

Bản xem thử: `npm run preview:menu-clinical`, tệp `docs/design/previews/clinical-menu.html`.
Dùng thực đơn minh họa riêng và số liệu thực phẩm công khai để kiểm tra hiển thị; mục tiêu
1500 trong fixture chỉ phục vụ kiểm thử UI, không phải nhu cầu của một người bệnh. Transport của bản xem thử chỉ ở trình duyệt,
không gọi API thật; mọi lưu/duyệt đều từ chối. Digest trong bản xem thử chỉ để mô phỏng UI,
không phải mã duyệt của máy chủ. Không gửi dữ liệu người bệnh hoặc thông tin đăng nhập.

Kiểm tra Chromium: `CLINICAL_CHROMIUM_PATH=/path/to/chromium npm run test:menu-clinical-browser`.
Nếu Playwright không ở runtime mặc định, đặt thêm CLINICAL_PLAYWRIGHT_PATH tới module của nó.
Đã kiểm tra 1440/1024/768/390/360/320px, không tràn ngang toàn trang, tính ngay khi mở,
đổi gram tính lại, ô trống không giữ kết quả cũ, phần chi tiết thu gọn và không lỗi JavaScript.
Ba ảnh nằm cùng thư mục previews; không coi fixture là nghiệm thu VPS thật.
