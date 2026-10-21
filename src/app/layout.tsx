import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import PublicFooter from "./PublicFooter";
import VisitTracker from "./VisitTracker";
import AccountMenu from "./AccountMenu";
import SiteNavigation from "./SiteNavigation";

const siteTitle = "Dinh dưỡng 2598 | Tra cứu & phân tích khẩu phần";
const siteDescription =
  "Dữ liệu có nguồn từ Viện Dinh dưỡng, RNI, Bộ Y tế và WHO. Hỗ trợ tra cứu thực phẩm, xây dựng, phân tích khẩu phần và đối chiếu chế độ ăn bệnh lý.";
const siteUrl = "https://dinhduong2598.food";
const coverImage = "/dinh-duong-2598-og.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: "Dinh dưỡng 2598",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  keywords: ["Dinh dưỡng 2598", "tra cứu dinh dưỡng", "tính khẩu phần", "thành phần thực phẩm"],
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Dinh dưỡng 2598",
    images: [{ url: coverImage, width: 1200, height: 630, alt: "Dinh dưỡng 2598 — Tra cứu và phân tích khẩu phần" }],
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

export const viewport: Viewport = { themeColor: "#0f766e" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-neutral-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Dinh dưỡng 2598",
              alternateName: "Dinh duong 2598",
              url: siteUrl,
              description: siteDescription,
              inLanguage: "vi",
            }).replace(/</g, "\\u003c"),
          }}
        />
        <a href="#main-content" className="skip-link">Đến nội dung chính</a>
        <VisitTracker />
        <header className="site-header border-b border-[var(--line)] bg-white">
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <Link
              href="/"
              className="order-1 flex min-w-0 items-center gap-2 leading-tight sm:min-w-52 sm:gap-3"
            >
              <Image
                src="/brand/mark.svg"
                alt="Biểu trưng Dinh dưỡng 2598"
                width={40}
                height={40}
                unoptimized
                className="h-8 w-8 shrink-0 rounded-full sm:h-10 sm:w-10 border border-[var(--control-line)] bg-white object-cover"
                priority
              />
              <span className="border-l-4 border-[var(--brand)] pl-3">
                <span className="block text-[14px] font-semibold tracking-wide sm:text-base text-[var(--brand)]">
                  DINH DƯỠNG 2598
                </span>
                <span className="hidden text-[11px] tracking-wide text-neutral-700 2xl:block">
                  CỔNG TRA CỨU &amp; PHÂN TÍCH KHẨU PHẦN
                </span>
              </span>
            </Link>
            <SiteNavigation />
            {/* Chỗ để trang tự chèn thanh riêng (vd bước 1/2 của Tính khẩu phần) — ẩn khi rỗng. */}
            <div id="header-page-slot" className="header-page-slot order-3 flex w-full min-w-0 justify-center sm:order-2 sm:w-auto sm:flex-1"></div>
            <div className="order-2 ml-auto lg:order-4">
              <AccountMenu />
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="hospital-main mx-auto w-full max-w-7xl flex-1 px-5 py-8">
          {children}
        </main>
        <PublicFooter />
      </body>
    </html>
  );
}
