import { redirect } from "next/navigation";
import { menuLibraryAccess } from "@/lib/menu-library/access";
import LibraryWorkspace from "./LibraryWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kho mẫu thực đơn | Quản trị Dinh dưỡng 2598", robots: { index: false, follow: false } };

export default async function Page() {
  const access = await menuLibraryAccess();
  if (!access.allowed) {
    if (access.status === 401) redirect("/dang-nhap?next=%2Fquan-tri%2Fkho-thuc-don");
    return <section className="mx-auto max-w-xl rounded-xl border border-[#c3d3cb] bg-white p-6"><h1 className="text-2xl font-semibold">{access.status === 403 ? "Bạn không có quyền quản trị" : "Chưa kiểm tra được phiên đăng nhập"}</h1><p role="alert" className="mt-3">{access.error}</p><a href="/tai-khoan" className="mt-4 inline-block underline">Về tài khoản</a></section>;
  }
  return <LibraryWorkspace />;
}
