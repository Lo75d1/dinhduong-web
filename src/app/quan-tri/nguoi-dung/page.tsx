import UserManager from "./UserManager";
import type { UserList } from "./UserManager";
import { getSessionUser } from "@/lib/auth";
import { listAccountUsers } from "@/lib/account-management";
import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Người dùng & phân quyền | Dinh dưỡng 2598",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=%2Fquan-tri%2Fnguoi-dung");
  if (user.role !== "ADMIN")
    return (
      <section className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">
          Bạn không có quyền quản trị người dùng
        </h1>
        <a href="/tai-khoan" className="mt-4 inline-block underline">
          Về tài khoản của tôi
        </a>
      </section>
    );
  const initial = await listAccountUsers(
    new Request(`${getNutritionPublicUrl()}/api/admin/users`),
  )
    .then(async (response) => (await response.json()) as UserList)
    .catch(() => null);
  if (!initial)
    return <p role="alert">Chưa tải được người dùng. Vui lòng thử lại sau.</p>;
  return <UserManager initial={initial} />;
}
