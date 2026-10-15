"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readNutritionResponse } from "../client-api";

type Summary = { id: string; title: string; revision: number; updatedAt?: string };
type Listing = { items: Summary[]; nextOffset: number | null };
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";

export default function SavedMenuList() {
  const [items, setItems] = useState<Summary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/nutrition/v1/saved", { cache: "no-store", signal: controller.signal })
      .then(response => readNutritionResponse<Listing>(response))
      .then(value => {
        if (!Array.isArray(value.items)) throw new Error("Danh sách trả về chưa hợp lệ.");
        if (!controller.signal.aborted) { setItems(value.items); setNextOffset(value.nextOffset); }
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chưa đọc được danh sách."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [reload]);

  async function more() {
    if (busy || nextOffset === null) return;
    setBusy(true); setError("");
    try {
      const value = await readNutritionResponse<Listing>(await fetch(`/api/nutrition/v1/saved?offset=${nextOffset}`, { cache: "no-store" }));
      if (!Array.isArray(value.items)) throw new Error("Danh sách trả về chưa hợp lệ.");
      setItems(current => [...new Map([...current, ...value.items].map(item => [item.id, item])).values()]); setNextOffset(value.nextOffset);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa tải được phần tiếp theo."); }
    finally { setBusy(false); }
  }

  function refresh() { setError(""); setBusy(true); setItems([]); setNextOffset(null); setReload(value => value + 1); }
  return <div className="mt-6 rounded-xl border border-[#b1c8bd] bg-white p-5 sm:p-7">
    {error ? <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-800"><p>{error}</p><Link href="/dang-nhap?next=%2Fket-noi-ai%2Fban-luu" className={`mt-2 inline-block underline ${focus}`}>Đăng nhập tài khoản</Link></div> : null}
    {!busy && !error && !items.length ? <p className="text-neutral-700">Chưa có thực đơn nào ở đây. Chọn “Lưu và tải Excel” khi xuất trên web, hoặc yêu cầu lưu kèm Excel trong chat. Sau đó mở lại bằng tài khoản hoặc link trong file.</p> : null}
    <ul className="space-y-3">{items.map(item => <li key={item.id}><Link href={`/ket-noi-ai/ban-luu/${encodeURIComponent(item.id)}`} className={`block rounded-lg border border-[#dcebe5] p-4 hover:bg-[#eaf3ee] ${focus}`}><span className="block text-lg font-semibold">{item.title}</span><span className="mt-1 block text-sm text-neutral-700">Phiên bản {item.revision}{item.updatedAt && Number.isFinite(Date.parse(item.updatedAt)) ? ` · Cập nhật ${new Date(item.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}</span></Link></li>)}</ul>
    {busy ? <p role="status" className="mt-4 text-neutral-700">Đang đọc danh sách…</p> : null}
    <div className="mt-5 flex flex-wrap gap-4">{nextOffset !== null ? <button type="button" disabled={busy} onClick={() => void more()} className={`rounded-lg bg-[#123c36] px-4 py-2 font-semibold text-white disabled:opacity-50 ${focus}`}>Tải thêm</button> : null}<button type="button" disabled={busy} onClick={refresh} className={`text-sm underline underline-offset-4 disabled:opacity-50 ${focus}`}>Làm mới danh sách</button></div>
  </div>;
}
