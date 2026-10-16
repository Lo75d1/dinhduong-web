# Hướng dẫn plugin và token API không lưu thực đơn — 16/10/2026

## Yêu cầu và nguyên nhân xác nhận được

- Người dùng báo thiếu hướng dẫn trong plugin và chat hiểu nhầm/đứng ở vài chỗ, yêu cầu token để chỉ làm việc cần thiết mà không lưu thực đơn tài khoản. Đã hỏi thêm tình huống và kiểu token; khi chưa có phản hồi, thông báo đang theo lựa chọn đăng nhập tạo token riêng, không có quyền lưu.
- Lời nhắn QR/link trước đó viết sẵn người dùng muốn link bản riêng tài khoản, trong khi save phải là lựa chọn. Trang/hướng dẫn còn ghi13tool dù server có15. Đây là hai điểm lệch xác nhận từ mã; chưa có transcript cụ thể để kết luận mọi nguyên nhân chat bị đơ.

## Thay đổi

- Một nguồn `tool-guide.json` cho tên/mục đích/đầu vào/kết quả/bước tiếp của15tool, bốn luồng và xử lý lỗi. `get_workflow`, mô tả tool, initialize/discover, trang web và reference trong ZIP dùng cùng hợp đồng. Build package tạo `references/cong-cu.md`, README chỉ rõ plugin/skill/MCP, version1.0.4.
- Plugin có onboardingSkill và skill khởi động riêng. MCP quảng bá extension `io.modelcontextprotocol/skills`, hỗ trợ skills/list/get và resources/list/read công khai có hạn mức; whitelist URI từ manifest tĩnh, không đổi URI yêu cầu thành đường dẫn file. Hai skill/sáu file có SHA256 khớp nội dung ZIP. Đây là hỗ trợ import snapshot theo SEP draft mà OpenAI công bố, không khẳng định host tự cài hay làm mới skill; cần Scan Tools/cập nhật phiên bản theo giao diện nền tảng.
- Mặc định chỉ tính/trả chatReport, không đòi save để hoàn tất. Chỉ Excel dùng saveToAccount=false và trả downloadUrl ngay; chỉ save theo yêu cầu rõ. Code khác ID; đối tượng get khác danh sách items; REST khác MCP envelope; confirmationToken khác API token. HTTP lỗi phải sửa theo field/recovery, không gọi lặp nguyên lỗi.
- Token API trong Tài khoản → Kết nối ứng dụng:1giờ/24giờ/7ngày, mật khẩu hiện tại và CSRF/Origin,3token active tối đa, rate10lượt tạo/ngày/chủ. Quyền cố định read/calculate, export tùy chọn, không write; token chỉ hiển thị một lần, lưu hash, không refresh. Header Bearer dùng lại validator/owner/scope/issuer/audience/expiry hiện có.
- Tái dùng NutritionOAuthClient/Token để không thêm hệ auth/bảng/migration. Client nội bộ authMethod=api_token, redirectUris rỗng, tách khỏi cấu hình OAuth và lượt cấp quyền nền tảng. Thu hồi, đổi mật khẩu/khóa tài khoản và maintenance vẫn có hiệu lực. Audit chỉ metadata, không token hoặc thực đơn. Tài khoản giữ metadata token để quản lý; calculate không tạo Ration, export có file tạm10phút khác lưu tài khoản.
- Token không tự cấp khả năng gọi API cho chat chưa có công cụ. Dùng OAuth khi nền tảng không có ô Bearer; không yêu cầu bí mật trong lời nhắn và không tắt xác thực.

## Kiểm chứng

- Account94 kiểm tra (tăng32): tạo/hạn/quota/owner/hash/null refresh, scope không write/export mặc định, tùy chọn Excel, snapshot/audit không bí mật và thu hồi. Fixture PostgreSQL riêng, không đụng dữ liệu production.
- Guide74: từngtool có hợp đồng, mô tả/ZIP/onboarding và digest tài nguyên đồng bộ, không mặc định lưu, giới hạn kết quả get_workflow. HTTP252 gồm32 kiểm tra skill extension/list/get/read/digest/URI bất hợp lệ. Full suite, Prisma generate/TypeScript/ESLint file sửa đạt; chưa coi là kiểm browser/AI thật.
- Trong kiểm VPS, API hồ sơ200 nhưng trang tài khoản liên tục hiện lỗi tải; log an toàn xác nhận DriverAdapterError/postgres/XX000 ở RSC. Tái dùng một PrismaClient trên process ở production, giới hạn pool3 và thời gian chờ10giây để tránh các bundle mở pool mặc định độc lập. Không ghi connection string, câu SQL hay message driver vào log. Thay đổi này cần thiết để phần quản lý token hiển thị; nghiệm thu lại trang/API sau build, không suy từ fixture.
- CUA không có apps/browsers lúc kiểm: chưa đo tương tác/hydration/giao diện mobile. Nghiệm thu VPS được bổ sung sau triển khai; không nói mọi tình huống AI hiểu nhầm đã được tái hiện.

## Nghiệm thu VPS bản cuối

- App `23457e05986e547e1ab148b9fa85885019264148` healthy, backup `/opt/dinhduong-release-backups/nutrition-plugin-guide-20261016-155022-codex`. Giữ nhánh codex/nutrition-chat-api và PR#4 draft, không merge main; deploy theo quyền chủ dự án đã cấp. Không migration mới.
- **HTTPS100 đạt:** initialize/version1.0.4 và hướng dẫn không lưu,15tool có mô tả kết quả; extension import2skill/6file với digest; workflow/QR/TXT/trang hướng dẫn thống nhất. Form token trong HTML tài khoản đã hiện, API profile/metadata/CSRF/Origin/mật khẩu/owner đúng.
- Tạo2token thật trên một tài khoản kiểm thử, tài khoản thứ hai kiểm chủ khác; đều ghi rõ chỉ kiểm thử phần mềm, dùng cơ chế quản lý tài khoản thực tế. Bearer tra Food và tính356kcal; token không write bị chặn save, token không export bị chặn xuất, export saveToAccount=true bị chặn. Exportfalse trả Excel1.547.579byte, savedMenuUrl/savedRecord=null; DB xác nhận0Ration. Token chỉ hash/không refresh; profile/audit không có token thô, thu hồi trả401, bộ đếm nền tảng không tăng.
- **Smoke16 đạt:** bảy URL công khai gồm trang có truy vấn DB; hai lượt song song account/profile vẫn200, form token hiện và không báo lỗi; token bị thu hồi không còn trong danh sách active. Anonymous đăng nhập quay đúng mục API token. Trang quản lý OAuth vẫn200. Log app bản cuối có0 ACCOUNT_SNAPSHOT_FAILED; lỗi RSC XX000 không tái hiện sau dùng chung pool giới hạn3. Không diễn giải kết quả này thành đo sức chứa/stress test.
- Đã dọn đúng2user/2session/2client/2token/4audit fixture,0Ration và các scoped record còn0; context chứa bí mật đã xóa khỏi container/backup. Năm bảng nguồn3719/7369/41457/246/72 giữ count/digest;25migration, env/layout/Caddy/Google giữ nguyên; timer active/enabled, healthy/không OOM/swap.
- React11 kiểm nội dung form/hướng dẫn đạt. Chưa kiểm browser click/hydration/mobile hoặc hội thoại người dùng thật; không tuyên bố đã tái hiện mọi chỗ chat hiểu nhầm. Skill nhập từ MCP là snapshot: chủ plugin cần Scan Tools/cập nhật skill theo giao diện host; thêm URL không đảm bảo skill đã được nạp. Không tự publish, đổi plugin đang cài trên tài khoản nền tảng hoặc tạo bí mật cho tài khoản người dùng.

## Nguồn nền tảng

- [OpenAI — Define tools](https://developers.openai.com/plugins/plan/tools): mô tả điều kiện chọn tool, hợp đồng đầu vào/đầu ra, side effect và lỗi; tách đọc/ghi theo ý định.
- [OpenAI — Authentication](https://developers.openai.com/plugins/build/auth): OAuth cho kết nối MCP có xác thực. Token thủ công là phương án của ứng dụng hỗ trợ Bearer header, không tuyên bố ChatGPT luôn có ô nhập token.
- [OpenAI — Import skills from MCP](https://developers.openai.com/plugins/build/mcp-server#import-skills-from-the-mcp-server), [đóng gói/onboarding](https://developers.openai.com/plugins/build/plugins#add-an-onboarding-skill): manifest/digest/đường dẫn và giới hạn snapshot. Không tự gửi plugin lên xét duyệt công khai.
