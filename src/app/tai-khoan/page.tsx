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
  searchParams: Promise<{ section?: string; focus?: string }>;
}) {
  const {section,focus} = await searchParams;
  if (!(await getSessionUser()))
    redirect(
      `/dang-nhap?next=${encodeURIComponent(section === "connections" ? `/tai-khoan?section=connections${focus==="api-token"?"&focus=api-token#api-token":"#ket-noi-thu-cong"}` : "/tai-khoan")}`,
    );
  const data = await accountSnapshot().catch(error => {
    // Diagnose server-render-only failures without logging messages, queries or credentials.
    const cause=error&&typeof error==="object"&&"cause" in error&&error.cause&&typeof error.cause==="object"?error.cause as Record<string,unknown>:{};
    const safe=(value:unknown)=>typeof value==="string"&&/^[A-Za-z0-9_]{1,40}$/.test(value)?value:undefined;
    console.error("ACCOUNT_SNAPSHOT_FAILED", {name:error instanceof Error?error.name:"unknown",kind:safe(cause.kind),code:safe(cause.originalCode??cause.code)});
    return null;
  });
  if (!data) {
    return (
      <section className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-semibold text-[var(--brand)]">
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
