import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { personalListParams } from "@/lib/personal-library";
import PersonalLibraryLayout from "../PersonalLibraryLayout";
import { savedCalculatorUrl, legacyCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thực đơn của tôi | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function MyMenusPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=%2Ftai-khoan%2Fthuc-don");
  const { q, page } = personalListParams(await searchParams);
  const menus = await prisma.ration.findMany({ where: { ownerId: user.id, ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}) }, select: { id: true, title: true, conversationRevision: true, updatedAt: true, _count: { select: { items: true } } }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: page * 20, take: 21 });
  const pageUrl = (value: number) => `/tai-khoan/thuc-don?page=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return <PersonalLibraryLayout active="menu" title="Thực đơn của tôi" description="Thực đơn và khẩu phần đã lưu trên web, từ hội thoại hoặc Excel. Mở để tiếp tục xem, sửa và tính trên cùng trang Tính khẩu phần.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-neutral-600">Các bản lưu thuộc tài khoản đang đăng nhập.</p><Link href="/tinh-khau-phan?moi=1" className="rounded-md bg-[var(--brand)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">Lập thực đơn mới</Link></div>
    <form className="mt-5 flex flex-wrap gap-2"><label className="min-w-0 flex-1 text-sm">Tìm theo tên<input name="q" defaultValue={q} maxLength={100} className="mt-1 w-full rounded border border-[var(--control-line)] px-3 py-2" /></label><button className="self-end rounded bg-[var(--brand)] px-4 py-2 text-white">Tìm</button></form>
    <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">{menus.slice(0, 20).map(menu => <li key={menu.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{menu.title}</h2><p className="mt-1 text-sm text-neutral-600">{menu.conversationRevision > 0 ? `Thực đơn đầy đủ · phiên bản ${menu.conversationRevision}` : `Khẩu phần đã lưu · ${menu._count.items} dòng thực phẩm`} · {menu.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></div><Link href={menu.conversationRevision > 0 ? savedCalculatorUrl(menu.id) : legacyCalculatorUrl(menu.id)} className="shrink-0 rounded-md border border-[var(--brand)] px-4 py-2 text-sm font-semibold hover:bg-[#f1f6f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">Mở trong Tính khẩu phần</Link></li>)}</ul>
    {!menus.length ? <p className="mt-5 text-neutral-700">{q ? "Chưa tìm thấy tên này trong các bản đã lưu." : "Chưa có thực đơn nào được lưu vào tài khoản. Nội dung đang nhập trên máy cần được lưu để xuất hiện ở đây."}</p> : null}
    <nav aria-label="Trang thực đơn" className="mt-5 flex gap-5">{page > 0 ? <Link href={pageUrl(page - 1)} className="underline">Trang trước</Link> : null}{menus.length > 20 ? <Link href={pageUrl(page + 1)} className="underline">Trang sau</Link> : null}</nav>
    <div className="mt-6 flex flex-wrap gap-5 font-semibold underline"><Link href="/tai-khoan/thuc-don/moi">Lập thực đơn từ thư viện</Link><Link href="/tinh-khau-phan">Mở công cụ nhập thực đơn</Link></div>
  </PersonalLibraryLayout>;
}
