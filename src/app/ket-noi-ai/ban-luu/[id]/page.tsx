import type { Metadata } from "next";
import Link from "next/link";
import SavedMenuView from "./SavedMenuView";

export const metadata: Metadata = { title: "Bản khẩu phần đã lưu | Dinh dưỡng 2598", robots: { index: false, follow: false } };

export default async function SavedMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="mx-auto max-w-5xl text-[#123c36]"><Link href="/ket-noi-ai/ban-luu" className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]">Danh sách bản đã lưu</Link><h1 className="mt-4 text-3xl font-semibold">Bản khẩu phần đã lưu</h1><p className="mt-2 text-neutral-700">Đọc đầu vào, nguồn và kết quả của bản cá nhân; xuất Excel khi cần tiếp tục chỉnh trên máy.</p><SavedMenuView rationId={id} /></div>;
}
