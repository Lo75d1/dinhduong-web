"use client";

import { FormEvent, useEffect, useState } from "react";
import { defaultSiteSettings } from "@/lib/site-settings";

export default function ContactForm() {
  const [settings, setSettings] = useState(defaultSiteSettings);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => { void fetch("/api/site-settings", { cache: "no-store" }).then((r) => r.json()).then((data) => setSettings({ ...defaultSiteSettings, ...data })).catch(() => undefined); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (response?.ok) { form.reset(); setMessage("Đã gửi liên hệ. Bộ phận hỗ trợ sẽ phản hồi qua thông tin bạn cung cấp."); }
    else setMessage(result?.error ?? "Chưa thể gửi. Vui lòng thử lại hoặc liên hệ qua Zalo.");
    setSending(false);
  }
  return <div className="flex flex-col gap-5"><section className="clinical-page-heading"><p className="text-xs font-semibold tracking-[.16em] text-[#123c36]">LIÊN HỆ & HỖ TRỢ</p><h1 className="mt-1 text-3xl font-semibold">Kết nối với bộ phận phụ trách</h1><p className="mt-2 max-w-3xl">Gửi câu hỏi sử dụng, đề xuất dữ liệu hoặc phản hồi kỹ thuật. Không gửi hồ sơ bệnh án, ảnh xét nghiệm hay thông tin sức khỏe định danh qua biểu mẫu này.</p></section><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><form onSubmit={submit} className="rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold">Gửi liên hệ</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="font-semibold">Họ và tên<input required name="name" className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2" /></label><label className="font-semibold">Nhóm người dùng<select name="audience" className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2"><option>Bác sĩ / điều dưỡng</option><option>Dinh dưỡng viên</option><option>Phụ huynh / người chăm sóc</option><option>PT / huấn luyện viên</option><option>Khác</option></select></label><label className="font-semibold">Email<input name="email" type="email" className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2" /></label><label className="font-semibold">Số điện thoại<input name="phone" inputMode="tel" className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2" /></label></div><label className="mt-4 block font-semibold">Nội dung<textarea required name="message" rows={6} className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2" placeholder="Mô tả câu hỏi hoặc đề xuất, không kèm dữ liệu sức khỏe định danh." /></label><button disabled={sending} className="mt-4 rounded bg-[#123c36] px-5 py-2.5 font-semibold text-white disabled:bg-[#66847b]">{sending ? "Đang gửi…" : "Gửi liên hệ"}</button>{message && <p className="mt-3 rounded border border-[#8fa99e] bg-[#f1f6f4] p-3 font-semibold">{message}</p>}</form><aside className="rounded-xl border-2 border-[#52786d] bg-white p-5"><h2 className="text-xl font-semibold">Thông tin hỗ trợ</h2><p className="mt-4 font-semibold text-[#123c36]">{settings.contactName}</p>{settings.organization && <p className="mt-1">{settings.organization}</p>}{settings.phone && <a className="mt-4 block text-lg font-semibold text-[#123c36] hover:underline" href={`tel:${settings.phone.replace(/\s/g, "")}`}>☎ {settings.phone}</a>}{settings.email && <a className="mt-2 block hover:underline" href={`mailto:${settings.email}`}>{settings.email}</a>}{settings.address && <p className="mt-2">{settings.address}</p>}{settings.zaloUrl && <a className="mt-5 inline-block rounded bg-[#0068ff] px-4 py-2 font-semibold text-white" href={settings.zaloUrl} target="_blank" rel="noreferrer">Mở nhóm hỗ trợ Zalo</a>}<p className="mt-5 border-t border-[#b7c1bd] pt-4 text-sm">Với tình huống cấp cứu hoặc cần tư vấn điều trị, hãy liên hệ cơ sở y tế phù hợp.</p></aside></div></div>;
}
