"use client";

import { useEffect, useState } from "react";

type ErrorItem = { id: string; source: string; message: string; actorEmail: string | null; createdAt: string };

export default function ErrorLogPage() {
  const [items, setItems] = useState<ErrorItem[]>([]);
  const [message, setMessage] = useState("Đang tải nhật ký lỗi…");
  const load = async () => {
    const response = await fetch("/api/admin/error-logs", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(data.error || "Chưa thể tải nhật ký lỗi."); return; }
    setItems(data.items || []); setMessage("");
  };
  useEffect(() => { void load(); }, []);
  return <section className="mx-auto max-w-5xl rounded-xl border-2 border-[#123c36] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-[.16em] text-[#123c36]">VẬN HÀNH WEBSITE</p><h1 className="mt-1 font-serif text-3xl font-semibold">Nhật ký lỗi</h1><p className="mt-2 text-sm text-neutral-700">Lưu tối đa 150 lỗi gần nhất. Chuỗi kết nối, API key, mật khẩu và token được che trước khi ghi.</p></div><button onClick={() => void load()} className="rounded border-2 border-[#123c36] px-4 py-2 font-semibold text-[#123c36]">Làm mới</button></div>{message ? <p className="mt-5 rounded border border-[#a77b10] bg-[#fff9e7] p-3">{message}</p> : items.length === 0 ? <p className="mt-5 rounded border border-[#8fa99e] bg-[#f5f8f6] p-4">Chưa có lỗi nào được ghi nhận.</p> : <div className="mt-5 overflow-x-auto border-2 border-[#8fa99e]"><table className="min-w-full border-collapse text-left text-sm"><thead className="bg-[#e7efeb]"><tr><th className="border-b border-[#8fa99e] px-3 py-2">Thời điểm</th><th className="border-b border-[#8fa99e] px-3 py-2">Khu vực</th><th className="border-b border-[#8fa99e] px-3 py-2">Nội dung</th><th className="border-b border-[#8fa99e] px-3 py-2">Người thao tác</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="align-top even:bg-[#f8faf9]"><td className="border-b border-[#d0dbd6] px-3 py-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="border-b border-[#d0dbd6] px-3 py-3 font-mono text-xs">{item.source}</td><td className="border-b border-[#d0dbd6] px-3 py-3 break-words">{item.message}</td><td className="border-b border-[#d0dbd6] px-3 py-3">{item.actorEmail || "—"}</td></tr>)}</tbody></table></div>}</section>;
}
