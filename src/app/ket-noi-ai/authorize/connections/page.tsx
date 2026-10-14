import { nutritionConnectionsPageData } from "@/lib/nutrition-chat/oauth";
import { NutritionSecurityError } from "@/lib/nutrition-chat/security";
import LoginForConsent from "../LoginForConsent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý kết nối AI | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function NutritionConnectionsPage() {
  let data;
  try { data = await nutritionConnectionsPageData(); }
  catch (error) {
    const loginRequired = error instanceof NutritionSecurityError && error.code === "login_required";
    return <section className="mx-auto max-w-xl rounded-xl border border-[#8fa99e] bg-white p-6">
      <h1 className="text-2xl font-semibold text-[#123c36]">Quản lý kết nối AI</h1>
      {loginRequired ? <LoginForConsent /> : <p role="alert" className="mt-4">Hệ thống tạm thời chưa xử lý được yêu cầu. Vui lòng thử lại sau.</p>}
    </section>;
  }
  return <section className="mx-auto max-w-2xl rounded-xl border border-[#8fa99e] bg-white p-6">
    <h1 className="text-2xl font-semibold text-[#123c36]">Kết nối AI của {data.user.displayName}</h1>
    <p className="mt-3 text-sm text-neutral-700">Thu hồi quyền làm các access token và refresh token của phiên đó mất hiệu lực ngay. Khẩu phần đã lưu vẫn thuộc tài khoản của bạn.</p>
    {!data.connections.length && <p className="mt-6 rounded bg-[#edf4ef] p-4">Chưa có phiên kết nối AI còn hiệu lực.</p>}
    <ul className="mt-6 space-y-4">{data.connections.map(connection => <li key={connection.familyId} className="rounded-lg border border-[#b7ccc0] p-4">
      <h2 className="font-semibold text-[#123c36]">{connection.client.name}</h2>
      <p className="mt-1 text-sm text-neutral-700">Địa chỉ nhận: {connection.client.redirectUris.map(uri => new URL(uri).hostname).join(", ")}</p>
      <p className="mt-2 text-sm">Quyền: {connection.scopes.map(scope => ({ "nutrition:read": "tra cứu và mở bản riêng", "nutrition:calculate": "tính", "nutrition:write": "lưu/cập nhật", "nutrition:export": "Excel" }[scope] ?? scope)).join(", ")}.</p>
      <p className="mt-1 text-xs text-neutral-600">Hết hạn: {connection.refreshExpiresAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      <form action="/api/nutrition/v1/oauth/connections" method="post" className="mt-3">
        <input type="hidden" name="csrf" value={data.csrf} /><input type="hidden" name="family_id" value={connection.familyId} />
        <button className="rounded border border-red-700 px-4 py-2 font-semibold text-red-800">Thu hồi phiên kết nối này</button>
      </form>
    </li>)}</ul>
    <a href="/ket-noi-ai" className="mt-6 inline-block font-semibold text-[#123c36] underline">Về hướng dẫn kết nối</a>
  </section>;
}
