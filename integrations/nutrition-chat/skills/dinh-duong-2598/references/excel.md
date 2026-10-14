# Excel làm việc và nhập lại

- Tải link do `export_workbook` trả. File chứa đầu vào, dữ liệu cần tra, công thức tổng hợp và phần phân tích; link tải chỉ có thời hạn.
- Hướng dẫn sửa trong vùng nhập được đánh dấu: lượng, số suất, ngày/bữa và thực phẩm đã có trong dữ liệu nhúng. Mã được chọn phải đi cùng nguồn; không sửa riêng tên để biến một thực phẩm thành thực phẩm khác.
- Kết quả công thức/biểu đồ cập nhật khi Excel tính lại. Ứng dụng mở file khác Excel cần được kiểm tra riêng; không hứa mọi trình xem hỗ trợ đầy đủ.
- Dữ liệu nguồn thiếu vẫn thiếu; dữ liệu tự nhập phải có nguồn và đơn vị. Các ô có công thức được bảo vệ chống sửa nhầm; bảo vệ sheet không phải mã hóa file.
- Nhận xét AI ghi lúc xuất chỉ là nhận xét tại thời điểm đó. Sau khi sửa đầu vào, tính lại trên hệ thống nếu cần nhận xét mới.
- File trên máy không tự đồng bộ. Người dùng chỉ cần gửi bản cuối khi muốn lưu hoặc tính lại bằng dữ liệu server.
- Nhập lại dùng trang `https://dinhduong2598.food/ket-noi-ai` hoặc REST `POST /api/nutrition/v1/import`, multipart trường `file`; cần đăng nhập/cấp quyền. Không gửi URL file bất kỳ cho server tải.
- Server đọc vùng đầu vào được hỗ trợ, bỏ qua số tổng có sẵn và không chạy macro/công thức file tải lên. Preview cho người dùng xem phần thay đổi trước khi gọi `prepare_menu`, xác nhận, tính/lưu.
- Nếu sửa số hoặc cơ sở phần của nguyên liệu tự nhập, server đổi nguồn thành số người dùng điều chỉnh và bỏ xác nhận cũ. Cho người dùng xem các số/đơn vị/nguồn rồi xác nhận nguồn rõ trước khi chuẩn bị lại; không tự đặt confirmed=true từ việc họ tải file lên. Trang nhập có nút xác nhận số đã sửa riêng và yêu cầu chốt toàn bản lần cuối.
