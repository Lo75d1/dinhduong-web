"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Connection = { familyId: string; clientId: string; name: string; hosts: string[]; createdAt: string; grant: { id: string; permission: string; expiresAt: string } | null };
type Data = { csrf: string; connections: Connection[] };
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const input = "mt-2 w-full rounded-lg border border-[#8fa99e] bg-white px-3 py-2.5 font-normal";

export default function Delegations() {
  const [data, setData] = useState<Data | null>(null), [family, setFamily] = useState(""), [permission, setPermission] = useState("write"), [hours, setHours] = useState(8), [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { const response = await fetch("/api/admin/menu-library/delegations", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Chưa tải được kết nối."); setData(result); }
    catch (error) { setData(null); setError(error instanceof Error ? error.message : "Chưa tải được kết nối."); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function change(body: unknown, method = "POST") {
    if (!data) return;
    setBusy(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/admin/menu-library/delegations", { method, headers: { "Content-Type": "application/json", "x-menu-library-csrf": data.csrf }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Chưa cập nhật được quyền.");
      setNotice(method === "DELETE" ? "Đã thu hồi quyền kho mẫu của phiên này." : "Đã cấp quyền. Quay lại ứng dụng AI và tải lại danh sách công cụ (Refresh / Scan tools).");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa cập nhật được quyền."); }
    finally { setBusy(false); }
  }
  function grant(event: FormEvent) { event.preventDefault(); void change({ familyId: family, permission, hours }); }
  return <div className="space-y-5" data-admin-delegations>
    <a href="/quan-tri" className="inline-block py-2 font-semibold text-[#123c36] underline underline-offset-4">← Quản trị</a>
    <header className="rounded-xl border border-[#b7ccc0] bg-white p-6"><p className="text-xs font-semibold tracking-widest text-[#52786d]">NGƯỜI DÙNG &amp; AI</p><h1 className="mt-2 text-3xl font-semibold text-[#123c36]">Ủy quyền AI quản lý kho mẫu</h1><p className="mt-3 max-w-3xl leading-7">Chọn đúng kết nối AI của tài khoản Admin và cấp quyền đọc hoặc lưu nháp. Quyền này chỉ áp dụng cho kho mẫu thực đơn.</p></header>
    <ol className="grid gap-3 sm:grid-cols-3">{["Kết nối ChatGPT/Claude với tài khoản Admin.", "Chọn phiên bên dưới, quyền và thời hạn.", "Tải lại công cụ trong AI, rồi yêu cầu lập và lưu nháp."].map((text, index) => <li key={text} className="rounded-xl border border-[#b7ccc0] bg-white p-5"><span className="font-semibold text-[#52786d]">Bước {index + 1}</span><p className="mt-2 leading-6">{text}</p></li>)}</ol>
    <div className="flex flex-wrap gap-4"><a href="/ket-noi-ai" className="font-semibold underline underline-offset-4">Hướng dẫn kết nối AI →</a><a href="/quan-tri/kho-thuc-don" className="font-semibold underline underline-offset-4">Mở kho mẫu →</a><button type="button" disabled={busy} onClick={() => void load()} className="font-semibold underline underline-offset-4">Làm mới kết nối</button></div>
    {notice && <p role="status" className="rounded-lg border border-[#8fa99e] bg-[#edf4f0] p-4">{notice}</p>}{error && <p role="alert" className="rounded-lg border border-[#d8c992] bg-[#fff9e7] p-4">{error}</p>}
    {!data && !error && <p role="status">Đang tải kết nối…</p>}
    {data && !data.connections.length && <p className="rounded-xl border border-[#b7ccc0] bg-white p-6 leading-7">Chưa có phiên OAuth phù hợp. Kết nối tài khoản Admin trong ứng dụng AI theo hướng dẫn ở trên, rồi bấm Làm mới kết nối.</p>}
    {!!data?.connections.length && <form onSubmit={grant} className="rounded-xl border border-[#b7ccc0] bg-white p-6"><h2 className="text-xl font-semibold text-[#123c36]">Cấp quyền cho một phiên</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="min-w-0 font-semibold sm:col-span-2">Phiên kết nối<select required value={family} onChange={event => setFamily(event.target.value)} className={input}><option value="">Chọn phiên AI</option>{data.connections.map(connection => <option key={connection.familyId} value={connection.familyId}>{connection.name} · {connection.hosts.join(", ")} · {date(connection.createdAt)}</option>)}</select></label><label className="font-semibold">Quyền<select value={permission} onChange={event => setPermission(event.target.value)} className={input}><option value="write">Đọc và lưu/sửa bản nháp</option><option value="read">Chỉ đọc kho mẫu</option></select></label><label className="font-semibold">Thời hạn<select value={hours} onChange={event => setHours(Number(event.target.value))} className={input}><option value={1}>1 giờ</option><option value={8}>8 giờ</option><option value={24}>24 giờ</option><option value={168}>7 ngày</option></select></label></div><p className="mt-4 text-sm leading-6 text-neutral-700">AI được phép lưu nháp vào kho chung của Admin và sửa mẫu có kiểm tra phiên bản. Bạn xem lại mẫu trong kho; việc duyệt chuyên môn và tính suất tập thể là bước riêng.</p><button disabled={busy || !family} className="mt-5 min-h-11 rounded-lg bg-[#123c36] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Đang cập nhật…" : "Cấp quyền cho phiên đã chọn"}</button></form>}
    {data && <section className="rounded-xl border border-[#b7ccc0] bg-white p-6"><h2 className="text-xl font-semibold text-[#123c36]">Các phiên đã ủy quyền</h2><ul className="mt-4 space-y-3">{data.connections.filter(connection => connection.grant).map(connection => <li key={connection.familyId} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d4dfd8] p-4"><div className="min-w-0"><p className="break-words font-semibold">{connection.name}</p><p className="mt-1 break-words text-sm">{connection.hosts.join(", ")} · {date(connection.createdAt)}</p><p className="mt-2 text-sm">{connection.grant!.permission === "write" ? "Đọc và lưu/sửa nháp" : "Chỉ đọc"} · Hết hạn {date(connection.grant!.expiresAt)}</p></div><button type="button" disabled={busy} onClick={() => void change({ id: connection.grant!.id }, "DELETE")} className="min-h-11 rounded-lg border border-red-700 px-4 py-2 font-semibold text-red-800">Thu hồi quyền kho mẫu</button></li>)}{!data.connections.some(connection => connection.grant) && <li>Chưa có phiên được ủy quyền còn hiệu lực.</li>}</ul></section>}
  </div>;
}
