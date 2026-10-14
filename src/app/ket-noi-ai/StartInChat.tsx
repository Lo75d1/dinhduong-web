"use client";

import { useState } from "react";

export default function StartInChat({ message, link, mcp }: { message: string; link: string; mcp: string }) {
  const [notice, setNotice] = useState("");
  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); setNotice(`Đã sao chép ${label}.`); }
    catch { setNotice("Chưa sao chép được. Chọn nội dung trong ô bên dưới rồi dùng Sao chép hoặc Ctrl+C."); }
  }
  const button = "rounded-lg border border-[#123c36] bg-white px-4 py-2.5 font-semibold text-[#123c36] hover:bg-[#eaf3ee] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";
  return <section aria-labelledby="start-in-chat-title" className="rounded-xl border border-[#b1c8bd] bg-white p-5 sm:p-7">
    <h2 id="start-in-chat-title" className="text-2xl font-semibold">Dán vào chat để bắt đầu</h2>
    <p className="mt-2 text-neutral-700">Sao chép lời nhắn dưới đây, mở cuộc hội thoại đã bật kết nối Dinh dưỡng 2598, dán và gửi. Lời nhắn có đủ chỉ dẫn ngay cả khi AI chưa mở được link.</p>
    <label htmlFor="nutrition-start-message" className="mt-4 block font-semibold">Lời nhắn bắt đầu</label>
    <textarea id="nutrition-start-message" readOnly value={message} rows={6} className="mt-2 w-full resize-y rounded-lg border border-[#9bb6ab] bg-[#f7faf8] p-3 text-sm leading-6 text-neutral-800" />
    <div className="mt-3 flex flex-wrap gap-3">
      <button type="button" onClick={() => void copy(message, "lời nhắn")} className={`${button} bg-[#123c36]! text-white! hover:bg-[#0f5c51]!`}>Sao chép lời nhắn bắt đầu</button>
      <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className={button}>Mở ChatGPT</a>
      <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className={button}>Mở Claude</a>
    </div>
    <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm text-[#123c36]">{notice}</p>
    <details className="mt-3 border-t border-[#dcebe5] pt-4">
      <summary className="cursor-pointer font-semibold">Chỉ sao chép link hoặc địa chỉ kết nối</summary>
      <label htmlFor="nutrition-start-link" className="mt-3 block text-sm font-semibold">Link dán vào chat / link trong QR</label>
      <input id="nutrition-start-link" readOnly value={link} className="mt-1 w-full rounded border border-[#9bb6ab] p-2 text-sm" />
      <button type="button" onClick={() => void copy(link, "link bắt đầu")} className={`${button} mt-2`}>Sao chép link bắt đầu</button>
      <label htmlFor="nutrition-start-mcp" className="mt-4 block text-sm font-semibold">Địa chỉ dùng khi thêm kết nối một lần</label>
      <input id="nutrition-start-mcp" readOnly value={mcp} className="mt-1 w-full rounded border border-[#9bb6ab] p-2 text-sm" />
      <button type="button" onClick={() => void copy(mcp, "địa chỉ kết nối")} className={`${button} mt-2`}>Sao chép địa chỉ MCP</button>
    </details>
  </section>;
}
