"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Popup/modal dùng chung cho trang Tính khẩu phần: nền mờ, hộp trắng viền xanh
// rêu, nút đóng, đóng khi bấm nền hoặc phím Esc, khóa cuộn nền khi mở.
export default function Modal({ open, onClose, title, children, maxWidth = "max-w-2xl" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      data-no-print
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`my-4 w-full ${maxWidth} rounded-xl border-2 border-[#123c36] bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between gap-3 rounded-t-xl border-b-2 border-[#123c36] bg-[#edf4f0] px-4 py-3">
          <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
