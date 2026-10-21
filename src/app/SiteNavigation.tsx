"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const links = [
  { href: "/tinh-khau-phan", label: "Tính khẩu phần", primary: true },
  { href: "/thuc-pham", label: "Tra cứu", primary: false },
  { href: "/mon-an", label: "Món ăn", primary: false },
  { href: "/ket-noi-ai/bat-dau", label: "ChatGPT & Claude", primary: false },
  { href: "/huong-dan", label: "Hướng dẫn", primary: false },
];

export default function SiteNavigation() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const toggle = useRef<HTMLElement>(null);
  useEffect(() => {
    function close(event: PointerEvent) { if (menu.current?.open && !menu.current.contains(event.target as Node)) menu.current.open = false; }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const current = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/ket-noi-ai/bat-dau" && pathname.startsWith("/ket-noi-ai"));
  function item(link: typeof links[number]) {
    return <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined} className={`site-nav-item ${link.primary ? "site-nav-primary" : ""}`}>{link.label}</Link>;
  }
  const hospital = <a href="https://suatanbv.io.vn/" target="_blank" rel="noopener noreferrer" aria-label="Mở Suất ăn bệnh viện tại suatanbv.io.vn (tab mới)" className="site-nav-item site-nav-hospital">Suất ăn bệnh viện <span aria-hidden="true">↗</span></a>;
  return <div className="site-nav-links order-3 w-full min-w-0 lg:order-2 lg:w-auto lg:flex-1">
    <nav aria-label="Điều hướng chính" className="hidden flex-wrap items-center gap-1 lg:flex">{links.map(item)}{hospital}</nav>
    <div className="flex items-center gap-1 lg:hidden">{links.slice(0, 2).map(item)}<details key={pathname} ref={menu} className="relative ml-auto" onKeyDown={event => { if (event.key === "Escape" && menu.current?.open) { menu.current.open = false; toggle.current?.focus(); event.stopPropagation(); } }}>
      <summary ref={toggle} aria-label="Mở menu điều hướng" className="site-menu-toggle flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-[#b7ccc0] bg-white px-3 py-2 font-semibold text-[#123c36]"><span className="hidden min-[360px]:inline">Menu</span><span aria-hidden="true">☰</span></summary>
      <nav aria-label="Điều hướng mở rộng" className="site-mobile-menu absolute right-0 z-50 mt-2 flex w-64 max-w-[calc(100vw-2.5rem)] flex-col rounded-lg border border-[#b7ccc0] bg-white p-2 shadow-lg">{links.slice(2).map(item)}{hospital}</nav>
    </details></div>
  </div>;
}
