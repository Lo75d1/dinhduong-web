# Kho thực đơn: một ngày, ba kho và đối chiếu khuyến nghị

Cập nhật 23/10/2026 theo yêu cầu mới. Bản sửa cục bộ; chưa đưa lên website.

## Hành vi

Ba kho điều hướng là Cá thể, Tập thể và Bệnh viện. Bệnh viện có Khuyến nghị cho người bệnh và Bếp bệnh viện. Ăn dặm / Trẻ em / Người lớn là bộ lọc chung, khớp cùng nhóm với kcal/chế độ, không phân loại bằng chữ trong tên. Dữ liệu cũ chưa có nhãn hiện Chưa phân loại. Các ID nguồn bệnh viện đã biết và unit=hospital có ánh xạ tương thích; metadata tường minh được ưu tiên.

Danh mục trả một ngày, có các bữa và món. Tìm và lọc trong PostgreSQL trước phân trang, không tải cả document vào danh mục, không nhân bản tuần thành hàng trăm hồ sơ. Nhóm kcal chọn rõ trước mở; template/day/group được giữ khi chép liên kết, tải lại và quay về. Liên kết ngày/nhóm đã bỏ báo lỗi. Ngày chỉ phục vụ trưa/xế vẫn là phạm vi các bữa đó.

## Nội dung để sử dụng

Hợp đồng MenuLibraryDraft 1.2.0 nhận thêm librarySection/hospitalUse, lifeStage/ageMonths, guidance theo nhóm, preparation theo món và availability. Nháp 1.0/1.1 vẫn mở và sửa được. Mỗi món cần hình thức chế biến, kết cấu, các bước, lưu ý chế biến/phục vụ; mỗi nhóm cần lưu ý và khuyến nghị. Độ tuổi ăn dặm ghi bằng tháng. Nội dung này có ô nhập và hiển thị cùng thực đơn ngày. Không tự điền các bước/kết cấu cho bản cũ.

Thiếu nội dung sử dụng chặn quyết định duyệt mới; không tự hủy quyết định cũ. Ngừng dùng phải có lý do, lưu bằng phiên bản mới, mặc định ẩn khỏi danh mục đang dùng; bộ lọc cho phép mở lại. Không thêm DELETE, không tự ngừng dùng/xóa 82 mẫu chưa rà. Giá tiền, ảnh, thời gian chế biến hoãn lại.

## Khuyến nghị và phần trăm

recommendationProfile của nhóm dùng hợp đồng Profile và bộ khớp KhuyenNghi đã có: tuổi, đơn vị tuổi, giới, vận động, sinh lý; cân nặng/chiều cao giữ khi được nhập. Không đoán hồ sơ từ tuổi tối thiểu/tối đa của nhóm, không chọn giới/mức vận động mặc định. Đây là hồ sơ đối chiếu của mẫu; không nhập tên/mã bệnh nhân vào kho chung.

Máy chủ đọc nutrition_recommendations hiện có, dùng lại resolveMenu/profileRecommendation và giữ snapshot dòng khớp (kể cả dòng nền sinh lý) trong phân tích/duyệt. Mốc dailyReferences hợp lệ, đúng chất/đơn vị/nguồn có thể ghi đè mốc đối chiếu tương ứng. Nguồn bảng đang có được ghi đúng KhuyenNghi/ID; không tự gắn nhãn tài liệu 2026 chưa xác minh. Khi engine dùng Mifflin thay RNI thì hiện rõ nguồn ước tính đó.

Bảng hiện tổng lượng hiện có, mốc ngày và % đáp ứng cho cả cá thể/tập thể. % = tổng một suất của các bữa đã khai báo / mốc ngày × 100; dưới 100% và trên 100% đều giữ nguyên. Nếu tổng chỉ có một phần dữ liệu thực phẩm, vẫn tính % trên phần đã biết và gắn * vào tổng và %. Không biến null thành 0, không gọi đó là tổng đầy đủ. Mốc tối đa ghi % giới hạn. Khoảng P/L/G là tỷ lệ năng lượng, không tự đổi thành một mốc gram duy nhất. Kcal thiết kế khác mốc khuyến nghị từ hồ sơ. Không dùng đạt 100% làm điều kiện duyệt.

## Lượng khi nấu

Lượng mới hoặc sửa trên web/API dùng bước 1 g/ml; máy chủ kiểm tra lại để luồng AI cũng tuân thủ. Lượng lẻ cũ chưa đổi giữ chính xác; không tự nâng từng gia vị lên 1 g. Mẻ nấu nhân số suất thực nhập trước, làm tròn lượng cân sau: 0,25 g × 100 = 25 g. Dương dưới độ chia hiện Dưới 1. Lượng mẻ không sửa số gốc dinh dưỡng/headcount hoặc tự thành lượng mua; chưa có hao hụt/hiệu suất thì chưa chốt mua.

## Xác minh

SQL/PGlite: lọc trước phân trang, cùng nhóm kcal/chế độ/tuổi, ánh xạ hai vai trò bệnh viện, trạng thái ngừng dùng, literal search, duyệt đúng revision. DOM: đúng ba kho, bộ lọc dùng chung, ngày/nhóm/liên kết, các bước và lưu ý, lưu danh sách bước, tổng 250 mg / 1000 mg = 25% có dấu * khi nguồn còn thiếu; giữ lượng 0,25, mẻ 100 suất và chặn sửa lẻ. Kiểm thử nội dung/engine dùng dữ liệu tổng hợp, không chứng minh tính phù hợp lâm sàng của kho thật.

Không chạy migration hoặc thay Food/Dish; không ghi lại thực đơn thật hay tự duyệt. Cloud Browser trước đó không truy cập được cổng localhost của môi trường thực thi; chưa nghiệm thu ảnh desktop/mobile của bản mới. Kết quả build/test cuối ghi tại PROJECT_STATUS.md. Bước xuất bản lên GitHub công khai trước đó bị automatic approval review từ chối do chưa có ủy quyền cụ thể; không dùng đường ghi khác để vượt chặn.
