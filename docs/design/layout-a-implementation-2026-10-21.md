# Kho mẫu — triển khai phương án A

Người dùng chọn A sau khi xem hai prototype. Mã nguồn chuyển kho mẫu sang danh sách,
không dùng bảng ngày/bữa theo đơn vị của B. Người dùng đã cho phép chuyển giao lên `Lo75d1/dinhduong-web`; chưa triển khai VPS.

## Kết quả

- Tiêu đề rõ, lối Thêm qua AI xám than mở trang ủy quyền thật. Tìm/lọc lên trước, trợ giúp thu gọn sau danh sách.
- Mỗi hàng có tên mẫu, đơn vị/nhánh, số ngày/nhóm, các nhãn bữa, revision và ngày cập nhật. Một nút Xem ở cuối; chép liên kết chuyển vào chi tiết.
- Desktop dùng các cột thẳng hàng, mobile chuyển thành hàng nhiều dòng, giữ đủ trường dữ liệu. Header kho mẫu thu gọn trên mobile, mọi lối điều hướng vẫn trong Menu, Escape và focus giữ như cũ.
- Xem chi tiết riêng, giữ ngày/bữa/nhóm, bảng nguyên liệu sống sạch, null khác 0, lịch sử và lưu ý. Quay lại giữ vị trí cuộn và focus về hàng đã chọn.
- Tìm tự chạy sau 250ms ngừng gõ; Enter/nút tìm vẫn dùng được. Tải lại, không có kết quả, kho trống, tải lỗi/thử lại và lỗi mở mẫu có trạng thái riêng; lỗi tải giữ danh sách tốt gần nhất.

## Phần đọc API

`listMenuTemplates` bổ sung unitLabel/dayCount/groupCount/mealLabels. Chỉ đọc một trang
20 bản và một bản để xác định còn trang sau (tối đa 21 document ở server); trả tóm tắt,
không gửi document, nguyên liệu hay mục tiêu của từng mẫu trong danh sách. Có thể tiếp tục
chiếu trực tiếp JSON tại DB nếu sau này số bản lớn và profiling cho thấy cần thiết.

Tìm tên mẫu hoặc nhãn đơn vị bằng Prisma, không phân biệt hoa/thường và bỏ khoảng trắng
đầu/cuối. Cả tìm kiếm và nhánh áp dụng trước phân trang. Bản thật chưa bảo đảm tìm không dấu
như hàm tìm cục bộ của prototype. Không thay quyền Admin/OAuth, ghi mẫu, engine hoặc migration.
Không thêm các mẫu minh họa vào dữ liệu thật.

## Kiểm tra

- Next.js production build/TypeScript đạt sau khi chuyển cache Turbopack cũ ra ngoài. Cache lưu trên môi trường cục bộ có lỗi đọc persistence `invalid digit`; không sửa next.config hoặc cấu hình Docker/VPS vì lỗi cache này.
- ESLint tệp sửa, `git diff --check`: đạt.
- 153 kiểm tra kho mẫu về nguồn/hướng dẫn/UI/quyền đạt; 107 kiểm tra ghi/ủy quyền/CSRF/MCP và tìm/phân trang trên PGlite đạt. Fixture adapter bổ sung JSON path string filter; không coi đây là kiểm trực tiếp Prisma với DB production.
- Chromium 110 kiểm tra RootLayout, menu, danh sách và chi tiết thật tại 1440/768/390/320px với API/phiên fixture: tìm đơn vị, lọc, phân trang, mở/chép, 60→70g theo ngày, 120/null/0 theo nhóm, quay lại/cuộn/focus, lỗi/thử lại, kho trống; không lỗi JS/tràn ngang. Header luôn dưới 85px ở bốn cỡ. Hàng đầu khoảng 345/351/267/267px theo từng cỡ; không phải nghiên cứu thời gian tác vụ.
- 89 kiểm tra trình duyệt trang chủ/điều hướng công khai/bàn phím/role/focus mode/giảm chuyển động đạt sau thay đổi header được giới hạn cho kho mẫu.
- HTTP Next cục bộ: trang kho mẫu trả 307 đăng nhập; ba API templates/catalog/guide trả 401 cho khách. Health trả 503 khi kết nối DB ở môi trường cục bộ không sẵn sàng; không tuyên bố readiness production từ build hoặc fixture.
- Không truy cập phiên Admin hay triển khai VPS trong đợt này. Cần chạy kiểm tra với dữ liệu/phiên thật sau khi đưa bản đã duyệt lên máy chủ.

Ảnh Chromium với dữ liệu minh họa: `previews/kho-mau-a-implemented-1440.png`,
`previews/kho-mau-a-implemented-768.png`, `previews/kho-mau-a-implemented-390.png`,
`previews/kho-mau-a-implemented-320.png`. Biên bản máy: `previews/layout-a-checks.json`.

## Chuyển giao

Mã nguồn hoàn tất, người dùng đã xác nhận cho phép đẩy bản A và các tệp thiết kế/bối cảnh
sản phẩm lên `Lo75d1/dinhduong-web` ngày 21/10/2026, sau yêu cầu xác nhận của auto-review.
Chuyển giao qua nhánh `codex/ui-navigation-refresh`/PR#9, chưa triển khai VPS.
Auto-review tiếp tục chặn riêng PROJECT_STATUS.md do nội dung vận hành; tệp này giữ nguyên
phiên bản trên GitHub và không nằm trong phần cập nhật được đẩy. Bản chuyển giao gồm mã nguồn,
tài liệu thiết kế, ảnh và bằng chứng kiểm tra; lịch sử commit cục bộ chứa ghi chú vận hành không được đẩy.

`previews/layout-a-runtime.zip` là bản vá mã chạy/test so với nền `66be614`, không chứa
hai prototype hoặc tài liệu bối cảnh PRODUCT/DESIGN. Tệp dành để xem và chuyển giao cho chủ dự án;
không phải bằng chứng đã cập nhật remote, áp migration hoặc triển khai máy chủ.
