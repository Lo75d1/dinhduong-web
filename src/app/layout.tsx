import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import PublicFooter from "./PublicFooter";
import VisitTracker from "./VisitTracker";
import AccountMenu from "./AccountMenu";

const siteTitle = "Dinh dưỡng 2598";
const siteDescription =
  "Tra cứu thực phẩm, món ăn và phân tích khẩu phần. Sáng kiến cải tiến tại Bệnh viện Đa khoa Nam Liên Chiểu · Sở Y tế thành phố Đà Nẵng.";
const siteUrl = "https://dinhduong2598.food";
const coverImage = "/dinh-duong-2597-cover.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full flex flex-col bg-[#f1f6f4] text-neutral-900">
        <VisitTracker />
        <header className="site-header border-b-4 border-[#123c36] bg-white shadow-[0_5px_20px_rgba(18,60,54,0.08)]">
          <nav className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2 sm:gap-x-5">
            <Link
              href="/"
              className="order-1 flex min-w-0 items-center gap-2 leading-tight sm:min-w-52 sm:gap-3"
            >
              <Image
                src="/dinh-duong-2597-avatar.jpg"
                alt="Biểu trưng Dinh dưỡng 2598"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-[#8fa99e] bg-white object-cover"
                priority
              />
              <span className="border-l-4 border-[#123c36] pl-3">
                <span className="block text-base font-semibold tracking-wide text-[#123c36]">
                  DINH DƯỠNG 2598
                </span>
                <span className="hidden text-[11px] tracking-wide text-neutral-700 sm:block">
                  CỔNG TRA CỨU &amp; PHÂN TÍCH KHẨU PHẦN
                </span>
              </span>
            </Link>
            <div className="site-nav-links order-3 flex w-full flex-wrap items-center gap-2 text-sm font-semibold sm:order-2 sm:w-auto">
              <Link
                href="/thuc-pham"
                className="rounded-md border border-[#8fa99e] px-3 py-1.5 text-[#123c36]"
              >
                Tra cứu
              </Link>
              <Link
                href="/mon-an"
                className="rounded-md border border-[#8fa99e] px-3 py-1.5 text-[#123c36]"
              >
                Món ăn
              </Link>
              <Link
                href="/huong-dan"
                className="rounded-md border border-[#8fa99e] px-3 py-1.5 text-[#123c36]"
              >
                Hướng dẫn
              </Link>
              <Link
                href="/tinh-khau-phan"
                className="rounded-md bg-[#123c36] px-4 py-1.5 text-white"
              >
                Tính khẩu phần
              </Link>
            </div>
            {/* Chỗ để trang tự chèn thanh riêng (vd bước 1/2 của Tính khẩu phần) — ẩn khi rỗng. */}
            <div id="header-page-slot" className="header-page-slot order-3 flex w-full min-w-0 justify-center sm:order-2 sm:w-auto sm:flex-1"></div>
            <div className="order-2 ml-auto sm:order-3">
              <AccountMenu />
            </div>
          </nav>
        </header>
        <main className="hospital-main mx-auto w-full max-w-7xl flex-1 px-5 py-8">
          {children}
        </main>
        <PublicFooter />
      </body>
    </html>
  );
}
