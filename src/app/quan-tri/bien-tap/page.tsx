import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import CatalogWorkspace from "./CatalogWorkspace";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bản nháp và duyệt dữ liệu | Dinh dưỡng 2598",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await getSessionUser();
  if (!user)
    return (
      <section className="rounded-xl border bg-white p-5">
        <h1 className="text-2xl font-semibold">Cổng biên tập dữ liệu</h1>
        <p className="my-3">
          Đăng nhập bằng tài khoản được cấp quyền biên tập.
        </p>
        <Link
          className="underline"
          href="/dang-nhap?next=%2Fquan-tri%2Fbien-tap"
        >
          Đăng nhập
        </Link>
      </section>
    );
  if (user.role !== "ADMIN" && user.role !== "EDITOR")
    return (
      <p role="alert">
        Tài khoản chưa được cấp quyền biên tập. Liên hệ quản trị viên để được
        phân quyền.
      </p>
    );
  return <CatalogWorkspace isAdmin={user.role === "ADMIN"} />;
}
