# Nguồn và quy đổi

## Ngoài kho

| Trường hợp | Cách nhập và trình bày |
| --- | --- |
| Có nhãn/tài liệu | `customFood` với nguồn `label` hoặc `document`, tên nguồn, URL nếu có, cơ sở 100 g/100 ml/một phần; chỉ nhập chất có số và đơn vị xác minh được. |
| Có bản ghi tham chiếu | Dùng Food ID tham chiếu, giữ `actualFoodName`, `estimateAccepted: true` sau khi người dùng đồng ý, ghi rõ thực phẩm tham chiếu và lý do trong `note`. |
| Công thức thực tế của người dùng | Nguồn công thức `user`; nguồn dinh dưỡng vẫn riêng cho mỗi nguyên liệu. Công thức người dùng không tự tạo số dinh dưỡng. |
| Không đủ số | `customFood.source.kind: "unknown"`; các chất `null`. Giữ nguyên liệu trong bản nháp và giải thích tổng chỉ tính phần có dữ liệu. |

- Không đăng nguyên liệu tự nhập vào kho chung. Nó thuộc bản cá nhân và mang ID riêng trong đầu vào.
- Xác nhận sự phù hợp của nguồn: thương hiệu/phiên bản, sống hay chín, ăn được hay mua vào, cơ sở khối lượng. Không ghép số của hai nguồn khác đơn vị mà không giải thích.
- Số 0 chỉ dùng khi nguồn thực sự công bố 0. Thiếu trên nhãn không có nghĩa là không chứa chất đó.
- Nguồn công thức và nguồn dinh dưỡng là hai việc riêng. Với món đã tách nguyên liệu, chỉ cộng các nguyên liệu; không cộng thêm giá trị món gốc.

## Khối lượng

- `quantity × servings` là lượng thực dùng. Hỏi lại khi người dùng nói tổng lượng cho cả nhóm để tránh nhân số suất hai lần.
- `edible`: lượng ăn được theo trạng thái của bản ghi. `raw`: lượng nguyên liệu trước thải bỏ. `cooked`: cần tỷ lệ quy đổi có nguồn phù hợp, đặc biệt nếu Food ID là nguyên liệu sống.
- Chất lỏng có dữ liệu /100 ml có thể tính theo ml. Đổi sang gram cần `densityGPerMl` và `densitySource`.
- `conversionFactor` phải kèm `conversionSource`; không dùng một tỷ lệ chung cho mọi món. Hao hụt chưa có dữ liệu giữ thiếu và hỏi lại.
