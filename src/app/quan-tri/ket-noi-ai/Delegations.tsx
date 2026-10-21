"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import HelpPanel from "../HelpPanel";
import Icon from "@/components/ui/Icon";

type Connection = { familyId: string; clientId: string; name: string; hosts: string[]; createdAt: string; grant: { id: string; permission: string; expiresAt: string } | null };
type Data = { csrf: string; connections: Connection[] };
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const input = "mt-1 min-h-11 w-full rounded-md border border-[var(--control-line)] bg-white px-3 py-2 font-normal";

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
  return <div className="space-y-3" data-admin-delegations data-admin-workspace>
    <a href="/quan-tri" className="inline-block py-2 font-semibold text-[var(--brand)] underline underline-offset-4">← Quản trị</a>
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold tracking-widest text-[var(--muted)]">NGƯỜI DÙNG &amp; AI</p><h1 className="task-title text-3xl font-semibold"><span className="task-icon"><Icon name="shield-check" /></span>Ủy quyền AI quản lý kho mẫu</h1></div><div className="flex flex-wrap gap-2"><a href="/quan-tri/kho-thuc-don" className="inline-flex min-h-11 items-center rounded-md border border-[var(--control-line)] bg-white px-3 py-2 font-semibold">Mở kho mẫu →</a><button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded-md border border-[var(--control-line)] bg-white px-3 py-2 font-semibold">Làm mới kết nối</button></div></header>
    <HelpPanel><ol className="grid list-inside list-decimal gap-2 md:grid-cols-3"><li>Kết nối ChatGPT/Claude bằng tài khoản Admin.</li><li>Chọn đúng phiên, quyền và thời hạn bên dưới.</li><li>Tải lại công cụ trong AI (Refresh / Scan tools), rồi yêu cầu lập và lưu nháp.</li></ol><p>Quyền chỉ áp dụng cho kho mẫu: đọc hoặc lưu/sửa nháp có phiên bản. Duyệt chuyên môn và tính suất tập thể là bước riêng.</p><a href="/ket-noi-ai" className="inline-block py-2 font-semibold underline underline-offset-4">Hướng dẫn kết nối AI →</a></HelpPanel>
    {notice && <p role="status" className="rounded-lg border border-[var(--control-line)] bg-[var(--surface-soft)] p-4">{notice}</p>}{error && <p role="alert" className="rounded-lg border border-[#d8c992] bg-[#fff9e7] p-4">{error}</p>}
    {!data && !error && <p role="status">Đang tải kết nối…</p>}
    {data && !data.connections.length && <p className="rounded-xl border border-[var(--line)] bg-white p-4 leading-6">Chưa có phiên OAuth phù hợp. Kết nối tài khoản Admin trong ứng dụng AI theo hướng dẫn ở trên, rồi bấm Làm mới kết nối.</p>}
    {!!data?.connections.length && <form onSubmit={grant} className="rounded-lg border border-[var(--line)] bg-white p-4"><h2 className="text-xl font-semibold text-[var(--brand)]">Cấp quyền cho một phiên</h2><div className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_9rem_auto]"><label className="min-w-0 text-sm font-semibold sm:col-span-2 lg:col-span-1">Phiên kết nối<select required value={family} onChange={event => setFamily(event.target.value)} className={input}><option value="">Chọn phiên AI</option>{data.connections.map(connection => <option key={connection.familyId} value={connection.familyId}>{connection.name} · {connection.hosts.join(", ")} · {date(connection.createdAt)}</option>)}</select></label><label className="min-w-0 text-sm font-semibold">Quyền<select value={permission} onChange={event => setPermission(event.target.value)} className={input}><option value="write">Đọc và lưu/sửa bản nháp</option><option value="read">Chỉ đọc kho mẫu</option></select></label><label className="min-w-0 text-sm font-semibold">Thời hạn<select value={hours} onChange={event => setHours(Number(event.target.value))} className={input}><option value={1}>1 giờ</option><option value={8}>8 giờ</option><option value={24}>24 giờ</option><option value={168}>7 ngày</option></select></label><button disabled={busy || !family} className="min-h-11 rounded-md bg-[var(--brand)] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Đang cập nhật…" : "Cấp quyền cho phiên đã chọn"}</button></div></form>}
    {data && <section className="rounded-lg border border-[var(--line)] bg-white p-4"><h2 className="text-xl font-semibold text-[var(--brand)]">Các phiên đã ủy quyền</h2><ul className="mt-3 divide-y divide-[var(--line)]">{data.connections.filter(connection => connection.grant).map(connection => <li key={connection.familyId} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words font-semibold">{connection.name}</p><p className="mt-1 break-words text-sm">{connection.hosts.join(", ")} · {date(connection.createdAt)}</p><p className="mt-1 text-sm">{connection.grant!.permission === "write" ? "Đọc và lưu/sửa nháp" : "Chỉ đọc"} · Hết hạn {date(connection.grant!.expiresAt)}</p></div><button type="button" disabled={busy} onClick={() => void change({ id: connection.grant!.id }, "DELETE")} className="min-h-11 rounded-lg border border-red-700 px-4 py-2 font-semibold text-red-800">Thu hồi quyền kho mẫu</button></li>)}{!data.connections.some(connection => connection.grant) && <li>Chưa có phiên được ủy quyền còn hiệu lực.</li>}</ul></section>}
  </div>;
}
