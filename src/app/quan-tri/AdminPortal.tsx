"use client";

import { FormEvent, useEffect, useState } from "react";
import { defaultSiteSettings } from "@/lib/site-settings";

type User = { id: string; displayName: string; email: string; role: string };
type Contact = { id: string; name: string; email: string | null; phone: string | null; audience: string | null; message: string; status: string; adminNote: string | null; createdAt: string };
type Analytics = { totalVisits: number; newMessages: number; daily: { date: string; visits: number }[]; topPages: { path: string; visits: number }[] };

const input = "mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2";

export default function AdminPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [displayName, setDisplayName] = useState("Lê Công Bảo Long");
  const [settings, setSettings] = useState(defaultSiteSettings);
  const [messages, setMessages] = useState<Contact[]>([]); const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [notice, setNotice] = useState(""); const [loading, setLoading] = useState(false);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => ({ user: null }));
    setUser(me.user ?? null);
    if (me.user?.role === "ADMIN") {
      const [s, m, a] = await Promise.all([fetch("/api/admin/site-settings"), fetch("/api/admin/contact-messages"), fetch("/api/admin/analytics")]);
      if (s.ok) setSettings({ ...defaultSiteSettings, ...await s.json() });
      if (m.ok) setMessages((await m.json()).items);
      if (a.ok) setAnalytics(await a.json());
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function authenticate(event: FormEvent) {
    event.preventDefault(); setLoading(true); setNotice("");
    const payload = { email, password, displayName };
    let response = await fetch("/api/auth/bootstrap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (response.status === 403) response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setNotice(data.error ?? "Không thể đăng nhập."); else { setNotice("Đã đăng nhập quản trị."); await load(); }
    setLoading(false);
  }
  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setLoading(true); setNotice("");
    const response = await fetch("/api/admin/site-settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setSettings({ ...defaultSiteSettings, ...data }); setNotice("Đã lưu thông tin công khai. Footer và trang Liên hệ sẽ cập nhật ngay."); } else setNotice(data.error ?? "Chưa thể lưu.");
    setLoading(false);
  }
  async function updateMessage(item: Contact, status: string) {
    const response = await fetch(`/api/admin/contact-messages/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) { setMessages((items) => items.map((entry) => entry.id === item.id ? { ...entry, status } : entry)); setAnalytics((value) => value ? { ...value, newMessages: Math.max(0, value.newMessages + (item.status === "NEW" && status !== "NEW" ? -1 : 0)) } : value); }
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setMessages([]); setAnalytics(null); setNotice("Đã đăng xuất."); }

  if (!user) return <section className="mx-auto max-w-lg rounded-xl border-2 border-[#123c36] bg-white p-6 shadow-sm"><p className="text-xs font-semibold tracking-[.16em] text-[#123c36]">QUẢN TRỊ HỆ THỐNG</p><h1 className="mt-1 text-3xl font-semibold">Đăng nhập quản trị</h1><p className="mt-3">Lần đầu, form này tạo tài khoản quản trị. Các lần sau dùng email và mật khẩu đó để đăng nhập.</p><form onSubmit={authenticate} className="mt-5 space-y-4"><label className="block font-semibold">Họ tên<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} /></label><label className="block font-semibold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label><label className="block font-semibold">Mật khẩu (ít nhất 10 ký tự)<input required minLength={10} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} /></label><button disabled={loading} className="w-full rounded bg-[#123c36] px-4 py-2.5 font-semibold text-white">{loading ? "Đang xử lý…" : "Đăng nhập / khởi tạo quản trị"}</button></form>{notice && <p className="mt-4 rounded border border-[#8fa99e] bg-[#f1f6f4] p-3 font-semibold">{notice}</p>}</section>;
  if (user.role !== "ADMIN") return <section className="mx-auto max-w-xl rounded-xl border-2 border-[#a77b10] bg-[#fff8df] p-6"><h1 className="text-2xl font-semibold">Tài khoản chưa có quyền quản trị</h1><p className="mt-2">Đăng nhập bằng tài khoản khởi tạo đầu tiên hoặc nhờ quản trị viên cấp quyền.</p><button onClick={() => void logout()} className="mt-4 rounded border-2 border-[#123c36] px-4 py-2 font-semibold">Đăng xuất</button></section>;

  return <div className="flex flex-col gap-6"><section className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#123c36] pb-4"><div><p className="text-xs font-semibold tracking-[.16em] text-[#123c36]">VẬN HÀNH WEBSITE</p><h1 className="mt-1 text-3xl font-semibold">Quản trị Dinh Dưỡng Việt Nam</h1><p className="mt-1">Đăng nhập: {user.displayName} · {user.email}</p></div><div className="flex gap-2"><button onClick={() => void load()} className="rounded border-2 border-[#123c36] px-3 py-2 font-semibold">Làm mới</button><button onClick={() => void logout()} className="rounded border-2 border-neutral-500 px-3 py-2 font-semibold">Đăng xuất</button></div></section>{notice && <p className="rounded border-2 border-[#52786d] bg-white p-3 font-semibold">{notice}</p>}<section className="grid gap-px overflow-hidden rounded-lg border-2 border-[#123c36] bg-[#123c36] sm:grid-cols-3"><div className="bg-white p-4"><p>Tổng lượt xem</p><p className="text-3xl font-semibold text-[#123c36]">{analytics?.totalVisits ?? 0}</p></div><div className="bg-white p-4"><p>Liên hệ mới</p><p className="text-3xl font-semibold text-[#123c36]">{analytics?.newMessages ?? 0}</p></div><div className="bg-white p-4"><p>Trang được theo dõi</p><p className="text-3xl font-semibold text-[#123c36]">{analytics?.topPages.length ?? 0}</p></div></section><section className="rounded-xl border-2 border-[#123c36] bg-white p-5"><h2 className="text-xl font-semibold">Thiết lập thông tin công khai</h2><p className="mt-1">Các trường này hiển thị ở Footer và trang Liên hệ. Lưu một lần, không cần sửa code.</p><form onSubmit={saveSettings} className="mt-4 grid gap-4 md:grid-cols-2"><label className="font-semibold">Người phụ trách<input value={settings.contactName} onChange={(e) => setSettings({ ...settings, contactName: e.target.value })} className={input} /></label><label className="font-semibold">Đơn vị / bộ phận<input value={settings.organization} onChange={(e) => setSettings({ ...settings, organization: e.target.value })} className={input} /></label><label className="font-semibold">Điện thoại / Zalo<input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className={input} /></label><label className="font-semibold">Email công khai<input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className={input} /></label><label className="font-semibold md:col-span-2">Địa chỉ<input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className={input} /></label><label className="font-semibold md:col-span-2">Link nhóm Zalo<input value={settings.zaloUrl} onChange={(e) => setSettings({ ...settings, zaloUrl: e.target.value })} className={input} /></label><button disabled={loading} className="justify-self-start rounded bg-[#123c36] px-5 py-2.5 font-semibold text-white">Lưu thông tin công khai</button></form></section><section className="rounded-xl border-2 border-[#52786d] bg-white p-5"><h2 className="text-xl font-semibold">Tin nhắn liên hệ</h2><div className="mt-4 space-y-3">{messages.map((item) => <article key={item.id} className="border-l-4 border-[#123c36] bg-[#f7faf8] p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{item.name} · {item.audience ?? "Khác"}</p><select value={item.status} onChange={(e) => void updateMessage(item, e.target.value)} className="rounded border border-[#8fa99e] px-2 py-1"><option value="NEW">Mới</option><option value="IN_PROGRESS">Đang xử lý</option><option value="CLOSED">Đã đóng</option></select></div><p className="text-sm">{item.email ?? ""} {item.phone ? `· ${item.phone}` : ""} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p><p className="mt-2 whitespace-pre-wrap">{item.message}</p></article>)}{messages.length === 0 && <p>Chưa có tin nhắn liên hệ.</p>}</div></section><section className="rounded-xl border-2 border-[#52786d] bg-white p-5"><h2 className="text-xl font-semibold">Thống kê truy cập 30 ngày</h2><p className="mt-1 text-sm">Ẩn danh, không lưu IP. Mỗi số là số phiên duy nhất theo ngày.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><div><h3 className="font-semibold">Theo ngày</h3><div className="mt-2 max-h-64 overflow-auto border"><table className="w-full text-sm"><tbody>{analytics?.daily.map((row) => <tr key={row.date}><td className="px-3 py-2">{row.date}</td><td className="px-3 py-2 text-right">{row.visits}</td></tr>)}</tbody></table></div></div><div><h3 className="font-semibold">Trang được xem nhiều</h3><div className="mt-2 border"><table className="w-full text-sm"><tbody>{analytics?.topPages.map((row) => <tr key={row.path}><td className="px-3 py-2">{row.path}</td><td className="px-3 py-2 text-right">{row.visits}</td></tr>)}</tbody></table></div></div></div></section></div>;
}
