"use client";

import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const links: { href: string; label: string; primary: boolean; icon: IconName }[] = [
  { href: "/tinh-khau-phan", label: "Tính khẩu phần", primary: true, icon: "calculator" },
  { href: "/thuc-pham", label: "Tra cứu", primary: false, icon: "search" },
  { href: "/mon-an", label: "Món ăn", primary: false, icon: "cooking-pot" },
  { href: "/ket-noi-ai/bat-dau", label: "ChatGPT & Claude", primary: false, icon: "messages-square" },
  { href: "/huong-dan", label: "Hướng dẫn", primary: false, icon: "circle-help" },
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
    return <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined} className={`site-nav-item ${link.primary ? "site-nav-primary" : ""}`}><Icon name={link.icon} className="h-[18px] w-[18px]" />{link.label}</Link>;
  }
  const hospital = <a href="https://suatanbv.io.vn/" target="_blank" rel="noopener noreferrer" aria-label="Mở Suất ăn bệnh viện tại suatanbv.io.vn (tab mới)" className="site-nav-item site-nav-hospital"><Icon name="hospital" className="h-[18px] w-[18px]" />Suất ăn bệnh viện <span aria-hidden="true">↗</span></a>;
  return <div className="site-nav-links order-3 w-full min-w-0 lg:order-2 lg:w-auto lg:flex-1">
    <nav aria-label="Điều hướng chính" className="hidden flex-wrap items-center gap-1 lg:flex">{links.map(item)}{hospital}</nav>
    <div className="flex items-center gap-1 lg:hidden">{links.slice(0, 2).map(item)}<details key={pathname} ref={menu} className="relative ml-auto" onKeyDown={event => { if (event.key === "Escape" && menu.current?.open) { menu.current.open = false; toggle.current?.focus(); event.stopPropagation(); } }}>
      <summary ref={toggle} aria-label="Mở menu điều hướng" className="site-menu-toggle flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 font-medium text-[var(--ink)]"><span className="hidden min-[480px]:inline">Menu</span><Icon name="menu" /></summary>
      <nav aria-label="Điều hướng mở rộng" className="site-mobile-menu absolute right-0 z-50 mt-2 flex w-64 max-w-[calc(100vw-2.5rem)] flex-col rounded-lg border border-[var(--line)] bg-white p-2 shadow-lg">{links.slice(2).map(item)}{hospital}</nav>
    </details></div>
  </div>;
}
