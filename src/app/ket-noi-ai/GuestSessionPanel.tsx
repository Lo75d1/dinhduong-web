"use client";
import { useState } from "react";
type Session = { accessToken: string; expiresAt: string };
export default function GuestSessionPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function change(end = false) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/nutrition/v1/guest-session", { method: end ? "DELETE" : "POST", credentials: "omit", headers: end && session ? { Authorization: `Bearer ${session.accessToken}` } : { "Content-Type": "application/json" }, ...(end ? {} : { body: "{}" }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error_description ?? data.message ?? "Chưa tạo được phiên; thử lại sau."); return; }
      setSession(end ? null : data); setMessage(end ? "Đã kết thúc phiên tạm." : "Đã tạo phiên, không cần tài khoản.");
    } catch { setMessage("Chưa kết nối được máy chủ; thử lại sau."); }
    finally { setBusy(false); }
  }
  return <details id="phien-tam" className="my-8 scroll-mt-6 rounded-xl border border-[#b1c8bd] bg-white p-5 sm:p-8">
    <summary className="cursor-pointer text-lg font-semibold">Dành cho phần mềm khác: tạo token thủ công</summary>
    <h2 id="guest-title" className="mt-4 text-xl font-semibold">Phiên tạm không cần tài khoản</h2>
    <p className="mt-3 text-neutral-700">Phiên tạm 30 phút để tra món, tính khẩu phần và lấy link Excel. Không lưu thực đơn vào tài khoản.</p>
    <p className="mt-2 text-neutral-700">Trong plugin đã bật công cụ: yêu cầu “Mở phiên tạm bằng start_guest_session rồi giúp tôi tính khẩu phần”. Plugin giữ mã phiên và dùng tiếp; bạn không cần tự sao chép.</p>
    <p className="mt-2 text-sm text-neutral-700">Ứng dụng hỗ trợ Bearer token có thể tạo mã thủ công bên dưới. Token chỉ hiện trong trang này, không lưu trên trình duyệt. Muốn lưu hoặc dùng thư viện riêng thì kết nối tài khoản bằng OAuth.</p>
    {!session ? <button type="button" disabled={busy} onClick={() => void change()} className="mt-5 rounded-lg bg-[#123c36] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Đang tạo…" : "Tạo token phiên tạm, không cần tài khoản"}</button> : <div className="mt-5 space-y-3">
      <label htmlFor="guest-token" className="block font-semibold">Token phiên tạm</label>
      <input id="guest-token" type="password" readOnly value={session.accessToken} autoComplete="off" spellCheck={false} className="w-full rounded border border-[#b1c8bd] bg-white p-3 font-mono text-sm" />
      <p className="text-sm">Hết hạn: {new Date(session.expiresAt).toLocaleString("vi-VN")}. Header: <code>Authorization: Bearer TOKEN</code>. Không đưa token vào URL hoặc gửi token cá nhân vào chat.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(session.accessToken); setMessage("Đã sao chép token."); } catch { setMessage("Chưa sao chép được; chọn ô token để sao chép thủ công."); } }} className="rounded-lg border border-[#123c36] bg-white px-4 py-2 font-semibold">Sao chép token</button>
        <button type="button" disabled={busy} onClick={() => void change(true)} className="rounded-lg border border-[#123c36] px-4 py-2 disabled:opacity-60">Kết thúc phiên</button>
      </div>
      <p className="text-sm text-neutral-700">Kết thúc phiên sẽ vô hiệu hóa token. Link Excel đã xuất có hạn tải riêng 10 phút.</p>
    </div>}
    <p role="status" className="mt-3 text-sm">{message}</p>
  </details>;
}
