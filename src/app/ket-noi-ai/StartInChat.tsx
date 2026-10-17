"use client";

import { useState } from "react";

export default function StartInChat({ message, fallbackMessage, link, mcp }: { message: string; fallbackMessage: string; link: string; mcp: string }) {
  const [notice, setNotice] = useState("");
  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); setNotice(`Đã sao chép ${label}. Mở ChatGPT hoặc Claude, dán vào ô chat rồi gửi.`); }
    catch { setNotice("Chưa sao chép được. Chọn nội dung trong ô bên dưới rồi dùng Sao chép hoặc Ctrl+C."); }
  }
  const button = "inline-flex min-h-12 items-center justify-center rounded-lg border border-[#123c36] bg-white px-4 py-2.5 text-base font-semibold text-[#123c36] hover:bg-[#eaf3ee] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";
  return <section aria-labelledby="start-in-chat-title" className="rounded-xl border border-[#b1c8bd] bg-white p-5 sm:p-7">
    <h2 id="start-in-chat-title" className="text-2xl font-semibold">Dán vào chat để bắt đầu</h2>
    <p className="mt-2 text-lg text-neutral-700">Bấm sao chép, mở ChatGPT hoặc Claude, dán vào ô chat rồi gửi. Chat đọc hướng dẫn và hỏi bạn từng bước.</p>
    <p className="mt-2 text-neutral-700">Đã bật kết nối Dinh dưỡng 2598: chat tự mở phiên tạm, bạn không cần tạo tài khoản hoặc lấy mã truy cập. Lần đầu dùng thì làm theo <a href="#lan-dau" className="font-semibold underline">hướng dẫn kết nối bên dưới</a>.</p>
    <p className="mt-2 text-neutral-700">Có thể làm một ngày hoặc nhiều ngày. Link bản nháp/kết quả mở trang <b>Tính khẩu phần</b> với dữ liệu đã nạp sẵn để bạn chọn ngày, xem, sửa và tính lại sau khi xác nhận.</p>
    <label htmlFor="nutrition-start-message" className="mt-4 block font-semibold">Lời nhắn bắt đầu</label>
    <textarea id="nutrition-start-message" readOnly value={message} rows={6} className="mt-2 w-full resize-y rounded-lg border border-[#9bb6ab] bg-[#f7faf8] p-3 text-base leading-7 text-neutral-800" />
    <div className="mt-3 flex flex-wrap gap-3">
      <button type="button" onClick={() => void copy(message, "lời nhắn")} className={`${button} bg-[#123c36]! text-white! hover:bg-[#0f5c51]!`}>Sao chép lời nhắn bắt đầu</button>
      <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className={button}>Mở ChatGPT</a>
      <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className={button}>Mở Claude</a>
    </div>
    <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm text-[#123c36]">{notice}</p>
    <details className="mt-3 border-t border-[#dcebe5] pt-4">
      <summary className="cursor-pointer font-semibold">Cần link để chia sẻ hoặc chat chưa đọc được hướng dẫn?</summary>
      <label htmlFor="nutrition-start-link" className="mt-3 block text-sm font-semibold">Link dán vào chat / link trong QR</label>
      <input id="nutrition-start-link" readOnly value={link} className="mt-1 w-full rounded border border-[#9bb6ab] p-2 text-sm" />
      <button type="button" onClick={() => void copy(link, "link bắt đầu")} className={`${button} mt-2`}>Sao chép link bắt đầu</button>
      <p className="mt-4 text-sm text-neutral-700">Nếu chat báo không mở được link, sao chép bản đầy đủ này để gửi lại. Chat vẫn cần bật kết nối để tra dữ liệu và tính.</p>
      <label htmlFor="nutrition-full-message" className="mt-3 block text-sm font-semibold">Bản đầy đủ khi chat không mở được link</label>
      <textarea id="nutrition-full-message" readOnly value={fallbackMessage} rows={5} className="mt-2 w-full rounded border border-[#9bb6ab] p-3 text-sm leading-6" />
      <button type="button" onClick={() => void copy(fallbackMessage, "hướng dẫn đầy đủ")} className={`${button} mt-2`}>Sao chép bản đầy đủ</button>
      <label htmlFor="nutrition-start-mcp" className="mt-4 block text-sm font-semibold">Địa chỉ dùng khi thêm kết nối một lần</label>
      <input id="nutrition-start-mcp" readOnly value={mcp} className="mt-1 w-full rounded border border-[#9bb6ab] p-2 text-sm" />
      <button type="button" onClick={() => void copy(mcp, "địa chỉ kết nối")} className={`${button} mt-2`}>Sao chép địa chỉ MCP</button>
    </details>
  </section>;
}
