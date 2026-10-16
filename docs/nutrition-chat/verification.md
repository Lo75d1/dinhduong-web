# Kiểm chứng Nutrition Chat API — 14/10/2026

- Gỡ nội dung dự án khác16/10: app **b60b934** healthy, bỏ menu/điểm vào suất ăn và PC07 mặc định; ba URL cũ404. HTTPS48 gồm10client assets đạt, thông tin bệnh viện/bộ đếm giữ nguyên; backup+audit riêng cho organization placeholder. Prisma/TypeScript/lint file sửa/Linux build đạt; canonical/25migration/cấu hình không đổi, không OOM/swap, timer active. Browser hiện không kết nối nên chưa kiểm tương tác trực tiếp. [Biên bản](project-scope-2026-10-16.md).
- Cập nhật 16/10: hướng dẫn/duyệt đầu vào, dấu `*`, link báo cáo trước và hai phụ lục 24h chạy VPS app **e85a281** healthy. Full suite và Linux build đạt; HTTPS33 + public14 + native import/update11; Excel native fixture28/file thật28, SaveAs/parser5+4; 4 trang in đã xem. React render với dữ liệu thật đạt; browser trực tiếp chưa kiểm đợt này do không có phiên kết nối. Canonical/cấu hình/25 migration giữ nguyên; đã dọn 1 Ration/2 phiên/2 user thử, timer active, không OOM/swap. [Biên bản và giới hạn](review-and-recall-2026-10-16.md).
- Trang chủ làm sạch link Facebook/UTM chạy VPS app **09424ce**: HTTPS16 + trình duyệt thật xác nhận đích `/`, không loop, các trang/API/OAuth giữ đường dẫn riêng. Build Linux/TypeScript và health đạt; canonical count/digest, 25 migration, cấu hình giữ nguyên. Xem [nghiệm thu link trang chủ](facebook-home-2026-10-15.md).
- Phân biệt VDD/RNI chạy VPS app **59dc690**: RNI đủ dòng nguyên liệu; VDD MA chỉ số liệu cả món, ghi rõ không có dữ liệu thành phần. Complete-report/import, native fixture38, HTTPS45/file thật Excel43/native SaveAs/parser4 đạt; đổi mã thực phẩm hai chiều cập nhật đúng. Không sửa canonical/migration/cấu hình; xem [bố cục thực đơn](menu-layout-2026-10-15.md).
- Nhãn Ngày/Món ăn theo nhóm đã chạy VPS app **be06415**: complete-report + native fixture31, HTTPS39/file thật Excel35/native import4 đạt; nhãn tính từ bảng nhập đầy đủ, không xóa dữ liệu hoặc merge ô thân bảng. Xem phần bổ sung [bố cục thực đơn](menu-layout-2026-10-15.md).
- Bố cục Thực đơn mới theo lựa chọn người dùng đã chạy VPS app **5994ff2**: HTTPS30, Excel desktop file thật28 và native SaveAs/parser4 đạt. Tiếp tục nhập ở Nhap khau phan; mục tiêu ở báo cáo, nguồn/ghi chú một cột, không đổi engine/import/migration/canonical. Xem [biên bản bố cục thực đơn](menu-layout-2026-10-15.md).
- Link nguồn VDD/RNI bổ sung theo yêu cầu đã chạy VPS app **ba2829d**: HTTPS42 và browser quản trị/nguồn/chi tiết thật đạt; không migration/fixture/sửa canonical. Xem [biên bản nguồn dữ liệu](data-sources-2026-10-15.md). Nhánh vẫn chưa merge main.
- Thư viện cá nhân 15/10 đã lên VPS theo yêu cầu trực tiếp chủ dự án: app46f2659 healthy, DB25/25; HTTPS69/public17 và browser thật đạt, fixture đã dọn, canonical/cấu hình giữ nguyên. Xem [nghiệm thu VPS thư viện](vps-personal-library-2026-10-15.md) và [đặc tả](personal-library-2026-10-15.md). Chưa merge main.
- Excel/link bản lưu đã nghiệm thu riêng trước đó ở app151ec6b tại [biên bản link và bản lưu](saved-menu-links-2026-10-15.md); các snapshot cũ bên dưới giữ để đối chiếu thời điểm.

- Cập nhật báo cáo 15/10: bộ xuất `2aa88d3`, app đóng gói cùng plugin/skill `656646c` healthy trên VPS; Excel web/chat chung, đủ 160 chất tính được + 2 trường nguồn đối soát, xuất quản trị đủ dữ liệu. Đã kiểm file tải thật bằng Excel desktop, sửa định lượng tự tính và quét lỗi mọi sheet; vá nguyên nhân công thức làm trống ở Food có chỉ số vượt vùng tự nhập. Xem [nghiệm thu báo cáo Excel](report-export-2026-10-15.md) để biết số đo, giới hạn, nợ lint cũ và yêu cầu xuất lại file cũ. Các snapshot kiểm chứng cũ bên dưới không thay thế biên bản này.

- Cập nhật 15/10: quản lý tài khoản/OAuth thủ công đã chạy VPS `c9c74fb`, account62 + HTTPS74, migration24 up to date; đóng quyền Data API trên bảng tài khoản/phiên/audit cũ. Xem [nghiệm thu tài khoản](vps-account-2026-10-15.md). Các mục snapshot cũ bên dưới giữ để đối chiếu thời điểm; chưa nghiệm thu platform thật.

- Nhánh: `codex/nutrition-chat-api`, tách từ `origin/main` `5314cea`. Checkout gốc và các thay đổi đang dở được giữ nguyên.
- Các mục dưới là snapshot kiểm chứng phát triển trước deploy. **Đã chạy thử VPS ngày 14/10** theo [báo cáo thực tế](vps-2026-10-14.md); kết nối tài khoản ChatGPT/Claude thật vẫn chưa nghiệm thu.

## Đã đạt

- `prisma generate`, `tsc --noEmit`, build production Next.js 16.4.0 bằng Turbopack; server standalone khởi động và trả trang kết nối 200.
- ESLint toàn bộ file mới/sửa của tính năng với `--max-warnings=0`: sạch.
- `npm run test:nutrition-chat`: core/protocol 67, OAuth thuần 73, OAuth/PGlite 106, lưu dữ liệu/PGlite 82, HTTP handler 77; workbook parser/nguồn/ZIP/parity đạt. PGlite và Food/session fixture riêng, không ghi DB thật.
- HTTP handler được gọi bằng Request/Response thật trong fixture: modern MCP 2026-07-28 và legacy 2025, OAuth/scopes/Origin, lưu trùng, revision, chủ sở hữu, quota, nhập XLSX thật và các lỗi. Export HTTP dùng stub; không coi là nghiệm thu export production.
- Workbook: 43 kiểm tra Excel native qua COM, sửa lượng/nguyên liệu/suất/ngày/mục tiêu, phân biệt null/0, bảng bữa/món, biểu đồ tự đổi, nhận xét cũ, file Excel đã lưu nhập lại khớp server.
- Ca tối đa 90 ngày/1.000 dòng/40 chất/6.000 thực phẩm đã xuất và nhập lại. Ca 40 chất ngoài kcal/P/L/G có 44 cột nguồn cũng đạt. File xuất tự kiểm tra 5 MB nén, 32 MiB/entry, 64 MiB tổng trước khi phát link.
- UI desktop/mobile thật trên build production: không tràn ngang ở 390 px. Luồng upload/nguồn sửa/chốt/lưu/xuất/tải/mở/xóa thử qua proxy API **giả lập**, dùng kết quả `resolveMenu` thật; không coi là DB/OAuth integration. Một lần Link trong proxy không chuyển trang; mở href trực tiếp và chuyển trang sau xóa đạt, không ghi lỗi console.
- Metadata OAuth/OpenAPI thật trên standalone trả 200/no-store; bản lưu và MCP thiếu đăng nhập trả 401 kèm challenge; trang consent có DENY + `frame-ancestors 'none'`. Consent đăng nhập/cấp quyền thật chưa thử.
- Package plugin/skill hợp schema upstream, ZIP an toàn và deterministic. Sáu frame MCP hợp JSON Schema chính thức 2026-07-28.
- `test:ration` quy đổi có sẵn đạt. Cleanup dry run không truy cập DB/file; chưa chạy `--apply` trên VPS.

## Các kiểm tra cũ chưa đạt

- ESLint toàn repo: 6 errors, 12 warnings. Sáu errors được tái hiện trên checkout gốc với bản ESLint gốc: `scripts/check-duplicates.ts`, `AdminPortal.tsx`, trang nhật ký lỗi, `MealInput.tsx`, `MenuFoodSearch.tsx`, `MultiDayAnalysis.tsx`.
- `test:multi-day` cũ dừng tại dòng 29: chờ `null` nhưng reducer đang trả tổng phần đã biết `600`. Test và reducer không được thay đổi trong nhánh này. API mới giữ tổng phần có số liệu và cờ incomplete, chặn kết luận đáp ứng khi thiếu; đã có kiểm tra riêng.
- Không sửa hoặc bỏ qua các lỗi cũ để làm báo cáo xanh. Các lỗi ngoài phạm vi vẫn cần được xử lý/chốt trước phát hành chính thức. Người dùng đã bỏ cửa Claude duyệt và tự chạy thử nhánh VPS theo `thu-vps.md`.

## Dependency và giới hạn

- Next.js 16.2.10 có advisory critical; nâng Next + eslint-config-next lên 16.4.0. `npm audit --omit=dev` sau nâng: **0 critical, 7 high, 7 moderate**. Các mục còn lại ở đồ thị cũ, gồm CLI/build của Prisma và dependency ExcelJS/UUID; không downgrade Prisma/ExcelJS hoặc chạy audit fix force.
- Rà mức tiếp cận của từng advisory trong image runner/maintenance trên staging; không coi số đếm audit là bằng chứng khai thác hoặc tuyên bố hết mọi rủi ro.
- Một tác vụ Excel tại một thời điểm, khóa PostgreSQL chung cho import/export; bận trả 503 + Retry-After 15. Khóa nhiều worker thật chưa thử; PGlite không thay thế phép thử này.
- Giữ 20 lần thay đổi gần nhất có đầu vào cũ/mới, nguồn và thời điểm xác nhận; báo historyTruncated khi vượt 20. Tối đa 200 bản và 25 MB/tài khoản, tối đa 5 MB/bản. Không tạo kho Food/Dish riêng.
- MCP đo cả envelope và escape, giới hạn 140.000 ký tự: rút gọn có thông báo hoặc yêu cầu chia kỳ; không cắt lặng lẽ, không để lưu thành công rồi mất ID vì kết quả quá lớn.
- Đo trên Windows Node 26.5.0: xuất thông thường 3.719 Food × 18 chất × 7 ngày/21 dòng khoảng 2 giây, peak RSS 393 MiB; xuất tối đa khoảng 8–9 giây/1.064 MiB; nhập tối đa khoảng 1,2–1,5 giây/363 MiB. Số đo này không bảo đảm RAM/tải Linux Node 24. Dự trù staging 2 GiB thông thường, 4 GiB nếu dùng tổ hợp tối đa; đo lại trên VPS trước chốt sức chứa.

## Snapshot trước deploy: chưa nghiệm thu trên hệ thống thật

- Read-only CLI với `.env` local không xác minh được DB (P2010); không suy ra trạng thái VPS hoặc sửa dữ liệu để chữa. File JSON ngày 14/10 có 3.719 Food/7.369 Dish là snapshot đã rà, không phải bằng chứng DB live.
- Chưa chạy Docker/Caddy trên host này, chưa áp migration, chưa cài lịch cleanup. Build/server standalone local không thay thế thử image Linux, cấu hình Caddy và volume UID 1001.
- Người triển khai cần đọc runbook, backup/rà migration history, kiểm nguồn Food/Dish/khuyến nghị/aliases bằng cấu hình VPS đúng, chạy migration no-cache theo hướng dẫn nhánh thử và thử hai tài khoản/hai worker.
- Kết nối thật ChatGPT và Claude: PKCE/consent, tra Food/Dish, xem/chốt/tính, lưu/mở, xuất/tải/nhập lại, hết hạn/thu hồi và lỗi scope. Đây là cửa nghiệm thu M5, chưa được đánh dấu hoàn tất.
- Evidence cục bộ ở `evidence/nutrition-chat` đã ignore khỏi Git/Docker; không có token production, dữ liệu thật được sửa hoặc file Excel tạm trong public.

## Snapshot chuẩn bị nhánh chạy thử VPS

- Ngày 14/10/2026, người dùng xác nhận tự nhập lệnh VPS; Codex chỉ cập nhật GitHub, không merge hoặc truy cập server. Hướng dẫn mới tại `thu-vps.md`.
- Rà cấu hình phát hiện volume Excel có thể được mount lần đầu bởi image maintenance (builder), trước app runner. Builder nay cũng tạo thư mục mode 0700, owner UID/GID 1001; tránh volume mới thuộc root làm app không ghi được file xuất. Chưa xác minh Docker copy-up hoặc quyền volume hiện có trên VPS.

## Kiểm chứng bổ sung sau khi vào VPS

- PostgreSQL thực tế 17.6, Supabase có default grants cho anon/authenticated. Migration private_access mới bật RLS và thu hồi quyền trên 5 bảng thuộc tính năng, giữ quyền owner/BYPASSRLS của app; không sửa OAuth migration cũ hoặc Food/Dish.
- OAuth/PGlite tăng lên 239 checks (133 ACL/RLS thực SQL); storage 82, HTTP 77, TypeScript và lint các file sửa đạt. Vai trò fixture ứng dụng không SUPERUSER, có BYPASSRLS và sở hữu bảng.
- Restore backup public vào PostgreSQL 17 riêng, không network/port ngoài, áp thử 7 migration đạt. Sau đó 7 migration trên DB thật đạt; cả 5 bảng riêng có RLS, anon/authenticated SELECT false, role ứng dụng tiếp tục hoạt động.
- Hai backend PostgreSQL riêng kiểm contention/release của khóa Excel đạt. Đây không thay cho tải nhiều app worker hoặc phép thử mức tối đa.
- 41 checks HTTPS thực tế đạt; file XLSX 787.924 bytes xuất/tải/nhập lại đạt. User/client/session/token/ration test được dọn theo ID và metadata chính xác; file Excel test hết hạn đã được maintenance xóa.
- App/Caddy đang chạy, volume UID 1001/mode 0700 ghi được, timer bảo trì chạy thành công. Swap 1 GiB chỉ dùng build, đã gỡ; VPS trở lại 2 GiB/no swap. Chi tiết và hạn chế tại `vps-2026-10-14.md`.

## Kiểm chứng bổ sung bộ đếm footer

- Bổ sung footer 14/10: OAuth/PGlite **254 checks**, gồm không đếm code lỗi/phát lại/refresh, phân loại callback chính xác, rollback, giữ tổng sau cleanup và ACL của SiteSetting. Core 67/OAuth pure 73/storage 82/HTTP 77/workbook parser cùng suite đều đạt; TypeScript/lint/build đạt.
- VPS: backup public mới 3.710.579 bytes/258 entries; restore riêng + migration bộ đếm đạt. DB thật 23 migration up to date; SiteSetting RLS, anon/authenticated không có SELECT/UPDATE; nội dung Food/Dish/nguyên liệu và cài đặt cũ khớp dấu kiểm trước/sau.
- API site-settings live 200/no-store, chỉ xuất tổng ChatGPT/Claude (0/0 lúc bật), không có trường Gemini/private/token/owner. Health/landing/OAuth metadata 200, timer bảo trì tiếp tục thành công. Không chạy lại smoke tạo OAuth giả trên production để tăng số công khai.

## Báo cáo ngay trong chat — 15/10/2026

- Báo cáo pure fixture 37 checks: mẫu số tỷ lệ P–L–G khác kcal nguồn, partial/null/0, guard tỷ lệ ngày thiếu, empty day, mục tiêu/cả kỳ/trung bình, giới hạn trên/mốc 0, nguồn/ước tính/Markdown escape/giới hạn nguồn và không mutate bản đã chốt.
- HTTP fixture tăng từ 77 lên 83 checks: REST và MCP modern trả báo cáo, text/structuredContent đồng nhất, bản MCP lớn vẫn giữ báo cáo và nằm trong ngân sách. Core/protocol 67, Prisma generate/TypeScript/lint file sửa/diff check đạt; không lặp lại các suite ngoài phạm vi đã nghiệm thu trước.
- App `1179d21` build Linux/TypeScript, healthy; HTTPS 28 checks với session/tài khoản test thật và Food hiện có. Kiểm đủ số liệu/partial/nhiều ngày/mục tiêu/ngày trống, digest chốt đúng; dọn tài khoản/session, nguồn count+digest không đổi, tổng kết nối 0/0. Không tạo grant OAuth để thử presentation.
- Browser VPS thật thấy lời nhắn/bước báo cáo trước Excel, 319 px/document 304 px không tràn ngang. Nghiệm thu nền tảng ChatGPT/Claude thật còn thiếu; server trả báo cáo và hướng dẫn không chứng minh mọi model luôn trình bày đúng.
- App `63cf966` qua build Linux/TypeScript và health/HTTPS. Trình duyệt thật xác minh footer chữ 12 px, màu rgb(107,114,128), 0/0, một hàng ở viewport 319 px/document 304 px; ảnh tại `evidence/nutrition-chat/vps-footer-connections.jpg` được ignore. Không kết luận nền tảng thật từ phép thử UI này.

## Nguồn đối chiếu

- [MCP 2026 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), [schema chính thức](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.json).
- [OpenAI Plugins OAuth](https://developers.openai.com/plugins/build/auth), [Claude connector](https://claude.com/docs/connectors/building).
- [Advisory Next.js](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [Next 16.4.0](https://github.com/vercel/next.js/releases/tag/v16.4.0).
