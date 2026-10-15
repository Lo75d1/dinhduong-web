import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ServerRationActions from "@/app/tinh-khau-phan/ServerRationActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thực đơn của tôi | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function MyMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/tai-khoan/thuc-don/${id}`)}`);
  const menu = await prisma.ration.findFirst({ where: { id, ownerId: user.id }, select: { id: true, title: true, conversationRevision: true, updatedAt: true, items: { orderBy: { sortOrder: "asc" }, select: { id: true, meal: true, dish: true, foodName: true, inputGrams: true, inputBasis: true, edibleGrams: true, note: true } } } });
  if (!menu) notFound();
  if (menu.conversationRevision > 0) redirect(`/ket-noi-ai/ban-luu/${menu.id}`);
  return <section className="mx-auto max-w-4xl text-[#123c36]">
    <Link href="/tai-khoan/thuc-don" className="text-sm underline">Thực đơn của tôi</Link>
    <h1 className="mt-4 text-3xl font-semibold">{menu.title}</h1>
    <p className="mt-2 text-sm text-neutral-700">Khẩu phần đã lưu trên web · cập nhật {menu.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p>
    <ul className="mt-5 space-y-3">{menu.items.map(item => <li key={item.id} className="rounded-lg border border-[#b1c8bd] bg-white p-4"><p className="font-semibold">{item.meal} · {item.dish}</p><p className="mt-1">{item.foodName} · {Number(item.inputGrams ?? item.edibleGrams).toLocaleString("vi-VN")} g {item.inputBasis === "raw" ? "nguyên liệu thô" : "ăn được"}</p>{item.note ? <p className="mt-1 text-sm text-neutral-700">{item.note}</p> : null}</li>)}</ul>
    <div className="mt-6 rounded-lg border border-[#b1c8bd] bg-white p-4"><p className="mb-3 text-sm text-neutral-700">Mở trong công cụ sẽ thay nội dung đang nhập trên máy bằng bản này. Hãy lưu nội dung hiện tại trước nếu cần giữ.</p><ServerRationActions rows={[]} profile={null} variant="load" loadTarget={{ id: menu.id, title: menu.title }} /></div>
  </section>;
}
