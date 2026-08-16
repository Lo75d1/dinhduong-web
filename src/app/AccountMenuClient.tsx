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
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
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
        className="rounded-md border border-[#123c36] bg-white px-3 py-1.5 text-sm font-semibold text-[#123c36] hover:bg-[#edf4f0]"
      >
        Đăng nhập
      </Link>
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user.displayName}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123c36] text-sm font-bold text-white ring-2 ring-white ring-offset-1 ring-offset-[#123c36]/10 hover:brightness-110"
      >
        {initials(user.displayName)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#c3d4cc] bg-white text-left shadow-[0_12px_32px_rgba(18,60,54,0.18)]"
        >
          <div className="flex items-center gap-3 border-b border-[#e0e9e4] bg-[#f4f8f5] px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#123c36] text-base font-bold text-white">
              {initials(user.displayName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#123c36]">
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
          <div className="flex flex-col py-1 text-sm">
            <Link
              href="/tai-khoan"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
              role="menuitem"
            >
              Tài khoản của tôi
            </Link>
            {user.role === "CLINICIAN" && enableDietOrders && (
              <Link
                href="/chi-dinh-che-do-an"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
                role="menuitem"
              >
                Chỉ định chế độ ăn
              </Link>
            )}
            {user.role === "DEPARTMENT_STAFF" && (
              <Link
                href="/bao-suat-an"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
                role="menuitem"
              >
                Báo suất ăn
              </Link>
            )}
            {user.role === "KITCHEN_STAFF" && (
              <Link
                href="/bep"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
                role="menuitem"
              >
                Ca trực bếp
              </Link>
            )}
            {["ADMIN", "DIETITIAN", "KITCHEN_MANAGER"].includes(user.role) && (
              <Link
                href="/quan-tri/suat-an"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
                role="menuitem"
              >
                Quản lý suất ăn
              </Link>
            )}
            {user.role === "ADMIN" && (
              <Link
                href="/quan-tri"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-neutral-800 hover:bg-[#f1f6f3]"
                role="menuitem"
              >
                Trang quản trị
              </Link>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="px-4 py-2 text-left text-[#8a2323] hover:bg-[#fbf0f0]"
              role="menuitem"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
