# Reference data — Dinh dưỡng 2598

Thư mục này chứa snapshot UTF-8, có version trong Git, của dữ liệu dinh dưỡng nền.
Mỗi file JSON Lines có một record trên mỗi dòng và được sắp xếp theo `id` để diff ổn định.

Các bảng được xuất: `foods`, `food_aliases`, `dishes`, `dish_ingredients`,
`nutrition_recommendations`, `diet_codes`, `child_growth_standards`.

Không chứa bệnh nhân, báo suất, chỉ định, tài khoản, phiên đăng nhập, audit log, token,
secret hoặc dữ liệu vận hành khác.

## Lệnh

```bash
# Chỉ đọc database nguồn và tạo lại dataset
npm run reference:export

# Chỉ seed database mới/rỗng; lệnh dừng nếu bất kỳ bảng nền nào đã có dữ liệu
npm run seed

# So count và SHA-256 từng bảng trong database với manifest
npm run reference:verify
```

Luồng dựng VPS mới: chạy migration trước, sau đó `npm run seed`. Không chạy importer
trên database production đang có dữ liệu.
