import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import PublicFooter from "./PublicFooter";
import VisitTracker from "./VisitTracker";

export const metadata: Metadata = {
  title: "Dinh dưỡng 2597",
  description: "Tra cứu thực phẩm, món ăn và phân tích khẩu phần theo dữ liệu Viện Dinh dưỡng Việt Nam và RNI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className="h-full"><body className="min-h-full flex flex-col bg-[#f1f6f4] text-neutral-900">
    <VisitTracker />
    <header className="border-b-4 border-[#123c36] bg-white shadow-[0_5px_20px_rgba(18,60,54,0.08)]">
      <div className="bg-[#123c36] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-1.5 text-xs"><span className="font-semibold tracking-[0.12em]">HỆ THỐNG HỖ TRỢ DINH DƯỠNG LÂM SÀNG</span><span className="hidden sm:inline">Dữ liệu có nguồn · Đối chiếu minh bạch · Không thay thế chỉ định điều trị</span></div></div>
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4" aria-label="Điều hướng chính">
        <Link href="/" className="min-w-52 border-l-4 border-[#123c36] pl-3 leading-tight"><span className="block text-lg font-semibold tracking-wide text-[#123c36]">DINH DƯỠNG 2597</span><span className="mt-0.5 block text-xs tracking-wide text-neutral-700">CỔNG TRA CỨU &amp; PHÂN TÍCH KHẨU PHẦN</span></Link>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-900"><Link href="/thuc-pham" className="rounded-md border border-[#8fa99e] bg-white px-3 py-2 text-[#123c36] hover:bg-[#edf4f0]">Tra cứu</Link><Link href="/mon-an" className="rounded-md border border-[#8fa99e] bg-white px-3 py-2 text-[#123c36] hover:bg-[#edf4f0]">Món ăn</Link><Link href="/tinh-khau-phan" className="rounded-md bg-[#123c36] px-4 py-2 text-white shadow-sm hover:bg-[#0d2e29]">Tính khẩu phần</Link></div>
      </nav>
    </header>
    <main className="hospital-main mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
    <PublicFooter />
  </body></html>;
}
