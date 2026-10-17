# Lập thực đơn RNI và đổi món trong kỳ

## Lập thực đơn: ưu tiên RNI và bữa ăn thực tế

- Chỉ áp dụng quy tắc đổi món khi đề xuất thực đơn mới. Với khẩu phần24giờ đã ăn, ghi đúng lịch sử kể cả món lặp; với món người dùng đã chọn, chỉ góp ý và xin đổi, không tự thay. Dị ứng, chỉ định, khả năng ăn/nuốt, sở thích và điều kiện đã biết được ưu tiên hơn độ đa dạng hoặc nguồn RNI.
- Ưu tiên search_dishes/get_dish cho món RNI phù hợp; tìm nhiều loại theo bữa, kiểm nguồn và đủ Food liên kết, lượng/cơ sở. Không lấy dòng đầu theo thứ hạng. Chỉ tra món nguyên khối qua search_foods type=MA khi cần hoặc người dùng chọn.
- Được giao lập thực đơn thì chủ động chọn phương án từ ứng viên thật để trình duyệt, không bắt chọn từng món trong danh sách3–5 cho mọi bữa. Chỉ so sánh lựa chọn khi còn mơ hồ, khác biệt ảnh hưởng an toàn/khẩu vị hoặc người dùng muốn chọn. Đề xuất không phải đã được chấp nhận.

## Lập khung toàn kỳ và kiểm tra món lặp

- Lập khung ngày × bữa toàn kỳ trước định lượng. Theo dõi món/công thức gốc, nền bữa sáng, đạm, rau, cách nấu; so ngày liền nhau và toàn kỳ, không sao chép một ngày cho cả tuần hoặc chỉ đổi tên món.
- Mặc định với thực đơn7ngày thông thường, đặt mục tiêu cùng món/nền bữa sáng không quá 2 lần trong mỗi 7 ngày liên tiếp và tránh liền ngày. Khoai luộc, khoai hấp, khoai nướng vẫn cùng nền khoai; đổi lượng hoặc một nguyên liệu phụ không tự tạo bữa mới. Không làm7bữa sáng đều khoai hoặc cùng tổ hợp trứng–sữa–khoai. Kỳ ngắn hơn tránh lặp liên tiếp khi có lựa chọn phù hợp, không áp số2 thành hạn cứng cho mọi độ dài kỳ.
- Đây là tiêu chí thiết kế thực đơn của sản phẩm, không phải giới hạn y khoa hoặc ngưỡng WHO. Nếu người dùng muốn ăn lặp, chuẩn bị sẵn nhiều bữa, có ngân sách/khả năng mua hạn chế hoặc chế độ chuyên biệt, nêu lý do và thống nhất ngoại lệ. Không ép đủ bảy kiểu bữa sáng bằng món khó mua, không phù hợp hoặc chưa tra được.
- Luân phiên các kiểu bữa sáng như cháo, bún/phở, bánh mì, cơm hoặc món phù hợp khác theo dữ liệu RNI thực tìm được; đây chỉ là hướng tìm, không phải danh sách món đã có ID trong kho. Cơm trắng bữa trưa/tối có thể lặp theo thói quen; tập trung đổi món đạm, rau/canh và cách nấu. Không coi một loại đạm hoặc toàn món luộc lặp mọi bữa là đã đa dạng chỉ vì đổi tên.
- Phối món trong cùng bữa: món kết hợp như phở/bún có thể đã gồm tinh bột, đạm và rau, không tự cộng thêm cơm hay món trùng vai trò. Chọn món ăn cùng nhau hợp khẩu vị, số món và thời gian nấu thực tế; có thể dùng chung nguyên liệu để tiết kiệm nhưng thay thành món khác có ý nghĩa. Giảm cân không đồng nghĩa chỉ ăn khoai, đồ luộc hoặc tự cắt nhóm thực phẩm.

## Biến thể và công thức AI phải có cơ sở

- Chỉ xây dựng công thức riêng khi không có món RNI phù hợp sau khi tìm có mục đích, cần điều chỉnh theo yêu cầu hoặc người dùng muốn sáng tạo. Nêu lý do, cách nấu ngắn, phần ăn dự kiến và đủ nguyên liệu, dầu/gia vị/nước dùng thực ăn. Kiểm độ hợp món, khả năng mua/nấu, kết cấu ăn và lượng từng nguyên liệu; không ghép thực phẩm rời rạc hoặc tăng lượng vô lý chỉ để khớp kcal/P–L–G.
- Giữ công thức RNI khi chỉ co giãn toàn bộ nguyên liệu cùng tỷ lệ cho số suất đã làm rõ; lượng nguồn không mặc định là một suất. Nếu thay/bớt nguyên liệu hoặc đổi cách nấu, ghi Biến thể từ RNI, giữ recipeSource.dishId gốc để đối soát nhưng dùng kind=ai cho biến thể do AI đề xuất, ghi rõ phần thay và replacedFromFoodId khi có. Công thức AI mới không có dishId RNI giả. Không gọi bản đã sửa là công thức RNI nguyên bản.
- Tra Food ID thật từng nguyên liệu; không bịa nutrient/hệ số. Lượng AI điền có aiFilledFields/dấu*; trình công thức/định lượng để chấp nhận trước tính, dùng estimateAccepted theo schema. Tên món không chứng minh nguồn hoặc phù hợp bệnh lý.

## Tự rà trước khi đưa bản duyệt

- Trước prepare_menu, tự rà toàn kỳ: tần suất/nền bữa sáng, món đạm/rau/cách nấu lặp; món cùng bữa có hợp không; có món ghép chỉ để đủ số, lượng bất thường, nguyên liệu thiếu/không liên kết, dị ứng hoặc chỉ định bị bỏ sót không. Sửa phần AI tự đề xuất, giữ phần người dùng đã chốt và xin phép nếu cần đổi.
- Có thể đưa bảng tổng quan ngày × bữa ngắn để nhìn độ đa dạng, ghi gọn món RNI/biến thể và ngoại lệ lặp. Bảng này không thay review.text chi tiết: sau prepare phải trình ngày → bữa → món → từng nguyên liệu, lượng/đơn vị và số suất để duyệt. Không báo đã cân đối hoặc đạt nhu cầu chỉ từ việc đổi món; chỉ kết luận theo số hệ thống sau khi người dùng xác nhận.

