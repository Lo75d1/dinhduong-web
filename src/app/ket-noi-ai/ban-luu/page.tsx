import type { Metadata } from "next";
import Link from "next/link";
import SavedMenuList from "./SavedMenuList";

export const metadata: Metadata = { title: "Thực đơn và khẩu phần đã lưu | Dinh dưỡng 2598", robots: { index: false, follow: false } };

export default function SavedMenusPage() {
  return <div className="mx-auto max-w-4xl text-[#123c36]"><Link href="/ket-noi-ai" className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]">Trang kết nối AI</Link><h1 className="mt-4 text-3xl font-semibold">Thực đơn và khẩu phần đã lưu</h1><p className="mt-2 text-neutral-700">Mở bản đã lưu từ web hoặc chat, xem nguồn, điều chỉnh để dùng lại và tải Excel khi cần.</p><SavedMenuList /></div>;
}
