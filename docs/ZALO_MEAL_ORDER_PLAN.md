# Implementation plan: Báo suất ăn qua Zalo

Trạng thái: **MVP WEB ĐÃ TRIỂN KHAI TRONG MÃ NGUỒN — CHƯA CHẠY MIGRATION/DEPLOY**  
Verdict đầu vào: GO WITH LIMITATIONS.  
Nguyên tắc: core báo suất độc lập Zalo; không AI; không dữ liệu bệnh nhân; migration chỉ chạy sau backup/review; mỗi phase có feature flag và rollback.

## Phase 0 — Human decisions và Zalo sandbox/POC

**Mục tiêu**

- Chốt OA owner, gói dịch vụ, khoa pilot, danh mục chế độ, cutoff và SOP fallback.
- Chứng minh trên OA/App thật: OAuth → token → webhook signed → nhận UID → ghi test event → gửi xác nhận/link.

**File dự kiến**

- POC cô lập dưới `scripts/zalo-poc/` hoặc branch riêng sau khi duyệt.
- Bổ sung placeholder (không giá trị thật) vào `.env.example`, `.env.production.example`.
- Chưa nối UI production.

**DB migration**

- Không migration nghiệp vụ. POC có thể dùng bảng test tạm có kế hoạch xóa hoặc log redacted trong môi trường staging; không dùng production data.

**API**

- Endpoint staging `/api/integrations/zalo/webhook` và OAuth callback tối thiểu.

**Dependency**

- OA xác thực + gói OpenAPI; Developer App; domain staging HTTPS; người quản trị OA.
- Ưu tiên `fetch`/`node:crypto`, chưa cài SDK nếu không cần.

**Test/exit criteria**

- Signature fixture pass/fail; OAuth state/PKCE; token refresh một lần; duplicate webhook không ghi đôi; OA gửi message/link thành công tới UID pilot.
- Ghi lại payload/event/schema/redacted, quyền và chi phí thực tế.

**Risk**

- OA không đủ điều kiện; quyền bị từ chối; payload khác docs; loại tin xác nhận/nhắc không phù hợp.

**Rollback**

- Revoke App khỏi OA, rotate secrets, xóa endpoint/staging test data. Nếu POC fail: chọn web-only Architecture B, không tạo schema Zalo production.

## Phase 1 — Core database và authorization

**Mục tiêu**

- Departments, memberships, meal types, diet types, cutoff, order/items, audit, idempotency/outbox.

**File dự kiến**

- `prisma/schema.prisma`
- migration mới trong `prisma/migrations/`
- `src/lib/meal-orders/types.ts`, `authorization.ts`, `cutoff.ts`, `service.ts`
- seed/reference script mới nếu được duyệt.

**DB migration**

- Additive only; unique/check/index/FK; không sửa/xóa Food/Dish/Ration hiện tại.
- Backup + `prisma migrate deploy` bằng profile maintenance, không reset DB.

**API**

- Chưa public; test service trực tiếp.

**Dependency**

- Quyết định human cho department, diet mapping, roles, cutoff.

**Test**

- Schema constraints, state transitions, membership scope, timezone boundaries, concurrency/idempotency.

**Risk**

- Nhầm dùng `DietCode` lâm sàng như danh mục vận hành; role hiện tại quá thô.

**Rollback**

- Feature flag off; rollback migration additive theo script đã review, không reset; tables mới chưa được core cũ tham chiếu.

## Phase 2 — Meal-order API

**Mục tiêu**

- API create/read/update/cancel/change request và summary, dùng chung cho web/Zalo.

**File dự kiến**

- `src/app/api/meal-orders/**/route.ts`
- `src/app/api/admin/meal-orders/**/route.ts`
- `src/lib/meal-orders/validation.ts`, `public-code.ts`

**DB migration**

- Không, trừ index phát hiện qua test và review riêng.

**API**

- `GET options`, `POST order`, `GET/PATCH order`, cancel, change request, admin summary/lock/audit.

**Dependency**

- Phase 1, auth/role design.

**Test**

- IDOR, CSRF/Origin, malformed quantities, inactive diet, cutoff, version conflict, duplicate submission, admin override reason.

**Risk**

- Last-write-wins, tin `department_id` từ client, mã phiếu collision.

**Rollback**

- Feature flag/API 404; dữ liệu đã tạo giữ audit, không xóa lịch sử.

## Phase 3 — Web form mobile và fallback

**Mục tiêu**

- Nhân viên báo suất nhanh trên điện thoại trong/ngoài Zalo; review trước submit; sửa trước cutoff.

**File dự kiến**

- `src/app/bao-suat-an/page.tsx`
- Client components trong `src/app/bao-suat-an/`
- CSS dùng hệ thống hiện có.

**DB migration**

- Không.

**API**

- Dùng Phase 2; signed one-time link/onboarding chỉ sau Phase 5.

**Dependency**

- User/membership pilot đã tạo; UX được khoa pilot duyệt.

**Test**

- Android/iOS, Zalo in-app browser, Chrome/Safari, mạng chậm, double tap, back/reload, accessibility, form totals.

**Risk**

- In-app browser cookie/session khác; link bị forward.

**Rollback**

- Tắt route/menu bằng feature flag; API/core vẫn nguyên.

## Phase 4 — Dashboard bếp và Excel

**Mục tiêu**

- Ma trận tổng hợp, khoa chưa báo, audit, lock/change request, export bếp.

**File dự kiến**

- `src/app/quan-tri/suat-an/page.tsx` và components.
- `src/app/api/admin/meal-orders/summary/route.ts`
- `src/app/api/admin/meal-orders/export/route.ts`
- `src/lib/meal-order-workbook.ts` dựa trên pattern `menu-analysis-workbook.ts`.

**DB migration**

- Có thể thêm index summary sau explain/measurement, review riêng.

**API**

- Summary polling, audit, lock, export.

**Dependency**

- Role bếp/dinh dưỡng; format Excel được bếp ký duyệt.

**Test**

- Totals hàng/cột, zero/missing department, polling race, permission, Excel tiếng Việt/ngày/print.

**Risk**

- Tổng không nhất quán do filter/status; export khác dashboard.

**Rollback**

- Tắt dashboard mới; core order/form vẫn hoạt động; export không làm mutation.

## Phase 5 — Zalo integration production

**Mục tiêu**

- Token manager, verified webhook, UID mapping/onboarding, link form và confirmation outbox.

**File dự kiến**

- `src/lib/zalo/client.ts`, `signature.ts`, `tokens.ts`, `events.ts`
- `src/app/api/integrations/zalo/oauth/**`
- `src/app/api/integrations/zalo/webhook/route.ts`
- `src/lib/outbox/**`
- `.env*.example` chỉ placeholder.

**DB migration**

- `zalo_users`, `zalo_events`, `integration_credentials`, `outbox_messages`; dựa trên fixture POC đã xác nhận.

**API**

- OAuth start/callback, webhook, integration health; không trả token ra client.

**Dependency**

- Phase 0 pass; Phase 2; encryption key/secret procedure; approved Zalo policy.

**Test**

- Raw signature, replay, duplicate/out-of-order, token refresh rotation/concurrency, 429/5xx/timeout, outbox retry/dead letter, revoked staff.

**Risk**

- Mất refresh token, secret log, webhook burst, user mapping sai.

**Rollback**

- `ZALO_INTEGRATION_ENABLED=false`; revoke App/rotate secret; form web/dashboard tiếp tục hoạt động; outbox giữ trạng thái để điều tra.

## Phase 6 — Cutoff, audit và change workflow hoàn chỉnh

**Mục tiêu**

- Effective-dated cutoff, lock, sửa sau cutoff có duyệt, admin báo thay có lý do.

**File dự kiến**

- Mở rộng `src/lib/meal-orders/cutoff.ts`, `service.ts`
- Admin UI cutoff/change request.

**DB migration**

- Chỉ additive nếu Phase 1 chưa đủ; không rewrite history.

**API**

- Change request approve/reject, cutoff settings versioned.

**Dependency**

- SOP bệnh viện được phê duyệt.

**Test**

- Exact cutoff second, server clock, holiday/weekend, override, audit before/after/reason.

**Risk**

- Cấu hình sai làm khóa nhầm.

**Rollback**

- Chọn rule effective trước; không xóa rule đã dùng; emergency override có audit.

## Phase 7 — Hardening và observability

**Mục tiêu**

- Alert token/outbox, metrics order, rate limit, CSP, backup/restore/runbook.

**File dự kiến**

- `src/lib/app-error-log.ts` mở rộng theo redaction chuẩn.
- Health/admin status, deployment docs/runbooks.

**DB migration**

- Có thể thêm integration health/dead-letter metadata; review riêng.

**API**

- Admin-only health/failed outbox replay.

**Dependency**

- Kênh cảnh báo và người trực vận hành được chỉ định.

**Test**

- Chaos: Zalo down, DB down, timeout, expired token; backup restore tabletop; secret scan.

**Risk**

- Log chứa dữ liệu/secret; retry storm.

**Rollback**

- Disable retry/connector; core web continues.

## Phase 8 — Pilot

**Mục tiêu**

- 1–3 khoa, chạy song song quy trình cũ, đo độ chính xác/đúng giờ và tải bếp.

**File dự kiến**

- Không mặc định; sửa nhỏ theo feedback đã duyệt.

**DB migration**

- Không trong pilot trừ blocker và có review.

**API**

- Production feature flag theo khoa.

**Dependency**

- Training, SOP fallback, owner support, consent/data policy.

**Test/exit criteria**

- 2–4 tuần; không mất order; duplicate được chặn; tổng Excel khớp; cutoff đúng; fallback diễn tập thành công.
- Tiêu chí số cụ thể do bệnh viện duyệt trước pilot.

**Risk**

- Người dùng vừa báo Zalo vừa kênh cũ gây double-count nếu SOP không rõ.

**Rollback**

- Tắt feature theo khoa; quay quy trình cũ; export/audit dữ liệu pilot, không xóa.

## Phase 9 — Production rollout

**Mục tiêu**

- Mở dần theo khoa, giám sát token/outbox/cutoff và hỗ trợ giờ cao điểm.

**File dự kiến**

- Deployment/runbook; không feature mới.

**DB migration**

- Không cùng ngày rollout nếu tránh được.

**API**

- Không thay contract trong rollout.

**Dependency**

- Pilot pass, backup, on-call, OA billing, policy sign-off.

**Test**

- Smoke test theo khoa; restore/rollback drill; đối soát bữa đầu mỗi đợt.

**Risk**

- Mở đồng loạt làm khó xác định lỗi.

**Rollback**

- Feature flag per department; web-only fallback; SOP manual; không rollback/xóa orders đã ghi.

## Phase sau MVP (không tự động đưa vào scope)

- Nhắc khoa chưa báo sau khi Zalo xác nhận policy/template.
- Auto-lock UI, thống kê tháng, PDF chuyên dụng.
- Liên kết thực đơn, định lượng/dự trù nguyên liệu, chi phí.
- Dự báo số suất chỉ khi dữ liệu đủ và có nhu cầu; không dùng AI để nhận báo suất.
- Zalo Mini App chỉ khi form web Hybrid chứng minh có hạn chế UX không giải quyết được.

## Gate duyệt trước implementation

Không bắt đầu Phase 0 cho tới khi có câu trả lời tối thiểu:

- OA ID/chủ thể/xác thực/gói dự kiến.
- Khoa pilot + người phụ trách.
- Danh mục bữa/chế độ và cutoff.
- Quy trình sửa/hủy sau cutoff.
- SOP fallback.
- Người sở hữu secrets/token và đầu mối Zalo.
- Xác nhận không đưa dữ liệu bệnh nhân vào MVP.

MVP web đã được hiện thực hóa theo hướng độc lập Zalo. Phase Zalo OA/OpenAPI vẫn chờ OA xác thực, gói dịch vụ và POC riêng.
