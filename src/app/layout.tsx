import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import PublicFooter from "./PublicFooter";
import VisitTracker from "./VisitTracker";
import AccountMenu from "./AccountMenu";

const siteTitle = "Dinh dưỡng 2598";
const siteDescription = "Tra cứu thực phẩm, món ăn và phân tích khẩu phần. Sáng kiến cải tiến tại Bệnh viện Đa khoa Nam Liên Chiểu · Sở Y tế thành phố Đà Nẵng.";
const siteUrl = "https://dinhduong2598.food";
const coverImage = "/dinh-duong-2598-cover.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  // Thiếu openGraph/twitter thì link chia sẻ qua Zalo/Facebook/Messenger chỉ
  // hiện chữ trơn, không có ảnh minh hoạ — bổ sung để bản xem trước đầy đủ.
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: siteTitle,
    images: [{ url: coverImage, width: 1200, height: 630, alt: siteTitle }],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [coverImage],
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi" className="h-full"><body className="min-h-full flex flex-col bg-[#f1f6f4] text-neutral-900"><VisitTracker /><header className="border-b-4 border-[#123c36] bg-white shadow-[0_5px_20px_rgba(18,60,54,0.08)]"><div className="bg-[#123c36] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-1.5 text-xs"><span className="font-semibold tracking-[.08em]">SÁNG KIẾN CẢI TIẾN · BỆNH VIỆN ĐA KHOA NAM LIÊN CHIỂU</span><span className="hidden sm:inline">Sở Y tế thành phố Đà Nẵng</span></div></div><nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4"><Link href="/" className="flex min-w-52 items-center gap-3 leading-tight"><Image src="/dinh-duong-2597-avatar.jpg" alt="Biểu trưng Dinh dưỡng 2598" width={48} height={48} className="h-12 w-12 rounded-full border border-[#8fa99e] bg-white object-cover" priority/><span className="border-l-4 border-[#123c36] pl-3"><span className="block text-lg font-semibold tracking-wide text-[#123c36]">DINH DƯỠNG 2598</span><span className="mt-.5 block text-xs tracking-wide text-neutral-700">CỔNG TRA CỨU &amp; PHÂN TÍCH KHẨU PHẦN</span></span></Link><div className="flex flex-wrap items-center gap-2 text-sm font-semibold"><Link href="/thuc-pham" className="rounded-md border border-[#8fa99e] px-3 py-2 text-[#123c36]">Tra cứu</Link><Link href="/mon-an" className="rounded-md border border-[#8fa99e] px-3 py-2 text-[#123c36]">Món ăn</Link><Link href="/tinh-khau-phan" className="rounded-md bg-[#123c36] px-4 py-2 text-white">Tính khẩu phần</Link><AccountMenu /></div></nav></header><main className="hospital-main mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main><PublicFooter /></body></html>; }
