"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

function roleLabel(role: string) {
  return role === "ADMIN"
    ? "Quản trị viên"
    : role === "EDITOR"
      ? "Biên tập dữ liệu"
      : role === "CLINICIAN"
        ? "Bác sĩ"
        : role === "DEPARTMENT_STAFF"
          ? "Điều dưỡng khoa"
          : role === "DIETITIAN"
            ? "Dinh dưỡng"
            : role === "KITCHEN_MANAGER"
              ? "Bếp trưởng"
              : role === "KITCHEN_STAFF"
                ? "Nhân viên bếp"
                : "Tài khoản cá nhân";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (
    parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)
  ).toUpperCase();
}

// Menu tài khoản kiểu Google: chỉ hiện ảnh đại diện (chữ viết tắt) ở góc phải; bấm
// vào mới mở popup gồm tên/email/vai trò và các liên kết Tài khoản/Quản trị/Đăng xuất.
export default function AccountMenuClient({
  user,
  enableDietOrders,
}: {
  user: SessionUser | null;
  enableDietOrders: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    ref.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setOpen(false);
    router.refresh();
  }

  if (!user)
    return (
      <Link
        href="/dang-nhap"
        className="inline-flex min-h-11 items-center rounded-md border border-[var(--brand)] bg-white px-3 py-2 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--surface-soft)]"
      >
        Đăng nhập
      </Link>
    );

  return (
    <div ref={ref} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-controls="account-navigation"
        aria-label={`Tài khoản: ${user.displayName}`}
        aria-expanded={open}
        title={user.displayName}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white ring-2 ring-white ring-offset-1 ring-offset-[var(--brand)]/10 hover:brightness-110"
      >
        {initials(user.displayName)}
      </button>
      {open && (
        <div
          id="account-navigation"
          className="absolute right-0 z-50 mt-2 max-h-[calc(100dvh-6rem)] w-64 max-w-[calc(100vw-2.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--line)] bg-white text-left shadow-[0_12px_32px_rgba(18,60,54,0.18)]"
        >
          <div className="flex items-center gap-3 border-b border-[#e0e9e4] bg-[#f4f8f5] px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-base font-bold text-white">
              {initials(user.displayName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--brand)]">
                {user.displayName}
              </span>
              <span className="block truncate text-xs text-neutral-600">
                {user.email}
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold text-[#0c5f4d]">
                {roleLabel(user.role)}
              </span>
            </span>
          </div>
          <nav aria-label="Menu tài khoản" className="flex flex-col py-1 text-sm">
            <Link
              href="/tai-khoan"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
            >
              Tài khoản của tôi
            </Link>
            <Link href="/tai-khoan/thuc-don" onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]">Thực đơn của tôi</Link>
            <Link href="/tai-khoan/thuc-pham" onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]">Thực phẩm của tôi</Link>
            <Link href="/tai-khoan/mon-an" onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]">Món ăn của tôi</Link>
            <Link href="/tai-khoan?section=connections" onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]">Kết nối ứng dụng</Link>
            {user.role === "CLINICIAN" && enableDietOrders && (
              <Link
                href="/chi-dinh-che-do-an"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
              >
                Chỉ định chế độ ăn
              </Link>
            )}
            {user.role === "ADMIN" && (
              <Link
                href="/quan-tri"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
              >
                Trang quản trị
              </Link>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-11 items-center px-4 py-2 text-left text-[#8a2323] hover:bg-[#fbf0f0]"
            >
              Đăng xuất
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
