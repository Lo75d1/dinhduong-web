"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultSiteSettings } from "@/lib/site-settings";

type Settings = typeof defaultSiteSettings;

export default function PublicFooter() {
  const [settings, setSettings] = useState<Settings>(defaultSiteSettings);
  useEffect(() => { void fetch("/api/site-settings").then((r) => r.json()).then((data) => setSettings({ ...defaultSiteSettings, ...data })).catch(() => undefined); }, []);
  return <footer className="border-t-2 border-[#b7c1bd] bg-white py-6 text-sm text-neutral-800"><div className="mx-auto grid max-w-7xl gap-5 px-5 md:grid-cols-[1.2fr_1fr_1fr]"><div><p className="font-semibold tracking-wide text-[#123c36]">DINH DƯỠNG VIỆT NAM</p><p className="mt-2 text-xs">Công cụ hỗ trợ chuyên môn; không thay thế thăm khám, chẩn đoán hoặc chỉ định điều trị.</p></div><div><p className="font-semibold text-[#123c36]">Liên kết</p><div className="mt-2 flex flex-col gap-1"><Link href="/huong-dan" className="hover:underline">Hướng dẫn sử dụng</Link><Link href="/ve-he-thong" className="hover:underline">Nguồn dữ liệu</Link><Link href="/lien-he" className="hover:underline">Liên hệ & hỗ trợ</Link><Link href="/chinh-sach-bao-mat" className="hover:underline">Chính sách riêng tư</Link><Link href="/dieu-khoan-su-dung" className="hover:underline">Điều khoản sử dụng</Link></div></div><div><p className="font-semibold text-[#123c36]">Hỗ trợ</p><p className="mt-2 font-semibold">{settings.contactName}</p>{settings.organization && <p className="text-xs">{settings.organization}</p>}{settings.phone && <a className="mt-1 block hover:underline" href={`tel:${settings.phone.replace(/\s/g, "")}`}>Điện thoại/Zalo: {settings.phone}</a>}{settings.zaloUrl && <a className="mt-1 block font-semibold text-[#123c36] hover:underline" href={settings.zaloUrl} target="_blank" rel="noreferrer">Tham gia nhóm hỗ trợ Zalo</a>}</div></div><p className="mx-auto mt-5 max-w-7xl border-t border-[#d0dbd6] px-5 pt-3 text-xs">Dữ liệu tham khảo: Viện Dinh dưỡng Việt Nam (VDD) & RNI · Thống kê truy cập không lưu IP.</p></footer>;
}
