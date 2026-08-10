# Báo cáo khả thi: Báo suất ăn và quản lý bếp qua Zalo

Ngày nghiên cứu: 10/08/2026  
Phạm vi: nghiên cứu, chưa triển khai, chưa migration, chưa cài package, chưa deploy.

## 1. Executive summary

**VERDICT: GO WITH LIMITATIONS.**

Có thể xây module báo suất ăn theo khoa/phòng qua Zalo, nhưng không nên xây nghiệp vụ cốt lõi thành chatbot nhiều bước. Kiến trúc phù hợp nhất là **Hybrid**:

```text
Zalo OA → nút/link Báo suất ăn → web form mobile của Dinh dưỡng 2598
        → API/DB của Dinh dưỡng 2598 → xác nhận về Zalo
        → dashboard bếp (web, độc lập với Zalo)
```

Lý do chính:

- Repository hiện tại đã là web responsive, có API server, PostgreSQL, authentication, audit và Excel; có thể mở rộng trong cùng ứng dụng.
- Zalo OA OpenAPI chính thức hỗ trợ nhắn tin, quản lý người dùng và webhook thời gian thực, nhưng là tính năng trả phí và phụ thuộc quyền/policy.
- Form web phù hợp hơn chat khi nhập 5–10 chế độ ăn, hỗ trợ xem lại, sửa số lượng, kiểm tra cutoff và hoạt động dự phòng khi Zalo lỗi.
- Không được phụ thuộc Zalo để vận hành bếp: Zalo chỉ là cửa vào, định danh bổ trợ và kênh xác nhận/nhắc; DB và dashboard web là nguồn sự thật.

Điều kiện để đi tiếp:

1. Bệnh viện có OA phù hợp, xác thực được và chấp nhận mua tối thiểu gói có OpenAPI.
2. Zalo phê duyệt/quyền thực tế cho App + OA phải được chứng minh bằng POC.
3. Quyết định chủ thể OA, người quản trị token, giờ chốt và quy trình sửa sau cutoff.
4. MVP chỉ truyền dữ liệu tổng hợp theo khoa, không truyền tên bệnh nhân/chẩn đoán/bệnh án.

## 2. Current architecture

### 2.1 Công nghệ và triển khai

| Thành phần | Kết luận có bằng chứng |
|---|---|
| Frontend | Next.js 16.2.10 App Router + React 19 + TypeScript + Tailwind CSS 4; xem `package.json`, `src/app/layout.tsx`, `src/app/globals.css`. |
| Backend | API Route Handlers chạy cùng Next.js/Node; xem cây `src/app/api/**/route.ts`. Không có FastAPI hay backend riêng. |
| Database | PostgreSQL; xem `prisma/schema.prisma` và `prisma.config.ts`. |
| ORM | Prisma 7.8 + PostgreSQL adapter; xem `package.json`, `src/lib/prisma.ts`. |
| Authentication | Email/password hash scrypt, session token ngẫu nhiên chỉ lưu hash, cookie HttpOnly/SameSite=Lax/Secure production; xem `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, models `User`, `Session` trong `prisma/schema.prisma`. |
| Authorization | Role hiện là chuỗi; data editor nhận `ADMIN`/`EDITOR`; xem `src/lib/admin-permissions.ts`. Chưa có quyền theo khoa. |
| Docker | Multi-stage Node 24 Alpine, standalone Next server, non-root user; migration là profile maintenance riêng và không tự chạy; xem `Dockerfile`, `compose.yaml`. |
| Reverse proxy | Caddy 2.10 tự cấp HTTPS, reverse proxy tới app:3000, thêm security headers; xem `Caddyfile`, `compose.yaml`. Không dùng Nginx. |
| Secrets | `.env.production` trên server, các file example chỉ chứa placeholder; xem `.env.example`, `.env.production.example`, `.gitignore`, `compose.yaml`. |

### 2.2 Module hiện có liên quan

| Nhu cầu | Hiện trạng |
|---|---|
| Người dùng | Có `User`, `Session`, trang `/quan-tri/nguoi-dung`, API `/api/admin/users`; role còn thô. |
| Bệnh nhân | Có `Patient`, gắn owner; chưa có khoa/phòng. |
| Khẩu phần/bữa ăn | Có `Ration`, `RationItem.meal`, UI `/tinh-khau-phan`; đây là khẩu phần lâm sàng theo người dùng/bệnh nhân, không phải phiếu tổng suất bếp. |
| Thực đơn/món | Có `Dish`, `DishIngredient`, Food và giao diện nhiều ngày trong `src/app/tinh-khau-phan/`; có logic phân tích thực đơn nhưng chưa có lịch sản xuất bếp. |
| Chế độ ăn | Có bảng tham chiếu `DietCode` (`diet_codes`); cần quyết định có dùng trực tiếp hay tạo `meal_order_diet_types`/mapping nghiệp vụ riêng. Không hard-code nhãn. |
| Khoa/phòng | Không có model/API/module department trong `prisma/schema.prisma` hoặc `src/app`; phải bổ sung mới. |
| Báo suất ăn | Chưa có. Không nên tái sử dụng `Ration`, vì khác vòng đời, khóa giờ, tổng hợp và audit. |
| Audit | Có `DataChangeLog` và API history cho biên tập dữ liệu nguồn; xem model trong schema và `src/app/api/admin/data/history/route.ts`. Báo ăn cần audit riêng hoặc audit dùng chung có actor/source rõ ràng. |
| Excel | Có `exceljs`, builder tại `src/lib/menu-analysis-workbook.ts`, endpoint `src/app/api/admin/menu-analysis-export/route.ts`; có thể áp dụng mẫu streaming/export cho bếp. |
| PDF | Không có package PDF chuyên dụng hay module xuất PDF server rõ ràng. Có thể để phase sau hoặc dùng print stylesheet trước. |

### 2.3 Độ phù hợp kiến trúc

Phù hợp để thêm bounded module `meal-orders` và adapter `zalo`, trong cùng Next.js monolith. Không cần tạo FastAPI service riêng cho MVP: thêm service thứ hai làm tăng deploy, secrets, observability và transaction boundary mà không tạo lợi ích rõ ở lưu lượng bệnh viện.

Điểm cần nâng cấp:

- Role hiện tại chưa đủ cho `KITCHEN_MANAGER`, `DEPARTMENT_STAFF`, `DIETITIAN`, `ADMIN` và phạm vi theo khoa.
- Chưa có CSRF token rõ ràng cho các form nhạy cảm; cookie SameSite=Lax giúp giảm rủi ro nhưng form báo ăn cần thêm token/Origin check và one-time form token.
- Chưa có job queue/worker. MVP có thể dùng outbox + retry theo lịch/cron đơn giản, không gửi Zalo trong transaction request.
- Chưa có scheduler; khóa giờ phải được kiểm tra khi ghi, không chỉ dựa vào job chạy đúng giờ.

## 3. Zalo official API findings

### 3.1 OA và gói dịch vụ

- Zalo mô tả OA OpenAPI là tích hợp OA doanh nghiệp với CRM/POS/ERP/chatbot/hệ thống nội bộ và có webhook tương ứng ([Zalo OA – tính năng mở rộng](https://oa.zalo.me/home/resources/library/tinh-nang-mo-rong-nang-cap-zalo-oa_2410156908111809541)).
- OpenAPI là tính năng trả phí. Bảng giá có hiệu lực từ 01/06/2026 chỉ ghi **Tăng trưởng** và **Toàn diện** có “Tích hợp Zalo Open API” ([bảng giá OA hiện hành](https://zalo.solutions/oa/pricing)).
- Giá niêm yết tại ngày nghiên cứu: Tăng trưởng 1,4 triệu/6 tháng hoặc 2,5 triệu/năm; Toàn diện 3,4 triệu/6 tháng hoặc 6 triệu/năm. Tăng trưởng 100 request/phút; Toàn diện 2.000 request/phút. Giá/policy phải kiểm tra lại tại thời điểm mua.
- Bảng giá dành cho **OA đã xác thực**. OA bệnh viện cần xác định đăng ký theo OA doanh nghiệp/tổ chức hay kênh dành cho cơ quan hành chính công; tài liệu công khai chưa đủ để kết luận bệnh viện cụ thể thuộc luồng nào. Đây là câu hỏi phải xác nhận trực tiếp với Zalo OA.
- Tài khoản xác thực là tài khoản đã nộp giấy tờ chứng minh và được Zalo kiểm tra ([phân loại OA](https://oa.zalo.me/home/resources/news/cap-nhat-tinh-nang-cua-oa-doanh-nghiep-ap-dung-thang-082021_437087951893382340)).

### 3.2 App, OAuth và token

- Cần Zalo Developer App và quản trị viên OA ủy quyền App cho OA. SDK PHP chính thức minh họa callback OAuth, `state`, PKCE code verifier/challenge và OA grant ([zaloplatform/zalo-php-sdk](https://github.com/zaloplatform/zalo-php-sdk)).
- Tài liệu xác thực OA chính thức nêu Access Token có hiệu lực 25 giờ; Refresh Token 3 tháng, dùng một lần và bị thay bởi refresh token mới sau mỗi lần refresh ([Zalo – xác thực và ủy quyền ứng dụng](https://stc-developers.zdn.vn/docs/v2/official-account/bat-dau/xac-thuc-va-uy-quyen-cho-ung-dung-new)).
- Callback đề xuất: `GET /api/integrations/zalo/oauth/callback`; phải kiểm tra `state`, exchange code server-side, không ghi token vào URL/log.
- Webhook đề xuất: `POST /api/integrations/zalo/webhook`, HTTPS công khai qua Caddy.
- Secrets tối thiểu: App ID, App Secret, OA Secret Key, access token, refresh token, expiry, OA ID. App/OA secrets để trong server environment; token quay vòng nên lưu mã hóa trong DB hoặc secret store, không commit Git. Có thể tái dùng cách mã hóa bằng `APP_SECRET` từ `src/lib/gemini-settings.ts`, nhưng nên tách key version và purpose cho Zalo.
- Refresh phải single-flight/serialized vì refresh token dùng một lần. Hai process refresh đồng thời có thể làm mất token mới; cần transaction/advisory lock, cập nhật access + refresh atomically và cảnh báo khi refresh thất bại.

### 3.3 Webhook

Tài liệu chính thức có nhóm webhook và các event tin nhắn; event public được thấy gồm `user_send_text`, attachment, `oa_send_text`, nhận/đã xem. Payload cụ thể phải được chụp lại từ API Explorer/console khi POC vì một số trang tài liệu yêu cầu đăng nhập và có thể thay đổi.

Pipeline bắt buộc:

```text
raw request body
→ kiểm tra app_id/OA + X-ZEvent-Signature bằng OA Secret Key
→ kiểm tra timestamp trong cửa sổ chống replay
→ parse schema theo event_name
→ INSERT zalo_events với unique event key/hash
→ ACK nhanh 2xx
→ xử lý idempotent ngoài đường nhận webhook
→ xác định zalo_user mapping và workflow
→ ghi meal order trong transaction
→ ghi outbox xác nhận
→ gửi Zalo + retry có giới hạn
```

Không parse JSON rồi stringify lại trước khi verify; chữ ký phải dựa trên raw body đúng theo công thức/tài liệu tại thời điểm POC. Header hiện hành được nêu là `X-ZEvent-Signature`; POC phải lưu fixture đã ẩn danh để unit test. Không ghi secret/signature đầy đủ vào log.

Chống trùng và race:

- `zalo_events`: unique `(oa_id, event_name, message_id/event_id)`; nếu event không có ID ổn định, unique hash trên trường canonical + timestamp + sender.
- `meal_orders`: unique `(department_id, meal_date, meal_type_id)` cho bản hiện hành; update theo version optimistic hoặc row lock.
- Form submit cần `Idempotency-Key` một lần; retry cùng key trả lại cùng phiếu.
- Replay window chỉ là lớp phụ; idempotency DB là lớp quyết định.
- Hai submit song song: transaction + unique constraint + version check, không “last write wins” im lặng.

## 4. Capability matrix

| Capability | Supported? | API/cơ chế | Permission/điều kiện | Cost/limit | Notes |
|---|---:|---|---|---|---|
| Receive message | Có | OA webhook, event `user_send_text` và attachment | App liên kết OA, đăng ký webhook/event | OpenAPI paid plan | Payload phải xác nhận bằng POC. |
| Send text | Có | OA OpenAPI Tin Tư vấn; SDK chính thức có endpoint V3 | UID, quyền nhắn tin; tuân policy/cửa sổ | Từ 01/06/2026: 55đ/tin tư vấn ngoài 48h; gói có quota khác nhau | Xác nhận ngay sau tương tác phù hợp hơn nhắc chủ động. |
| Interactive message | Có điều kiện | Message template/button/action open URL; menu/chatbot theo gói | Định dạng/quyền từng loại tin | Theo gói/loại tin | Dùng nút mở form, không đặt toàn bộ form trong chat. |
| Webhook | Có | OA webhook realtime | App + OA OpenAPI | Theo API plan/rate limit | Verify signature và idempotency bắt buộc. |
| User profile | Có điều kiện | Quản lý thông tin người dùng | Người dùng đã tương tác/cấp quyền, trường dữ liệu theo policy | OpenAPI | Không dùng tên profile làm quyền khoa. |
| Button/link | Có | `open_url` trong message; menu/nút thao tác nhanh | Template/loại tin hợp lệ | Theo gói | Link phải có token ngắn hạn, không tin `department_id` từ URL. |
| OAuth | Có | OA authorization code + PKCE/state | Developer App, OA admin ủy quyền | OpenAPI plan | Callback HTTPS. |
| Refresh token | Có | Token endpoint | Refresh token xoay vòng | Access 25h; refresh 3 tháng | Single-flight + atomic rotation. |
| Read/delivery status | Có | Webhook nhận/đã xem và event OA send | Đăng ký event | OpenAPI | Không cần cho MVP ngoài diagnostics. |
| Interactive Widget | Có | Widget cấp tương tác trên web | OA ID, App ID, người dùng đồng ý | Theo điều kiện hiện hành | Có `user_external_id` để đối chiếu user nội bộ; không thay auth web. |

Nguồn chính: [OpenAPI overview](https://oa.zalo.me/home/function/extension), [bảng giá OA](https://zalo.solutions/oa/pricing), [phân loại tin nhắn](https://oa.zalo.me/home/resources/library/cham-soc-khach-hang-hieu-qua-voi-nhan-tin-va-goi-thoai_729563123387551711), [Interactive Widget](https://developers.zalo.me/docs/social/zalo-interactive-widget), [webhook overview](https://developers.zalo.me/docs/official-account/webhook/tong-quan), [message overview](https://developers.zalo.me/docs/official-account/tin-nhan/tong-quan).

## 5. Zalo requirements, costs and limitations

Tối thiểu dự kiến:

1. OA thuộc bệnh viện/tổ chức, xác thực thành công.
2. Gói **Tăng trưởng** trở lên để có OpenAPI; 100 req/phút đủ cho MVP một bệnh viện.
3. Developer App do tài khoản tổ chức kiểm soát, không thuộc cá nhân nhà thầu.
4. OA admin ủy quyền App, callback và webhook HTTPS.
5. Quyền nhắn tin, quản lý thông tin người dùng và webhook cần thiết; nguyên tắc least privilege.
6. Ngân sách tin nhắn ngoài gói/ZBS nếu nhắc chủ động ngoài cửa sổ tương tác.

Hạn chế lớn:

- Policy, giá, template và quyền có thể thay đổi độc lập với code.
- Tin nhắc “khoa chưa báo” không được mặc định là tin tư vấn hợp lệ. Phải xác nhận loại tin phù hợp, recipient đủ điều kiện, cửa sổ 48 giờ hoặc dùng ZBS template đã duyệt. Nếu chưa được xác nhận, chỉ hiển thị khoa chưa báo trên dashboard và dùng kênh nội bộ khác.
- Tin xác nhận ngay sau khi người dùng thao tác có cơ sở nghiệp vụ tốt hơn tin nhắc chủ động, nhưng vẫn phải qua POC/policy review.
- Access token 25 giờ và refresh token xoay vòng là điểm vận hành nhạy cảm.
- Không coi Zalo UID, display name hoặc `department_id` client gửi lên là bằng chứng phân quyền.

## 6. Proposed workflow

### 6.1 Onboarding/mapping

```text
Admin tạo lời mời một lần cho nhân viên + khoa được phép
→ nhân viên đăng nhập web hoặc mở link onboarding từ OA
→ hệ thống xác thực session/OTP nội bộ
→ user cấp tương tác Zalo/nhắn OA
→ webhook trả Zalo UID
→ server gắn UID với staff và department scope
→ admin/đầu mối xác nhận mapping
```

Không để người dùng tự gõ “Khoa Nội” mỗi lần. Một staff có thể có nhiều `department_memberships`; một mapping có trạng thái `PENDING`, `ACTIVE`, `SUSPENDED`, `REVOKED`. Khi đổi nhân sự, revoke membership/mapping nhưng giữ audit. Admin có quyền `submit_on_behalf` và phải ghi khoa được chọn + lý do.

### 6.2 Báo suất

1. Người dùng bấm “Báo suất ăn” trong OA hoặc mở bookmark web.
2. Server tạo link ký, TTL ngắn, audience=user, không chứa quyền tin cậy ở query.
3. Form tự hiện các khoa user được phép; một khoa thì khóa sẵn.
4. Chọn ngày, bữa; hệ thống hiển thị cutoff theo timezone `Asia/Ho_Chi_Minh`.
5. Nhập số lượng theo danh mục chế độ đang active.
6. Client validate để UX; server validate lại toàn bộ.
7. Xem lại tổng; submit kèm idempotency key.
8. Server transaction: authorization → cutoff → upsert/version → items → audit → outbox.
9. Web trả mã phiếu ngay. Worker/outbox gửi xác nhận Zalo; Zalo lỗi không rollback phiếu.

Ví dụ mã hiển thị: `MA-20260811-001`. ID nội bộ vẫn dùng cuid/UUID; sequence hiển thị phải tạo concurrency-safe.

## 7. Architecture options

Thang điểm 1 (kém) đến 5 (tốt). Với “complexity/dependency/effort”, điểm cao nghĩa là thuận lợi: ít phức tạp, ít phụ thuộc, ít công sức.

| Tiêu chí | A. Chat thuần | B. Zalo → web form | C. Hybrid |
|---|---:|---:|---:|
| UX nhập nhiều loại suất | 2 | 5 | 5 |
| Complexity | 2 | 4 | 3 |
| Reliability | 2 | 4 | 4 |
| Maintainability | 2 | 5 | 4 |
| Ít phụ thuộc Zalo API | 1 | 4 | 3 |
| Security/control | 3 | 4 | 4 |
| Development effort | 2 | 4 | 3 |
| Phù hợp bệnh viện | 2 | 4 | 5 |
| **Tổng / 40** | **16** | **34** | **31** |

### A. Chat thuần

Không khuyến nghị. State machine dài, khó sửa nhiều số, dễ timeout/duplicate, phụ thuộc button/template/policy và gây mệt khi danh mục chế độ tăng.

### B. Zalo → secure web form

Kỹ thuật đơn giản và bền nhất. Có thể hoạt động kể cả khi nhắn xác nhận lỗi. Điểm yếu là mapping Zalo và trải nghiệm quay lại Zalo ít liền mạch hơn.

### C. Hybrid — đề xuất

Chọn C vì nghiệp vụ cần Zalo làm kênh quen thuộc, định danh/cấp tương tác và xác nhận, nhưng dùng nền web hiện có cho dữ liệu cấu trúc. Về triển khai, core giống B; Zalo là adapter có thể tắt. Nếu POC Zalo không đạt, hệ thống vẫn hạ cấp về B mà không bỏ DB/dashboard.

## 8. Recommended architecture

Giữ Next.js monolith theo module:

```text
src/app/bao-suat-an/                         form mobile + fallback login
src/app/quan-tri/suat-an/                    dashboard bếp
src/app/api/meal-orders/**                   API nghiệp vụ
src/app/api/integrations/zalo/webhook/       ingress webhook
src/app/api/integrations/zalo/oauth/**       OA authorization
src/lib/meal-orders/**                       service, cutoff, authorization
src/lib/zalo/**                              client, signature, token manager
src/lib/outbox/**                            gửi/retry không chặn transaction
```

Boundary quan trọng: `meal-order service` không import UI/chat state; adapter Zalo gọi cùng service với web. Không tạo microservice/FastAPI, WebSocket hay AI trong MVP.

Near-real-time dashboard dùng polling 15–30 giây + nút refresh; lưu lượng nhỏ và đáng tin hơn WebSocket/SSE. Có thể thêm SSE sau nếu vận hành chứng minh cần.

## 9. Database schema proposal

Đây là đề xuất, chưa migration.

### Core

- `departments(id, code unique, name, status, sort_order, created_at, updated_at)`
- `department_memberships(id, user_id, department_id, role, can_submit, can_submit_on_behalf, status, valid_from, valid_to, created_at, updated_at)`; unique active membership theo user/department.
- `meal_types(id, code unique, name, service_time, cutoff_rule_id, status, sort_order)`
- `diet_types(id, code unique, name, diet_code_id nullable, status, sort_order)`; có thể mapping tới `DietCode`, không hard-code.
- `meal_cutoff_rules(id, meal_type_id, days_before, cutoff_local_time, timezone default Asia/Ho_Chi_Minh, effective_from, effective_to, allow_weekends, created_at)`
- `meal_orders(id, public_code unique, department_id, meal_date date, meal_type_id, status, version, submitted_by_user_id, source, zalo_user_id nullable, submitted_at, confirmed_at, locked_at, cancelled_at, created_at, updated_at)`
- Unique `(department_id, meal_date, meal_type_id)` cho order hiện hành; nếu cần nhiều revision, tách `meal_order_revisions`.
- `meal_order_items(id, meal_order_id, diet_type_id, quantity int, created_at, updated_at)`; unique `(meal_order_id, diet_type_id)`, check quantity >= 0.
- `meal_order_change_requests(id, meal_order_id, requested_by, reason, proposed_items_json, status, reviewed_by, reviewed_at, created_at)` cho sửa sau cutoff.
- `meal_order_audit_logs(id, meal_order_id, action, actor_type, actor_id, source, before_json, after_json, reason, request_id, created_at)`; append-only, không delete lịch sử.

### Zalo/integration

- `zalo_users(id, oa_id, zalo_user_id, user_id nullable, display_name nullable, status, verified_at, revoked_at, created_at, updated_at)`; unique `(oa_id, zalo_user_id)`.
- Phạm vi khoa lấy từ `department_memberships`, không nhân bản `department_id` duy nhất trong `zalo_users`; hỗ trợ một người nhiều khoa.
- `zalo_events(id, oa_id, event_key, event_name, sender_id, occurred_at, payload_redacted_json, processing_status, attempts, error_code, created_at, processed_at)`; unique `(oa_id, event_key)`.
- `zalo_sessions(id, zalo_user_id, workflow, state_json, expires_at, created_at, updated_at)` chỉ cần nếu có chat onboarding; không dùng làm nguồn sự thật order.
- `integration_credentials(id, provider, account_key, access_token_ciphertext, refresh_token_ciphertext, access_expires_at, refresh_expires_at, key_version, status, updated_at)`; khóa quyền đọc, không trả qua API admin.
- `outbox_messages(id, topic, aggregate_id, idempotency_key unique, payload_json, status, attempts, next_attempt_at, last_error_redacted, created_at, sent_at)`.

Status order: `DRAFT`, `SUBMITTED`, `CONFIRMED`, `MODIFIED`, `LOCKED`, `CANCELLED`. Chỉ service server được chuyển trạng thái theo state machine.

## 10. API proposal

### Web/core

- `GET /api/meal-orders/options?date=&mealType=`: khoa trong scope, loại bữa/chế độ, cutoff.
- `POST /api/meal-orders`: tạo/submit, yêu cầu idempotency key.
- `GET /api/meal-orders/:id`: chỉ cùng scope hoặc quyền bếp/admin.
- `PATCH /api/meal-orders/:id`: trước cutoff + version optimistic.
- `POST /api/meal-orders/:id/cancel`: không DELETE, yêu cầu lý do.
- `POST /api/meal-orders/:id/change-requests`: sau cutoff.
- `GET /api/admin/meal-orders/summary`: dashboard matrix.
- `POST /api/admin/meal-orders/:id/lock`: bếp/admin.
- `GET /api/admin/meal-orders/export.xlsx`: export.
- `GET /api/admin/meal-orders/:id/audit`: history.

### Zalo

- `GET /api/integrations/zalo/oauth/start` (admin only)
- `GET /api/integrations/zalo/oauth/callback`
- `POST /api/integrations/zalo/webhook` (signature auth, no session cookie)
- `POST /api/integrations/zalo/retry/:outboxId` (admin only, optional)
- `GET /api/integrations/zalo/health` (admin, không lộ token)

Form link không mang `department_id` đáng tin. Server resolve actor từ session hoặc signed one-time grant, sau đó intersect với membership DB.

## 11. Security model

| Threat | Control |
|---|---|
| Webhook giả | Verify raw-body signature constant-time; allow expected app/OA; HTTPS. |
| Replay/duplicate | Timestamp window + unique event key + idempotent handler. |
| Token lộ | Encrypt at rest, env/secret key ngoài Git, redact logs, least privilege, rotation/revoke runbook. |
| Refresh race | DB/advisory lock + atomic replacement cả access/refresh token. |
| Zalo UID giả | UID chỉ lấy từ webhook đã verify hoặc server-side interaction event; mapping phải verified. |
| Sửa department_id | Server derives allowed departments from membership; reject IDOR. |
| IDOR order | Query luôn scope theo actor/department; opaque ID không thay authorization. |
| CSRF | SameSite cookie + Origin check + CSRF/one-time token cho mutation; không dùng GET để đổi state. |
| XSS | React escaping, CSP nên bổ sung, sanitize nếu hỗ trợ rich text; không render payload Zalo raw. |
| SQL injection | Prisma parameterization; không raw SQL từ input. |
| Brute force | Rate limit login/onboarding, lockout/backoff, audit. |
| Concurrent submit | Unique constraint, transaction, version field, idempotency key. |
| Secret trong log | Error code/redacted metadata; không body/token/signature đầy đủ. |

Dữ liệu Zalo chỉ gồm khoa, ngày, bữa, loại chế độ, số lượng, mã phiếu. Không gửi tên bệnh nhân, chẩn đoán, bệnh án hoặc dữ liệu sức khỏe cá nhân trong MVP. Cần đơn vị pháp chế/an toàn thông tin bệnh viện duyệt chính sách lưu giữ, quyền truy cập và kênh Zalo trước production.

## 12. Meal cutoff logic

- Cutoff lưu cấu hình theo loại bữa, có effective date và timezone IANA `Asia/Ho_Chi_Minh`.
- Server tính `cutoffAt` từ `meal_date`, rule và timezone; không dùng giờ máy client.
- Mọi create/update/cancel kiểm tra cutoff trong cùng transaction.
- Job khóa chỉ để cập nhật trạng thái/UX; kể cả job trễ, service vẫn từ chối sửa sau cutoff.
- Trước cutoff: update order, increment version, audit, gửi xác nhận “đã cập nhật”.
- Sau cutoff: không sửa trực tiếp; tạo change request, bếp/dinh dưỡng duyệt và audit.
- Admin override phải có permission riêng + lý do bắt buộc; không âm thầm sửa.
- Ngày lễ/cuối tuần cần calendar/rule sau MVP nếu khác lịch thường.

## 13. Dashboard design

Trang `/quan-tri/suat-an`:

- Filter ngày, bữa, khoa, trạng thái.
- Ma trận khoa × chế độ, tổng hàng/cột và tổng chung.
- Danh sách “chưa báo”, “đã báo”, “đã sửa”, “sau cutoff chờ duyệt”.
- Badge thời gian submit cuối, nguồn `WEB`/`ZALO`, người thực hiện.
- Drill-down order + revisions/audit.
- Lock bữa, sửa thay có lý do, change request.
- Export `.xlsx` theo mẫu bếp; bản in trước PDF chuyên dụng.
- Polling 15–30 giây, hiển thị “cập nhật lúc…”, manual refresh và ETag/`updatedSince` nếu cần.

## 14. Failure/fallback strategy

Zalo không được là single point of failure.

| Sự cố | Hành vi |
|---|---|
| Zalo/API lỗi khi submit | Order vẫn commit; UI web hiện mã phiếu; outbox retry xác nhận. |
| Webhook Zalo lỗi | Nhân viên đăng nhập trực tiếp `/bao-suat-an`; dashboard vẫn dùng DB. |
| Token hết hạn/refresh lỗi | Circuit-break gửi Zalo, cảnh báo admin, không chặn báo suất; reauthorize OA theo runbook. |
| Database lỗi | Không báo “đã nhận”; trả lỗi rõ, không gửi xác nhận Zalo; người dùng thử lại với cùng idempotency key. |
| Mạng khoa yếu | Form giữ draft cục bộ không chứa dữ liệu bệnh nhân; submit lại idempotent; có số điện thoại/quy trình dự phòng do bệnh viện quy định. |
| Toàn hệ thống web lỗi | Quy trình dự phòng ngoài hệ thống (điện thoại/biểu mẫu giấy/file chuẩn) phải được SOP bệnh viện phê duyệt và nhập bù có audit. |

## 15. MVP scope

MVP thực tế:

1. Department + membership/role.
2. Danh mục bữa, chế độ ăn, cutoff cấu hình.
3. Form mobile web tạo/xem/sửa trước cutoff.
4. Order/items + audit + idempotency.
5. Dashboard tổng hợp và khoa chưa báo.
6. Export Excel cơ bản.
7. POC và adapter OA: link form, mapping một Zalo user với staff, webhook verified, xác nhận submit.
8. Fallback đăng nhập web trực tiếp.

Không AI, không NLP, không bệnh nhân cá nhân, không dự báo, không nguyên liệu/chi phí, không WebSocket, không Mini App trong MVP.

## 16. Implementation phases

Chi tiết ở `docs/ZALO_MEAL_ORDER_PLAN.md`. Thứ tự bắt buộc: quyết định nghiệp vụ → POC Zalo OA thật → core data nhỏ → form/dashboard → pilot. Không migration lớn trước khi POC chứng minh quyền, webhook và gửi xác nhận.

## 17. Test plan

- Signature đúng/sai, raw body thay đổi, timestamp cũ, app/OA sai.
- OAuth state/PKCE, callback replay, token hết hạn, refresh rotation, hai refresh đồng thời.
- Duplicate event, retry, out-of-order event, poison payload.
- User chưa mapping/bị khóa/một người nhiều khoa/admin báo thay.
- IDOR, sửa `department_id`, CSRF, XSS, rate limit.
- Create/update/cancel trước cutoff; đúng thời điểm cutoff; sau cutoff; timezone/DST assumption; ngày qua tháng/năm.
- Duplicate/concurrent submit, optimistic conflict, sequence mã phiếu.
- Zalo API timeout/429/5xx, DB unavailable, outbox retry/dead letter.
- Dashboard totals, khoa chưa báo, zero quantities, loại chế độ inactive.
- Excel totals/encoding/date and permission.
- Audit completeness: actor, before/after, reason, source, request ID.
- End-to-end trên thiết bị Zalo Android/iOS và trình duyệt ngoài Zalo.

## 18. Risks

| Risk | Mức | Giảm thiểu |
|---|---|---|
| OA/policy không cho use case hoặc proactive message | Cao | POC + xác nhận Zalo bằng văn bản; core không phụ thuộc nhắn chủ động. |
| Token refresh rotation gây mất quyền | Cao | Single-flight, atomic storage, alert, runbook reauth. |
| Sai phân quyền khoa | Cao | Membership server-side, admin verification, audit, test IDOR. |
| Sai số suất do concurrent edit/duplicate | Cao | Unique, transaction, version, idempotency. |
| Cutoff sai timezone/rule | Cao | Config effective-dated, server clock, boundary tests. |
| Gửi dữ liệu y tế không cần thiết | Cao | Data minimization; cấm patient-level trong MVP. |
| Zalo outage | Trung bình | Web direct + SOP dự phòng + outbox. |
| Over-engineering | Trung bình | Monolith, polling, no AI/queue infra mới nếu chưa cần. |

## 19. Open-source review

| Repository | Cập nhật/Ngôn ngữ/License | Hữu ích | Đánh giá tương thích |
|---|---|---|---|
| [zaloplatform/zalo-php-sdk](https://github.com/zaloplatform/zalo-php-sdk) | PHP; MIT; README v4.0.4, lịch sử 33 commit. Ngày commit cuối không hiển thị ổn định trong bản crawl nên phải kiểm tra GitHub trước khi dùng. | OAuth OA + PKCE, message builders, endpoint names, appsecret proof. | Là repo của Zalo Platform nhưng dự án này là TypeScript; chỉ dùng làm reference/fixture. Một số ví dụ cũ cùng endpoint mới, phải đối chiếu docs hiện hành. |
| [nh4ttruong/zalo-oa-api-wrapper](https://github.com/nh4ttruong/zalo-oa-api-wrapper) | Python, 5 commit; topic index ghi cập nhật 11/11/2024; không thấy LICENSE trong repo. | Ví dụ wrapper gọi user/message đơn giản. | Không dùng production/copy code: token thủ công, thiếu OAuth rotation/signature/idempotency và license không rõ. |

Không tìm thấy implementation FastAPI công khai đủ chất lượng, còn hoạt động, có license và bám docs 2026 để khuyến nghị. Vì repo hiện tại không dùng Python, reference FastAPI cũng không phải lý do tạo service mới. Source of truth vẫn là tài liệu/console Zalo chính thức và payload POC.

## 20. Go / No-Go recommendation

### VERDICT

**GO WITH LIMITATIONS**

### RECOMMENDED ARCHITECTURE

**Hybrid: Zalo OA → secure mobile web form → Next.js service/PostgreSQL → Zalo confirmation → web kitchen dashboard.**

### WHY

- Khả thi về API và phù hợp kiến trúc hiện có.
- Form web an toàn, dễ nhập/sửa và dễ bảo trì hơn chatbot thuần.
- Core vẫn hoạt động khi Zalo đổi policy hoặc gián đoạn.
- Chi phí OpenAPI và token/policy làm cho đây không thể là “GO vô điều kiện”.

### MVP

Mapping Zalo–staff–department; form báo suất theo ngày/bữa/chế độ; cutoff; submit/update; mã phiếu; audit; dashboard; Excel; xác nhận Zalo; fallback web.

### ZALO REQUIREMENTS

OA xác thực; gói Tăng trưởng trở lên; Developer App; OA authorization; OAuth/token rotation; webhook HTTPS/signature; quyền nhắn tin + webhook; ngân sách tin ngoài gói nếu dùng.

### MAJOR RISKS

Policy proactive messaging, OA qualification, token rotation, department authorization, duplicate/concurrent order, cutoff timezone, dữ liệu y tế, Zalo outage.

### QUESTIONS THAT REQUIRE HUMAN DECISION

1. OA sẽ đứng tên bệnh viện, khoa Dinh dưỡng hay cơ quan chủ quản? OA hiện đã xác thực chưa?
2. Bệnh viện chấp nhận chi phí gói Tăng trưởng tối thiểu và phí tin phát sinh không?
3. Danh sách khoa, người chịu trách nhiệm và người được báo thay?
4. Danh mục chế độ ăn chuẩn dùng `DietCode` hiện có hay danh mục vận hành bếp riêng có mapping?
5. Giờ cutoff từng bữa, quy tắc cuối tuần/ngày lễ và ai được override?
6. Sau cutoff: change request cần ai duyệt, có gọi điện song song không?
7. Kênh fallback chính thức khi web/Zalo lỗi và SLA xử lý?
8. Có được phép lưu display name/UID Zalo bao lâu, ai có quyền xem, quy trình thu hồi khi nhân viên nghỉ?
9. Zalo xác nhận loại tin nào phù hợp cho xác nhận phiếu và nhắc “khoa chưa báo”? Cần câu trả lời/POC trước automation.
10. Pilot ở bao nhiêu khoa và tiêu chí nghiệm thu (sai số, đúng giờ, tỷ lệ xác nhận)?

**Dừng tại đây để duyệt. Không bắt đầu implementation.**

