# Hướng dẫn plugin và token API không lưu thực đơn — 16/10/2026

## Yêu cầu và nguyên nhân xác nhận được

- Người dùng báo thiếu hướng dẫn trong plugin và chat hiểu nhầm/đứng ở vài chỗ, yêu cầu token để chỉ làm việc cần thiết mà không lưu thực đơn tài khoản. Đã hỏi thêm tình huống và kiểu token; khi chưa có phản hồi, thông báo đang theo lựa chọn đăng nhập tạo token riêng, không có quyền lưu.
- Lời nhắn QR/link trước đó viết sẵn người dùng muốn link bản riêng tài khoản, trong khi save phải là lựa chọn. Trang/hướng dẫn còn ghi13tool dù server có15. Đây là hai điểm lệch xác nhận từ mã; chưa có transcript cụ thể để kết luận mọi nguyên nhân chat bị đơ.

## Thay đổi

- Một nguồn `tool-guide.json` cho tên/mục đích/đầu vào/kết quả/bước tiếp của15tool, bốn luồng và xử lý lỗi. `get_workflow`, mô tả tool, initialize/discover, trang web và reference trong ZIP dùng cùng hợp đồng. Build package tạo `references/cong-cu.md`, README chỉ rõ plugin/skill/MCP, version1.0.4.
- Mặc định chỉ tính/trả chatReport, không đòi save để hoàn tất. Chỉ Excel dùng saveToAccount=false và trả downloadUrl ngay; chỉ save theo yêu cầu rõ. Code khác ID; đối tượng get khác danh sách items; REST khác MCP envelope; confirmationToken khác API token. HTTP lỗi phải sửa theo field/recovery, không gọi lặp nguyên lỗi.
- Token API trong Tài khoản → Kết nối ứng dụng:1giờ/24giờ/7ngày, mật khẩu hiện tại và CSRF/Origin,3token active tối đa, rate10lượt tạo/ngày/chủ. Quyền cố định read/calculate, export tùy chọn, không write; token chỉ hiển thị một lần, lưu hash, không refresh. Header Bearer dùng lại validator/owner/scope/issuer/audience/expiry hiện có.
- Tái dùng NutritionOAuthClient/Token để không thêm hệ auth/bảng/migration. Client nội bộ authMethod=api_token, redirectUris rỗng, tách khỏi cấu hình OAuth và lượt cấp quyền nền tảng. Thu hồi, đổi mật khẩu/khóa tài khoản và maintenance vẫn có hiệu lực. Audit chỉ metadata, không token hoặc thực đơn. Tài khoản giữ metadata token để quản lý; calculate không tạo Ration, export có file tạm10phút khác lưu tài khoản.
- Token không tự cấp khả năng gọi API cho chat chưa có công cụ. Dùng OAuth khi nền tảng không có ô Bearer; không yêu cầu bí mật trong lời nhắn và không tắt xác thực.

## Kiểm chứng

- Account94 kiểm tra (tăng32): tạo/hạn/quota/owner/hash/null refresh, scope không write/export mặc định, tùy chọn Excel, snapshot/audit không bí mật và thu hồi. Fixture PostgreSQL riêng, không đụng dữ liệu production.
- Guide58: từngtool có hợp đồng, mô tả và ZIP đồng bộ, không mặc định lưu, giới hạn kết quả get_workflow. Full suite, Prisma generate/TypeScript/ESLint file sửa đạt trước triển khai; chưa coi là kiểm browser/AI thật.
- CUA không có apps/browsers lúc kiểm: chưa đo tương tác/hydration/giao diện mobile. Nghiệm thu VPS được bổ sung sau triển khai; không nói mọi tình huống AI hiểu nhầm đã được tái hiện.

## Nguồn nền tảng

- [OpenAI — Define tools](https://developers.openai.com/plugins/plan/tools): mô tả điều kiện chọn tool, hợp đồng đầu vào/đầu ra, side effect và lỗi; tách đọc/ghi theo ý định.
- [OpenAI — Authentication](https://developers.openai.com/plugins/build/auth): OAuth cho kết nối MCP có xác thực. Token thủ công là phương án của ứng dụng hỗ trợ Bearer header, không tuyên bố ChatGPT luôn có ô nhập token.
