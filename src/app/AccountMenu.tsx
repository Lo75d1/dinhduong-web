import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

// Server component: đọc phiên đăng nhập ngay trên máy chủ nên tên tài khoản hiển
// thị đúng ở lần render đầu tiên (không còn cảnh "phải tải lại trang mới hiện
// tên"). Sau khi đăng nhập, LoginForm gọi router.refresh() để layout render lại
// và menu này cập nhật theo.
export default async function AccountMenu() {
  // Nếu CSDL tạm lỗi thì chỉ hiện nút "Đăng nhập" thay vì làm sập cả layout.
  const user = await getSessionUser().catch(() => null);
  if (!user)
    return (
      <Link
        href="/dang-nhap"
        className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-[#123c36] hover:bg-[#edf4f0]"
      >
        Đăng nhập
      </Link>
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/tai-khoan"
        className="rounded-md border border-[#123c36] bg-[#edf4f0] px-3 py-2 text-[#123c36]"
      >
        <span className="block max-w-32 truncate">{user.displayName}</span>
        <span className="block text-[10px] font-normal">
          {user.role === "ADMIN"
            ? "Quản trị viên"
            : user.role === "EDITOR"
              ? "Biên tập dữ liệu"
              : "Tài khoản cá nhân"}
        </span>
      </Link>
      {user.role === "ADMIN" && (
        <Link href="/quan-tri" className="rounded-md bg-[#123c36] px-3 py-2 text-white">
          Quản trị
        </Link>
      )}
    </div>
  );
}
