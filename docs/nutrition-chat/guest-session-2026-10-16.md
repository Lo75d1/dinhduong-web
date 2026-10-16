# Phiên tạm không tài khoản và hướng dẫn từng phản hồi — 16/10/2026

## Phạm vi

- Người dùng xác nhận cần token phiên tạm không cần tài khoản; token cá nhân ở phần Tài khoản là khả năng riêng, chưa đáp ứng lựa chọn này. Đồng thời cần chỉ dẫn ngay trong phản hồi API, thay vì chỉ hướng dẫn chung hoặc chỉ trả số liệu.
- Tái dùng bộ tính/tra kho, bản duyệt và confirmationToken, xuất/nhập Excel, bộ đếm PostgreSQL atomic, vùng file tạm riêng đã mount và plugin hiện có. Không tạo engine dinh dưỡng, tài khoản ngầm, bảng hay migration mới; không đổi kho nguồn.

## Thực hiện

- Phiên30phút: POST `/api/nutrition/v1/guest-session` với `{}`, không cần cookie/tài khoản. Bearer ngẫu nhiên256bit, chỉ hash làm tên file; file tạm chỉ có ID phiên/hạn/issuer, không có thực đơn hoặc hồ sơ. DELETE cùng URL với Bearer kết thúc ngay. File đã xuất có hạn tải riêng10phút.
- Công cụ công khai `start_guest_session`, tổng16tool. Chế độ mixed/noauth cho tra kho/tính/xuất: token chỉ dùng nội bộ qua `arguments.sessionToken`; REST dùng header Bearer. Không chấp nhận token OAuth trong tham số này, không fallback khi header OAuth sai. Phiên khách hết hạn/thiếu trả lỗi công cụ có chỉ dẫn mở phiên mới, không tự bật yêu cầu đăng nhập OAuth.
- Phiên khách chỉ kho chung/read/calculate/export; chặn save, danh sách/bản lưu và thư viện riêng kể cả các thao tác có cùng read scope. Export không truy vấn Ration để tìm bản lưu, saveToAccount=true bị chặn. Tính vẫn phải prepare và người dùng duyệt; token kỹ thuật không chứng minh đã đồng ý.
- Tạo tối đa6phiên/giờ theo IP proxy tin cậy, toàn hệ60phiên/giờ; nếu không bật proxy tin cậy dùng chung một bucket.30yêu cầu/phút/phiên,6lần chuẩn bị/tính/phút và2xuất/phút; giữ giới hạn xuất toàn hệ60/giờ và một workbook tại thời điểm.429 có Retry-After, không tạo phiên mới để vượt hạn mức.
- Mỗi kết quả công cụ và nhập Excel có `guidance` cộng thêm vào cấu trúc cũ: stage/instruction/nextTools/requiresUserConfirmation và questions khi thiếu. Phân biệt không tìm thấy, thiếu đầu vào, bản duyệt quá lớn, chờ đồng ý, đã tính, link tải sẵn, đã lưu. Lỗi REST/MCP cũng có hướng dẫn khôi phục; kết quả MCP rút gọn giữ guidance. Không tự tải Excel vào chat để hoàn tất.
- Trang `/ket-noi-ai#phien-tam` công khai có tạo/sao chép/kết thúc token; không localStorage/cookie giữ token. Gói plugin/skill, hướng dẫn web/QR/TXT và manifest skills thống nhất1.0.5,16tool; chủ plugin cần Refresh/Scan Tools/cập nhật snapshot. Không tự thay plugin đã cài trên tài khoản nền tảng.

## Kiểm chứng cục bộ

- Full suite Nutrition Chat đạt; HTTP cuối308, guide/package77, React SSR12. HTTP thử không tài khoản, hết hạn/thu hồi/sai token/khác phiên, chống downgrade, private routes và saveToAccount bị chặn, prepare/calculate/MCP/export fixture, Excel import, hướng dẫn thiếu/rỗng/lỗi và giữ guidance khi rút gọn. Count User/Session/Ration/OAuth metadata trước/sau guest fixture khớp.
- Prisma generate, TypeScript và ESLint file sửa đạt. Không đổi schema/migration. Browser inventory rỗng: chưa kiểm click/hydration/mobile hoặc hội thoại ChatGPT/Claude thật; SSR không thay kiểm trình duyệt.

## Nghiệm thu VPS và sự cố truy cập

- Read-only preflight khớp checkout6e87f43, app healthy, không OOM/swap;5bảng nguồn có count3719/7369/41457/246/72 và digest khớp,25migration. RAM2GB, available684MB, disk6.7GB trống.
- App source `92b4eb80e3974423fd644c868227ead9131704dc` đã build Linux và khởi động healthy. Backup `/opt/dinhduong-release-backups/nutrition-guest-session-20261016-161250-codex` có image rollback/cấu hình/checksum. Sau deploy,5bảng nguồn/count/digest,25migration và env/layout/Caddy/Google khớp; timer active/enabled. PR#4 vẫn draft/chưa merge main; quyền deploy trực tiếp đã được chủ dự án cấp trước đó.
- Trong đợt nghiệm thu HTTPS, máy bắt đầu không trả HTTP/HTTPS hoặc banner SSH; ping vẫn18ms, DNS vẫn103.216.116.166. Chưa có đủ bằng chứng kết luận RAM/OOM, firewall hoặc nguyên nhân khác. Chưa nhận báo cáo nghiệm thu cuối nên chưa xác nhận luồng Excel production hay việc dọn fixture tạm. Không tạo tài khoản kiểm thử trong đợt guest này; token/file kiểm thử nếu có đều nằm vùng tạm, không phải dữ liệu Food/Dish/Ration.
- Chủ dự án đã khởi động lại VPS qua Console/VNC; uptime xác nhận khoảng1phút, web/SSH hoạt động trở lại, app healthy/OOMKilled=false. Đọc nhật ký bộ nhớ của boot trước/hiện tại không nhận được dòng OOM; chưa đủ bằng chứng xác định nguyên nhân lần treo. Năm bảng nguồn/count/digest sau khởi động vẫn khớp.
- Chạy lại phép thử có mốc tiến độ, timeout45giây cho từng fetch và swap1GB tạm bảo vệ đợt kiểm thử. **HTTPS87 đạt:** UI HTML/TXT/workflow1.0.5, public guest tool, read/calculate/export không cookie/account; session hash-only và không dữ liệu đầu vào; chờ duyệt đúng bản, số liệu100g khớp Food nguồn, REST/MCP cùng kết quả và mã chốt khác phiên bị chặn. Phiên khách không mở private library/menu hoặc saveToAccount=true; thiếu/hết phiên khách có hướng dẫn không ép OAuth.
- Excel thực tế1.548.367byte tải200 và nhập lại200, giữ định lượng100g và guidance chờ duyệt. Số bản ghi app_users/app_sessions/rations/OAuth client/token trước/sau phép thử không đổi; không tạo user kiểm thử. Token của đợt kiểm thử hoàn tất và file xuất của nó đã dọn. Hai file hash/hạn phiên từ đợt bị ngắt trước reboot còn chờ hết hạn30phút, không có đầu vào; không xóa nhầm các phiên khác. Hạn được kiểm khi dùng và file hết hạn được dọn ở lần tạo phiên kế tiếp.
- Sau phép thử app healthy, không OOM, timer active/enabled; swap tạm không bị dùng ở mốc cuối và đã tắt/xóa. Có lúc đo container khoảng788MiB khi xuất; đây không phải số peak hay kiểm sức tải. Không dùng lần đạt sau reboot để kết luận đã sửa nguyên nhân treo hoặc đảm bảo sức chứa VPS.
- Chưa kiểm tương tác browser hoặc hội thoại ChatGPT/Claude thật vì công cụ browser không kết nối. Chủ plugin cần Refresh/Scan Tools để nhận start_guest_session và sessionToken; chỉ thêm URL hoặc tải gói không chứng minh phiên chat đã có công cụ mới.
