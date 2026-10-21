"use client";

import { useRef, useState } from "react";

export default function CopyGuide({ title, description, text, href }: { title: string; description: string; text: string; href: string }) {
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Đã sao chép đầy đủ hướng dẫn và nguồn tham khảo.");
    } catch {
      setOpen(true);
      setNotice("Chọn nội dung bên dưới và sao chép thủ công.");
      requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.select(); });
    }
  }
  return <article className="min-w-0 rounded-xl border border-[#8fa99e] bg-white p-5">
    <h3 className="text-lg font-semibold text-[#123c36]">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-neutral-700">{description}</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void copy()} className="min-h-11 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Sao chép {title}</button>
      <a href={href} className="py-2 text-sm font-semibold underline underline-offset-4">Mở bản TXT</a>
    </div>
    <p role="status" aria-live="polite" className="mt-2 text-sm text-[#123c36]">{notice}</p>
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="mt-2">
      <summary className="cursor-pointer text-sm underline underline-offset-4">Xem toàn bộ nội dung</summary>
      <label className="mt-3 block text-sm">Nội dung {title}
        <textarea ref={textarea} readOnly value={text} className="mt-2 h-64 w-full rounded border border-[#8fa99e] p-3 font-mono text-xs" />
      </label>
    </details>
  </article>;
}
