# Hướng dẫn lập thực đơn RNI và đổi món — 17/10/2026

## Thay đổi

- Ưu tiên tìm món RNI có sẵn phù hợp qua search_dishes/get_dish; kiểm nguồn và thành phần thật. Dị ứng, chỉ định, khả năng ăn và điều kiện người dùng ưu tiên hơn độ đa dạng hoặc nguồn RNI.
- Lập khung toàn kỳ, theo dõi nền bữa sáng, món đạm, rau và cách nấu trước khi chuẩn bị bản duyệt. Mặc định thực đơn7ngày thông thường: cùng món/nền bữa sáng không quá2lần mỗi7ngày liên tiếp, tránh liền ngày. Khoai luộc/hấp/nướng vẫn cùng nền khoai. Cơm trắng trưa/tối có thể lặp theo thói quen; đổi món đạm/rau và cách chế biến.
- Đây là tiêu chí sản phẩm từ phản hồi của chủ dự án, không phải ngưỡng y khoa/WHO. Cho ngoại lệ đã thống nhất theo sở thích, chuẩn bị sẵn, ngân sách hoặc chế độ chuyên biệt; không đổi món người dùng đã chọn và không sửa lịch sử khẩu phần24giờ.
- Khi được giao lập thực đơn, AI chủ động đề xuất một phương án có lý do từ dữ liệu thật, không hỏi chọn3–5món cho mọi bữa. Còn mơ hồ/ảnh hưởng an toàn hoặc người dùng muốn chọn thì trình ứng viên để phân biệt.
- Công thức AI cần lý do, cách nấu, nguyên liệu/lượng thực tế và nguồn Food thật. Không ghép đồ ăn hoặc tăng lượng vô lý chỉ để khớp kcal. Co giãn toàn công thức cùng tỷ lệ giữ RNI; thay nguyên liệu/cách nấu do AI đề xuất phải ghi biến thể kind=ai, giữ dishId gốc nếu có và phần thay. Không giả RNI/dinh dưỡng/hệ số hoặc tự coi một công thức nguồn là một suất.
- Bảng khung ngày × bữa hỗ trợ nhìn độ đa dạng; vẫn phải trình review.text từng nguyên liệu/lượng/số suất sau prepare và chờ duyệt trước tính. Không gọi một khung đã đa dạng là đã đạt nhu cầu khi chưa có số hệ thống.

## Đồng bộ

Nguồn chung: `src/lib/nutrition-chat/menu-planning-guide.json`. Hướng dẫn đầy đủ được ghép vào get_workflow.menuGuidance và TXT; bản tóm tắt nằm trong hai lời nhắn sao chép. Script đóng gói sinh references/lap-thuc-don.md từ cùng nguồn, đưa vào ZIP plugin/skill và MCP resource kèm digest. Skill chính dẫn thẳng đến tài liệu này; bước tiếp theo của tìm/đọc món nhắc quy trình lập khung, đọc công thức và rà độ lặp. Phiên bản gói/hướng dẫn1.0.13.

Tham khảo nguyên tắc chung: [WHO Healthy diet, 26/01/2026](https://www.who.int/news-room/fact-sheets/detail/healthy-diet), các mục Overview/Foods: đa dạng trong và giữa nhóm thực phẩm, phù hợp đặc điểm cá nhân, văn hóa và thực phẩm địa phương. Nguồn này không quy định quy tắc lặp bữa sáng2lần/tuần của sản phẩm.

## Kiểm tra và giới hạn

- Kiểm lời nhắn chính/bản đầy đủ, TXT, workflow và MCP đều nhận đúng nguồn chung; ZIP plugin/skill có cùng tham chiếu; digest resource đúng. Kiểm get_workflow cho khách và công khai vẫn vừa ngân sách trả cả nội dung và structuredContent, không tăng giới hạn để nhét hướng dẫn.
- TypeScript/ESLint và quick_validate skill đạt. Test guide/package125 kiểm, core115 kiểm, review63 kiểm, HTTP425 kiểm cả discovery/resource/luồng chuẩn bị và xác nhận bằng fixture. Điều chỉnh assertion bảo vệ sheet cũ trong test review cho đúng yêu cầu bỏ khóa Excel đã làm trước đó; không đổi bộ xuất ở đợt này.
- Thử chuyển giao skill trên ngữ cảnh mới, offline với danh mục giả lập: khung7ngày luân phiên cháo/bánh mì/phở-bún/cơm, không lặp liền ngày hoặc quá2lần một nền bữa sáng. Nhận ra thiếu nguồn cơm riêng ở các bữa còn thiếu tinh bột, không tự giả ID hoặc tuyên bố đã tính. Đây là phép thử đọc hướng dẫn/dựng khung với dữ liệu giả, không phải thực đơn dùng cho người bệnh hoặc nghiệm thu ChatGPT/Claude thật.
- Phép thử ngữ cảnh mới riêng cho3ngày đã ăn sáng khoai giống nhau: giữ đúng150g từng ngày, không đổi lịch sử để đạt tiêu chí đa dạng; hỏi tiếp loại khoai/cơ sở cân, đồ ăn/uống kèm và các bữa chưa kể, chưa tính/lưu.
- Đây là cập nhật hướng dẫn AI, không thêm bộ tối ưu thực đơn, rào chặn món lặp hoặc chứng nhận phù hợp lâm sàng trên server. Chưa sửa lỗi tải Excel cụ thể của bản người dùng; đang chờ link chia sẻ có quyền mở để tái hiện. Chưa triển khai VPS trong lượt này, không migration/seed/reset hoặc sửa kho Food/Dish.
