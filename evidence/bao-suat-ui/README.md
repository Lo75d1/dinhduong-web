# Bằng chứng render UI báo suất điều dưỡng

Ngày kiểm tra: **16/08/2026** (Asia/Ho_Chi_Minh)  
Nhánh: `claude/ui-bao-suat` · commit giao kiểm tra: `162e504`

## Môi trường

- App local tại `http://127.0.0.1:3103`, viewport desktop `1280 × 900`.
- PostgreSQL thử cô lập tại `127.0.0.1:55433`, database `nutrition_acceptance`.
- Đăng nhập bằng tài khoản giả `DEPARTMENT_STAFF` của nghiệm thu; không dùng dữ liệu người bệnh thật.
- Không migrate DB dùng chung, không deploy.

## Kết quả đối chiếu

- Bảng hiển thị đủ 4 cột: **Chế độ ăn · Gợi ý từ chỉ định · Số suất · Trạng thái**.
- Dòng khớp hiển thị badge `✓ khớp`.
- Nhập `1` khi gợi ý là `0`: dòng chuyển nền hổ phách và hiện badge `⚠ lệch +1`.
- Dải **Tổng suất** nền xanh nhạt cập nhật thành `1 suất`.
- Khi lệch, trường đổi thành **Ghi chú \***, placeholder yêu cầu ghi lý do và nút **Xác nhận báo suất** bị khóa khi ghi chú trống.
- Nhập lý do thử nghiệm làm nút xác nhận được mở; không bấm xác nhận nên không ghi phiếu mới vào DB.
- Không thấy vỡ bảng, tràn chữ hoặc chồng control ở viewport desktop.

![Màn báo suất điều dưỡng ở trạng thái lệch gợi ý](./01-department-staff-mismatch-desktop.png)
