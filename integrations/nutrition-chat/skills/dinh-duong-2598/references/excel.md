# Excel làm việc và nhập lại

- Kết quả chính là số bộ tính và link bản riêng trên web sau khi người dùng chọn lưu. Không cần tạo/tải Excel để xem hoặc tính; chỉ xuất khi cần file. Web tự tính theo nguồn hiện tại và cho chỉnh/lưu dùng lại.
- Bản hỏi ghi có `Phieu 24h` và `Quy doi 24h` theo Phụ lục 1/2 mục 11 QĐ 2598/QĐ-BYT. Chỉ số có cơ sở sống sạch mới vào bảng quy đổi; món VDD cả món không tự có nguyên liệu sống sạch. Bảng phân tích vẫn gồm toàn bộ đầu vào.
- Dấu `*` ở trước mọi số AI tự điền là định dạng, ô vẫn là số/công thức. Nhập lại bỏ dấu xuất xứ AI của giá trị đã bị người dùng đổi; thông tin nguồn vẫn giữ để đối soát.
- Tải link do `export_workbook` trả. File chứa đầu vào, dữ liệu cần tra, công thức tổng hợp và phần phân tích; link tải chỉ có thời hạn.
- Hướng dẫn sửa trong vùng nhập được đánh dấu: lượng, số suất, ngày/bữa và thực phẩm đã có trong dữ liệu nhúng. Mã được chọn phải đi cùng nguồn; không sửa riêng tên để biến một thực phẩm thành thực phẩm khác.
- Kết quả công thức/biểu đồ cập nhật khi Excel tính lại. Ứng dụng mở file khác Excel cần được kiểm tra riêng; không hứa mọi trình xem hỗ trợ đầy đủ.
- Dữ liệu nguồn thiếu vẫn thiếu; dữ liệu tự nhập phải có nguồn và đơn vị. Các ô có công thức được bảo vệ chống sửa nhầm; bảo vệ sheet không phải mã hóa file.
- Nhận xét AI ghi lúc xuất chỉ là nhận xét tại thời điểm đó. Sau khi sửa đầu vào, tính lại trên hệ thống nếu cần nhận xét mới.
- File trên máy không tự đồng bộ. Người dùng chỉ cần gửi bản cuối khi muốn lưu hoặc tính lại bằng dữ liệu server.
- Mã và dữ kiện `clinicalContext` giữ theo bản đã xuất; chỉnh mã/tình trạng trên web/chat rồi duyệt lại. Sheet Bao cao có phần đối chiếu khoảng MCDA, liên kết sáu chỉ tiêu dinh dưỡng từ bộ tính; số bữa tham khảo và ghi chú nguồn trình riêng. Nhập lại đọc lại mã từ kho, không tin khoảng hoặc kết luận có sẵn trong file. Không tự đổi đơn vị nước chưa xác minh hoặc coi mức theo kg là mục tiêu cá nhân.
- Nhập lại dùng trang `https://dinhduong2598.food/ket-noi-ai` hoặc REST `POST /api/nutrition/v1/import`, multipart trường `file`; cần đăng nhập/cấp quyền. Không gửi URL file bất kỳ cho server tải.
- Server đọc vùng đầu vào được hỗ trợ, bỏ qua số tổng có sẵn và không chạy macro/công thức file tải lên. Preview cho người dùng xem phần thay đổi trước khi gọi `prepare_menu`, xác nhận, tính/lưu.
- Nếu sửa số hoặc cơ sở phần của nguyên liệu tự nhập, server đổi nguồn thành số người dùng điều chỉnh và bỏ xác nhận cũ. Cho người dùng xem các số/đơn vị/nguồn rồi xác nhận nguồn rõ trước khi chuẩn bị lại; không tự đặt confirmed=true từ việc họ tải file lên. Trang nhập có nút xác nhận số đã sửa riêng và yêu cầu chốt toàn bản lần cuối.
