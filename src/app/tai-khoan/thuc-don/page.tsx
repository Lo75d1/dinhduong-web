import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { personalListParams } from "@/lib/personal-library";
import PersonalLibraryNav from "../PersonalLibraryNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thực đơn của tôi | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function MyMenusPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap?next=%2Ftai-khoan%2Fthuc-don");
  const { q, page } = personalListParams(await searchParams);
  const menus = await prisma.ration.findMany({ where: { ownerId: user.id, ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}) }, select: { id: true, title: true, conversationRevision: true, updatedAt: true, _count: { select: { items: true } } }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: page * 20, take: 21 });
  const pageUrl = (value: number) => `/tai-khoan/thuc-don?page=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return <section className="mx-auto max-w-4xl text-[#123c36]">
    <Link href="/tai-khoan" className="text-sm underline underline-offset-4">Tài khoản của tôi</Link>
    <h1 className="mt-4 text-3xl font-semibold">Thực đơn của tôi</h1>
    <PersonalLibraryNav active="menu" />
    <p className="mt-2 text-neutral-700">Tất cả thực đơn và khẩu phần bạn đã lưu trên web, trong chat hoặc khi xuất Excel.</p>
    <form className="mt-5 flex flex-wrap gap-2"><label className="min-w-0 flex-1 text-sm">Tìm theo tên<input name="q" defaultValue={q} maxLength={100} className="mt-1 w-full rounded border border-[#8fa99e] px-3 py-2" /></label><button className="self-end rounded bg-[#123c36] px-4 py-2 text-white">Tìm</button></form>
    <ul className="mt-5 space-y-3">{menus.slice(0, 20).map(menu => <li key={menu.id}><Link href={menu.conversationRevision > 0 ? `/ket-noi-ai/ban-luu/${menu.id}` : `/tai-khoan/thuc-don/${menu.id}`} className="block rounded-lg border border-[#b1c8bd] bg-white p-4 hover:bg-[#edf4ef] focus-visible:outline-2 focus-visible:outline-[#123c36]"><span className="block text-lg font-semibold">{menu.title}</span><span className="mt-1 block text-sm text-neutral-700">{menu.conversationRevision > 0 ? `Bản lưu web / chat · phiên bản ${menu.conversationRevision}` : `Khẩu phần đã lưu · ${menu._count.items} dòng thực phẩm`} · {menu.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span></Link></li>)}</ul>
    {!menus.length ? <p className="mt-5 text-neutral-700">{q ? "Chưa tìm thấy tên này trong các bản đã lưu." : "Chưa có thực đơn nào được lưu vào tài khoản. Nội dung đang nhập trên máy cần được lưu để xuất hiện ở đây."}</p> : null}
    <nav aria-label="Trang thực đơn" className="mt-5 flex gap-5">{page > 0 ? <Link href={pageUrl(page - 1)} className="underline">Trang trước</Link> : null}{menus.length > 20 ? <Link href={pageUrl(page + 1)} className="underline">Trang sau</Link> : null}</nav>
    <div className="mt-6 flex flex-wrap gap-5 font-semibold underline"><Link href="/tai-khoan/thuc-don/moi">Lập thực đơn từ thư viện</Link><Link href="/tinh-khau-phan">Mở công cụ nhập thực đơn</Link></div>
  </section>;
}
