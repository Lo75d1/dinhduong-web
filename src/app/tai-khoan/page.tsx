import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { accountSnapshot } from "@/lib/account-management";
import AccountSettings, { type AccountData } from "./AccountSettings";
export const metadata = {
  title: "Tài khoản của tôi | Dinh dưỡng 2598",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const section = (await searchParams).section;
  if (!(await getSessionUser()))
    redirect(
      `/dang-nhap?next=${encodeURIComponent(section === "connections" ? "/tai-khoan?section=connections#ket-noi-thu-cong" : "/tai-khoan")}`,
    );
  const data = await accountSnapshot().catch(() => null);
  if (!data) {
    return (
      <section className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-semibold text-[#123c36]">
          Tài khoản của tôi
        </h1>
        <p role="alert" className="mt-4">
          Chưa thể tải cài đặt tài khoản. Vui lòng tải lại trang sau ít phút.
        </p>
        <a href="/tai-khoan" className="mt-4 inline-block underline">
          Thử lại
        </a>
      </section>
    );
  }
  return (
    <AccountSettings
      initial={JSON.parse(JSON.stringify(data)) as AccountData}
      initialTab={section}
    />
  );
}
