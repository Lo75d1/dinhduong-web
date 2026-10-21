import { nutritionConsentPageData } from "@/lib/nutrition-chat/oauth";
import { NutritionSecurityError } from "@/lib/nutrition-chat/security";
import LoginForConsent from "./LoginForConsent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Xác nhận kết nối AI | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };

const descriptions: Record<string, string> = {
  "nutrition:read": "Tra cứu kho chung, thư viện thực phẩm/món riêng và mở các bản khẩu phần của bạn.",
  "nutrition:calculate": "Kiểm tra bản nháp và tính dinh dưỡng từ đầu vào bạn cung cấp.",
  "nutrition:write": "Lưu hoặc cập nhật bản khẩu phần cá nhân sau khi bạn chốt đầu vào.",
  "nutrition:export": "Xuất Excel chỉnh được và xem trước file Excel được gửi lại.",
};

export default async function NutritionAuthorizePage() {
  let data;
  try { data = await nutritionConsentPageData(); }
  catch (error) {
    return <section className="mx-auto max-w-xl rounded-xl border border-[var(--control-line)] bg-white p-6">
      <h1 className="text-2xl font-semibold text-[var(--brand)]">Chưa thể xác nhận kết nối</h1>
      <p role="alert" className="mt-4 text-neutral-800">{error instanceof NutritionSecurityError ? error.description : "Hệ thống tạm thời chưa sẵn sàng. Vui lòng thử lại sau."}</p>
      <a href="/ket-noi-ai" className="mt-5 inline-block font-semibold text-[var(--brand)] underline">Xem hướng dẫn kết nối</a>
    </section>;
  }
  const { client, interaction, user, csrf } = data;
  return <section className="mx-auto max-w-xl rounded-xl border-2 border-[var(--brand)] bg-white p-6 sm:p-8">
    <p className="text-xs font-semibold tracking-widest text-[var(--brand)]">DINH DƯỠNG 2598</p>
    <h1 className="mt-2 text-2xl font-semibold text-[var(--brand)]">{user ? "Xác nhận quyền kết nối AI" : "Đăng nhập để kết nối AI"}</h1>
    <p className="mt-3 text-neutral-800">Ứng dụng <strong>{client.name}</strong> đang yêu cầu kết nối.</p>
    <p className="mt-2 break-all text-sm text-neutral-700">Địa chỉ nhận kết nối: <strong>{new URL(interaction.redirectUri).hostname}</strong></p>
    <p className="mt-2 text-sm text-neutral-600">Tên ứng dụng là thông tin ứng dụng tự đăng ký. Hãy kiểm tra đúng ứng dụng bạn vừa mở.</p>
    {!user ? <LoginForConsent /> : <>
      <p className="mt-5 rounded bg-[#edf4ef] p-3 text-sm">Tài khoản cấp quyền: <strong>{user.displayName}</strong> ({user.email}).</p>
      <ul className="mt-5 list-disc space-y-3 pl-5 text-neutral-900">{interaction.scopes.map(scope => <li key={scope}>{descriptions[scope]}</li>)}</ul>
      <p className="mt-5 text-sm text-neutral-700">Ứng dụng truy cập dữ liệu trong phạm vi bạn cấp. Quyền này không cho phép sửa kho thực phẩm hoặc dùng chức năng quản trị.</p>
      <form action="/api/nutrition/v1/oauth/authorize" method="post" className="mt-6 flex flex-wrap gap-3">
        <input type="hidden" name="csrf" value={csrf!} />
        <button type="submit" name="decision" value="approve" className="rounded bg-[var(--brand)] px-5 py-3 font-semibold text-white">Đồng ý kết nối</button>
        <button type="submit" name="decision" value="deny" className="rounded border border-[var(--control-line)] px-5 py-3 font-semibold text-[var(--brand)]">Từ chối</button>
      </form>
      <p className="mt-5 text-sm text-neutral-600">Bạn có thể <a href="/ket-noi-ai/authorize/connections" className="underline">thu hồi quyền trong phần quản lý kết nối</a> của hệ thống hoặc ngắt kết nối trong ứng dụng AI.</p>
    </>}
  </section>;
}
