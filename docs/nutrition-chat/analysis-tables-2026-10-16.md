# Các bảng phân tích web trong Excel — 16/10/2026

- Yêu cầu: giữ các bảng số liệu đang dùng để phân tích khẩu phần trên web trong bản Excel chung web/hội thoại; không cần bổ sung biểu đồ. Rà soát thấy thiếu tổng quan kỳ, cân đối theo cân nặng, đóng góp bữa/món, ngày đủ cơ sở/đạt, danh sách ngày dùng nhóm, bảng WHO và số bữa của mã chế độ ăn.
- App **8e20d14aa0fd17a50d38cc92189d45f074630395** đã build Linux và healthy trên VPS. Nhánh `codex/nutrition-chat-api`, PR#4 draft/chưa merge main; triển khai trực tiếp theo quyền chủ dự án đã cấp. Guide/plugin **1.0.10**, **16 tool**, không đổi. Không migration, seed/reset, sửa Food/Dish hoặc mở rộng quyền tài khoản.

## Bảng và nguồn số liệu

| Nội dung phân tích | Vị trí Excel |
| --- | --- |
| Từng thực phẩm, định lượng và toàn bộ 160 chỉ tiêu; tổng món/bữa/ngày/kỳ | `Phan tich chi tiet`, tiếp tục là tab đầu |
| Năng lượng, mục tiêu, chênh lệch, tỷ lệ, P/L/G và số bữa từng ngày | `Can doi nang luong` |
| Tổng/trung bình kỳ; ngày có dữ liệu/chưa nhập/đạt/thiếu/vượt; số món/thực phẩm/nhóm | `Can doi nang luong` |
| Hồ sơ; P:L:G theo g/kcal/%; g/kg/ngày và kcal/kg/ngày | `Can doi nang luong` |
| Bảng Z-score trẻ em: chỉ số, thực tế, Z-score, diễn giải, nguồn | `Can doi nang luong`, khi có hồ sơ/chuẩn phù hợp |
| Đóng góp bữa và món toàn kỳ; mục tiêu bữa được người dùng nhập | `Dong gop bua mon`; bảng ngày-bữa/món chi tiết có sẵn vẫn giữ |
| Đối chiếu đủ 160 chỉ tiêu, số ngày đủ cơ sở, số ngày đạt, nguồn/loại mốc | Cuối `Thanh phan day du` |
| Tỷ lệ năng lượng, số ngày và danh sách số thứ tự ngày dùng nhóm | Bổ sung cuối `Nhom thuc pham` |
| Đối chiếu mã chế độ ăn, gồm số bữa | Phần có sẵn của `Bao cao` |
| Thực đơn, phiếu 24h, quy đổi, đơn vị ăn, đi chợ, nguồn, thuốc/TPBS khi có | Các tab hiện có được giữ |

- `workbook-analysis.ts` là phần trình bày/tham chiếu, tái dùng số từng dòng `Nhap khau phan`, tổng `Phan tich`, metadata 160 trường và builder/parser chung. Không dựng engine quy đổi thứ hai. Helpers đếm nhóm/bữa và ngày không tính lại dinh dưỡng.
- `assessWhoGrowth` trong `who-growth.ts` được dùng chung bởi bảng WHO trên web và Excel, giữ dữ liệu LMS, ngưỡng/diễn giải hiện có. Biểu đồ web giữ nguyên; không bổ sung biểu đồ xuất.
- Web một ngày lấy mã chế độ ăn đã chọn từ cấu hình hiện có; nhiều ngày truyền thêm chế độ bếp, tỷ lệ bữa và mã đang chọn. Route chỉ nhận allowlist `reportContext`, tra mã canonical, từ chối mã mâu thuẫn hoặc thuộc tính số tổng được chèn thêm; lựa chọn dropdown là `user_confirmed`, không tự coi là kê đơn.
- Mục tiêu bữa chỉ hiện khi tỷ lệ đã nhập khớp các bữa và tổng bằng 100% trong dung sai hiện có. Không tự chia tỷ lệ. Chế độ bếp ghi “Tham khảo cả ngày”, không kết luận thiếu hụt cá nhân từ bữa bếp cung cấp.
- Thiếu nguồn/mục tiêu là `—` hoặc “Chưa đủ cơ sở”, số 0 giữ số 0. Tổng một phần vẫn là số với định dạng động `≥`. Không gộp đơn vị/dạng vitamin khác nhau. Chỉ đếm bữa có lượng dùng >0; ngày thiếu định lượng chưa đối chiếu số bữa.
- Bảng cân đối/đóng góp dùng Times New Roman, lưới thông thường, không đóng băng; A4 ngang, ngắt trang trước hồ sơ/WHO. Fixture người lớn hai trang cân đối, một trang đóng góp; fixture trẻ em ba trang cân đối đã render/xem. Không ép ma trận 160 cột vào một trang.
- Sửa lượng/suất tính lại bảng công thức. Đổi cấu trúc ngày/bữa/món/số dòng cần xuất lại để cập nhật danh sách nhóm. Hồ sơ/WHO là snapshot khi xuất; parser tiếp tục chỉ nhập đầu vào khẩu phần/mục tiêu/mã theo hợp đồng cũ, không tự tái dựng hồ sơ từ bảng trình bày. Bảng điều kiện cần đủ hồ sơ/nguồn; không hứa tái tạo các ghi chú tùy chọn của giao diện cũ.
- Guard 400.000 ô trước tạo workbook đã gồm bảng mới, helpers và các đoạn ngày nhóm; giữ hạn 5 MB/64 MB giải nén và bảo vệ vùng nguồn. Danh sách ngày chia đoạn 15 ngày để công thức dưới giới hạn Excel.

## Kiểm chứng

- Prisma generate, TypeScript, ESLint 15 file sửa và diff check đạt. Full suite core67/report37/security89/OAuth261/storage98/HTTP352/library60/workbook/full-report/review61/clinical53/guide89/CalculatorSSR18 đạt; test phân tích cuối **56 kiểm**, gồm metadata, không mục tiêu, dữ liệu thiếu, bếp, WHO chung web, context allowlist, chuyển lựa chọn xuất một/nhiều ngày và mọi công thức cân ngoặc/dài dưới 8.192 ký tự.
- Excel native fixture bảng phân tích **28 kiểm**; hồi quy ma trận **668 kiểm**. Đổi lượng/zero/suất cập nhật, số ngày và số bữa đúng, hồ sơ/WHO phù hợp; quét toàn workbook không lỗi công thức. Không coi mock POST hoặc React SSR là kiểm thao tác trình duyệt.
- VPS trước triển khai: checkout a9f4012/app981579e healthy; RAM2.972 MB/available2.012 MB, đĩa40 GB/trống15 GB. Backup **`/opt/dinhduong-release-backups/nutrition-analysis-tables-20261016-194633-codex`** giữ image rollback, cấu hình/override/checksum và bằng chứng. App8e20d14 healthy sau build; không migration mới.
- **HTTPS82 kiểm/11 client assets**: workflow1.0.10/16tool, các đường Calculator/link tạm cũ/mới/private metadata, bundle và bốn gói khớp SHA. Guest tra công thức RNI thật hai nguyên liệu có Food VDDMA → prepare → mở/sửa lượng×1,5 → calculate/export/download; không cookie410. File hội thoại **1.619.009 byte**, không lưu tài khoản.
- Chính file hội thoại mới từ VPS mở Excel native **971 kiểm**: hai nguyên liệu×160 chỉ tiêu đối chiếu độc lập get_food theo lượng, bốn cấp tổng/đánh dấu phần thiếu đúng, lượng×2 và suất×2 tự tính; không lỗi công thức.
- Route xuất web thật200 với `saveToAccount:false`: file **1.621.525 byte**, không header bản lưu; profile trẻ em hư cấu, mục tiêu thủ công200 kcal có nhãn kiểm thử, bếp/tỷ lệ Trưa100% và mã trẻ em canonical được chọn rõ. Parser **5 kiểm** giữ đầu vào/mục tiêu/mã; Excel native **366 kiểm** giữ160 chỉ tiêu/từng thực phẩm, mục tiêu/tỷ lệ bữa/bếp, g/kg, bốn Z-score/nguồn đúng hàm chung, mã và số bữa, ngày đủ cơ sở/đạt; đổi lượng tự tính, quét toàn workbook không lỗi. PDF ba trang cân đối đã xem. Đây là fixture kỹ thuật, không là thực đơn hoặc tư vấn cho người bệnh.
- Account/User/Session/Ration/OAuth count không đổi. Token/snapshot/file tạm của lượt thử đã dọn theo khóa/tên đã biết; bốn file kỹ thuật trong backup riêng và evidence local ignore. Canonical trước/sau: 3.719 Food,7.369 Dish,41.457 DishIngredient,246 DietCode,72 NutritionRecommendation,25 migration; count và digest giữ nguyên. Env/layout/Caddy/Google checksum khớp; timer active/enabled, OOMfalse, swap build đã tắt/xóa.
- Browser không có phiên kết nối; chưa nghiệm thu click/hydration/mobile hoặc hội thoại ChatGPT/Claude/Gemini thật đợt này. Chưa kiểm trình đọc bảng tính khác Microsoft Excel. File cũ cần xuất lại.
