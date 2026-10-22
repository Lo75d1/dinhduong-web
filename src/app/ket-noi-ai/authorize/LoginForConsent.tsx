"use client";
import { useState, type FormEvent } from "react";

/** Reuses the site's login endpoint and session cookie; keeps the pending consent URL. */
export default function LoginForConsent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (response.ok) { window.location.reload(); return; }
      setMessage("Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.");
    } catch { setMessage("Chưa kết nối được hệ thống. Vui lòng thử lại."); }
    setBusy(false);
  }
  return <form onSubmit={submit} className="mt-5 space-y-4">
    <p className="text-sm text-neutral-800">Dùng tài khoản hiện có của Dinh dưỡng 2598. Mật khẩu chỉ gửi tới hệ thống đăng nhập, ứng dụng AI không nhận mật khẩu.</p>
    <label className="block font-semibold">Email<input required type="email" autoComplete="username" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded border border-[var(--control-line)] px-3 py-2" /></label>
    <label className="block font-semibold">Mật khẩu<input required type="password" autoComplete="current-password" maxLength={256} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded border border-[var(--control-line)] px-3 py-2" /></label>
    {message && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">{message}</p>}
    <button disabled={busy} className="w-full rounded bg-[var(--brand)] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Đang đăng nhập…" : "Đăng nhập để xem quyền kết nối"}</button>
    <p className="text-sm text-neutral-700">Chưa có tài khoản? <a href="/dang-nhap" className="font-semibold text-[var(--brand)] underline">Đăng ký trên web</a>, rồi bắt đầu kết nối lại từ ứng dụng AI.</p>
  </form>;
}
