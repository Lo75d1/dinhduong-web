"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
type Settings = { contactName: string; organization?: string; phone?: string; zaloUrl?: string; totalVisits?: number | null };
const fallback: Settings = { contactName: "Bộ phận hỗ trợ" };

export default function PublicFooter() {
  const [settings, setSettings] = useState<Settings>(fallback);
  useEffect(() => { void fetch("/api/site-settings", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => data && setSettings(data)).catch(() => undefined); }, []);
  return <footer className="border-t-2 border-[#b7c1bd] bg-white py-6 text-sm text-neutral-800"><div className="mx-auto grid max-w-5xl gap-5 px-5 md:grid-cols-2"><div><p className="font-semibold text-[#123c36]">Tài liệu và chính sách</p><div className="mt-2 flex flex-col gap-1"><Link href="/tai-lieu-tham-khao" className="hover:underline">Tài liệu tham khảo</Link><Link href="/tai-lieu-tham-khao#nhu-cau-dinh-duong" className="hover:underline">RNI &amp; Viện Dinh dưỡng</Link><Link href="/chinh-sach-bao-mat" className="hover:underline">Chính sách riêng tư</Link><Link href="/dieu-khoan-su-dung" className="hover:underline">Điều khoản sử dụng</Link><Link href="/cam-on" className="hover:underline">Lời cảm ơn</Link></div></div><div><p className="font-semibold text-[#123c36]">Liên hệ &amp; hỗ trợ</p><p className="mt-2 font-semibold">{settings.contactName}</p>{settings.organization && <p className="text-xs">{settings.organization}</p>}{settings.phone && <a className="mt-1 block hover:underline" href={`tel:${settings.phone.replace(/\s/g, "")}`}>Điện thoại/Zalo: {settings.phone}</a>}{settings.zaloUrl && <a className="mt-1 block font-semibold text-[#123c36] hover:underline" href={settings.zaloUrl} target="_blank" rel="noreferrer">Tham gia nhóm hỗ trợ Zalo</a>}<Link href="/lien-he" className="mt-2 block font-semibold text-[#123c36] hover:underline">Gửi liên hệ qua website</Link><Link href="/khao-sat" className="mt-1 block font-semibold text-[#123c36] hover:underline">Khảo sát mức độ dễ dùng (SUS)</Link></div></div>{typeof settings.totalVisits === "number" && <p className="mt-5 border-t border-[#e1e7e3] pt-3 text-center text-xs text-neutral-500">{settings.totalVisits.toLocaleString("vi-VN")} lượt truy cập</p>}</footer>;
}
