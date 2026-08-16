"use client";

import { FormEvent, useState } from "react";

const field = "mt-1 w-full rounded-xl border-2 border-[#a7bbb3] bg-white px-3 py-3 text-base outline-none focus:border-[#123c36]";

export default function PublicMealReportForm({ departmentToken }: { departmentToken: string }) {
  const [form, setForm] = useState({ reporterName: "", roomBed: "", note: "", website: "" });
  const [busy, setBusy] = useState(false); const [code, setCode] = useState(""); const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/public/meal-report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, departmentToken, requestKey: crypto.randomUUID() }) });
    const body = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) return setError(body.error ?? "Chưa thể gửi ghi chú.");
    setCode(body.publicCode); setForm({ reporterName: "", roomBed: "", note: "", website: "" });
  }
  if (code) return <section className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-5 text-center"><div className="text-3xl">✓</div><h2 className="mt-2 text-xl font-black text-[#123c36]">Đã gửi điều dưỡng duyệt</h2><p className="mt-2 text-sm">Mã ghi chú: <b>{code}</b></p><p className="mt-2 text-sm text-neutral-700">Ghi chú chưa chuyển tới bếp cho đến khi điều dưỡng của khoa xác nhận.</p><button onClick={() => setCode("")} className="mt-4 rounded-xl bg-[#123c36] px-4 py-2.5 font-bold text-white">Gửi ghi chú khác</button></section>;
  return <form onSubmit={submit} className="rounded-2xl border-2 border-[#8eaa9f] bg-white p-4 shadow-sm sm:p-5">
    <h2 className="text-xl font-black text-[#123c36]">Gửi ghi chú cho điều dưỡng</h2>
    <p className="mt-1 text-sm text-neutral-600">Chỉ dùng cho yêu cầu định tính như ăn nhạt, cháo loãng hoặc thông báo dị ứng. Không dùng để thêm, giảm hay hủy suất.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="font-bold text-[#23483f]">Tên người gửi <span className="font-normal text-neutral-500">(không bắt buộc)</span><input maxLength={120} className={field} value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} /></label><label className="font-bold text-[#23483f]">Phòng/giường <span className="font-normal text-neutral-500">(không bắt buộc)</span><input maxLength={80} className={field} value={form.roomBed} onChange={(e) => setForm({ ...form, roomBed: e.target.value })} placeholder="Ví dụ: P.203 · G.05" /></label></div>
    <label className="mt-3 block font-bold text-[#23483f]">Nội dung ghi chú *<textarea required minLength={3} maxLength={500} rows={4} className={field} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ví dụ: Người bệnh dị ứng tôm; xin điều dưỡng kiểm tra giúp." /></label>
    <label className="hidden">Website<input tabIndex={-1} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
    <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>Nếu dị ứng nặng hoặc cần thay đổi khẩn cấp:</b> báo trực tiếp điều dưỡng, không chờ xử lý trên hệ thống.</p>
    <button disabled={busy || form.note.trim().length < 3} className="mt-4 w-full rounded-xl bg-[#123c36] px-5 py-3.5 text-lg font-black text-white disabled:opacity-50">{busy ? "Đang gửi…" : "Gửi để điều dưỡng duyệt"}</button>
    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 font-bold text-rose-700">{error}</p>}
  </form>;
}
