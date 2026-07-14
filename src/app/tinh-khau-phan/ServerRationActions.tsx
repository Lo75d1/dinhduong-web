"use client";

import { useEffect, useState } from "react";
import type { Profile } from "./PersonalProfile";
import type { Row } from "./types";

type User = { id: string; email: string; displayName: string; role: string };

export default function ServerRationActions({ rows, profile }: { rows: Row[]; profile: Profile | null }) {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [creatingFirstAccount, setCreatingFirstAccount] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("Khẩu phần mới");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => setUser(data.user ?? null)).catch(() => setUser(null));
  }, []);

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch(creatingFirstAccount ? "/api/auth/bootstrap" : "/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(creatingFirstAccount ? { displayName, email, password } : { email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể đăng nhập.");
      setUser(data.user); setOpen(false); setPassword("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đăng nhập."); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!user) { setOpen(true); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/rations", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, profile, rows: rows.filter((row) => row.foodId) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể lưu khẩu phần.");
      setMessage(`Đã lưu “${data.ration.title}” lên server.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu khẩu phần."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null); setMessage("Đã đăng xuất.");
  }

  return <div className="flex flex-wrap items-center justify-end gap-2">
    {user ? <><label className="text-sm font-semibold text-neutral-900">Tên phiếu<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="ml-2 rounded-md border border-neutral-400 px-2 py-1 text-sm font-normal" /></label><span className="text-sm font-semibold text-neutral-900">{user.displayName}</span><button onClick={logout} className="rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-900">Đăng xuất</button></> : <button onClick={() => { setMessage(""); setOpen(true); }} className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36]">Đăng nhập để lưu</button>}
    <button onClick={save} disabled={busy || !rows.some((row) => row.foodId)} className="rounded-md bg-[#123c36] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Đang xử lý..." : "Lưu lên server"}</button>
    {message && <p className="w-full text-right text-sm font-medium text-neutral-900">{message}</p>}
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={submitAuth} className="w-full max-w-md rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-neutral-950">{creatingFirstAccount ? "Tạo tài khoản quản trị đầu tiên" : "Đăng nhập"}</h2><button type="button" onClick={() => setOpen(false)} className="text-lg text-neutral-900" aria-label="Đóng">×</button></div><p className="mt-2 text-sm text-neutral-800">Mỗi bác sĩ chỉ thấy các khẩu phần do chính mình lưu.</p>{creatingFirstAccount && <label className="mt-3 block text-sm font-semibold text-neutral-900">Họ tên<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label>}<label className="mt-3 block text-sm font-semibold text-neutral-900">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label><label className="mt-3 block text-sm font-semibold text-neutral-900">Mật khẩu<input required type="password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label>{message && <p className="mt-3 text-sm font-medium text-red-800">{message}</p>}<button disabled={busy} className="mt-4 w-full rounded-md bg-[#123c36] px-3 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Đang xử lý..." : creatingFirstAccount ? "Tạo tài khoản" : "Đăng nhập"}</button><button type="button" onClick={() => { setCreatingFirstAccount((value) => !value); setMessage(""); }} className="mt-3 w-full text-sm font-semibold text-[#123c36]">{creatingFirstAccount ? "Đã có tài khoản? Đăng nhập" : "Lần đầu sử dụng? Tạo tài khoản quản trị"}</button></form></div>}
  </div>;
}
