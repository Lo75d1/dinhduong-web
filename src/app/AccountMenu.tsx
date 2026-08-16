import { getSessionUser } from "@/lib/auth";
import AccountMenuClient from "./AccountMenuClient";
import { dietOrdersEnabled } from "@/lib/feature-flags";

// Server component: đọc phiên đăng nhập ngay trên máy chủ nên trạng thái hiển thị
// đúng ở lần render đầu tiên (không còn cảnh "phải tải lại trang mới hiện tên").
// Phần tương tác (popup kiểu Google) nằm ở AccountMenuClient.
export default async function AccountMenu() {
  // Nếu CSDL tạm lỗi thì chỉ hiện nút "Đăng nhập" thay vì làm sập cả layout.
  const user = await getSessionUser().catch(() => null);
  return <AccountMenuClient user={user} enableDietOrders={dietOrdersEnabled()} />;
}
