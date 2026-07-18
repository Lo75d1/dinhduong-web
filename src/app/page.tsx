import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { defaultSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [foodCount, dishCount, settings] = await Promise.all([
    prisma.food.count(),
    prisma.dish.count(),
    prisma.siteSetting.findUnique({ where: { id: "public" }, select: { thankYouTitle: true, thankYouBody: true, contactName: true, organization: true, phone: true, email: true, address: true, zaloUrl: true } }).catch(() => null),
  ]);
  const thankYouTitle = settings?.thankYouTitle || defaultSiteSettings.thankYouTitle;
  const thankYouBody = settings?.thankYouBody || defaultSiteSettings.thankYouBody;
  const contactName = settings?.contactName || defaultSiteSettings.contactName;
  const organization = settings?.organization || defaultSiteSettings.organization;
  const phone = settings?.phone || defaultSiteSettings.phone;
  const email = settings?.email || defaultSiteSettings.email;
  const address = settings?.address || defaultSiteSettings.address;
  const zaloUrl = settings?.zaloUrl || defaultSiteSettings.zaloUrl;
  return <div className="-mx-5 -my-8 overflow-hidden bg-[#f1f6f4] sm:-mx-8">
    <section className="relative min-h-[510px] overflow-hidden border-b-4 border-[#123c36] bg-[#e6f1f2] px-5 py-12 sm:px-10 sm:py-16 lg:px-16">
      <Image src="/dinh-duong-2597-cover.jpg" alt="Rau xanh, thực phẩm lành mạnh và biểu mẫu đánh giá dinh dưỡng" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#eef8fb]/[.97] via-[#eef8fb]/[.87] to-white/20" />
      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
        <div className="[animation:clinical-enter_450ms_ease_both]"><p className="text-sm font-semibold tracking-[0.16em] text-[#123c36]">DINH DƯỠNG 2598</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[#123c36] sm:text-5xl">Dữ liệu khẩu phần rõ ràng cho từng quyết định chăm sóc.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-900">Tra cứu thành phần thực phẩm, lập khẩu phần theo bữa và xuất báo cáo đối chiếu. Thiết kế cho bác sĩ, dinh dưỡng viên, phụ huynh và người chăm sóc.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/tinh-khau-phan" className="rounded-md bg-[#123c36] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#0b302b]">Mở phiếu tính khẩu phần →</Link><Link href="/thuc-pham" className="rounded-md border-2 border-[#123c36] bg-white/90 px-5 py-3 font-semibold text-[#123c36] hover:bg-white">Tra cứu thực phẩm</Link></div></div>
        <aside className="rounded-xl border-2 border-[#9dbbae] bg-white/95 p-5 shadow-[0_10px_25px_rgba(18,60,54,0.12)] [animation:clinical-enter_550ms_ease_both]"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">TÌNH TRẠNG HỆ THỐNG</p><div className="mt-4 space-y-3"><Metric label="Thực phẩm / sản phẩm" value={foodCount.toLocaleString("vi-VN")} /><Metric label="Món ăn có công thức" value={dishCount.toLocaleString("vi-VN")} /><div className="border-t border-[#adc4b9] pt-3 text-sm text-neutral-900"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-700" />Dữ liệu hiển thị theo 100 g phần ăn được</div></div></aside>
      </div>
    </section>
    <section className="relative overflow-hidden px-5 py-10 sm:px-10 lg:px-16">
      <Image src="/dinh-duong-2597-cover.jpg" alt="" fill aria-hidden className="object-cover object-center opacity-[0.14]" />
      <div className="relative mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">QUY TRÌNH LÀM VIỆC</p><h2 className="mt-1 text-2xl font-semibold text-[#123c36]">Chọn điểm bắt đầu</h2></div><p className="max-w-xl text-sm text-neutral-900">Mỗi chức năng giữ nguồn dữ liệu, đơn vị tính và giới hạn sử dụng để thuận tiện khi kiểm tra hồ sơ.</p></div><div className="mt-5 grid gap-5 md:grid-cols-2"><Link href="/thuc-pham" className="clinical-card group rounded-xl border-2 border-[#7f948d] bg-white p-6 hover:-translate-y-0.5 hover:border-[#123c36]"><p className="text-sm font-semibold tracking-[0.12em] text-[#123c36]">01 · TRA CỨU</p><h3 className="mt-2 text-2xl font-semibold text-neutral-950">Thực phẩm và món ăn</h3><p className="mt-3 text-neutral-900">Tìm theo tên, nhóm và loại dữ liệu. Kiểm tra giá trị gốc trên 100 g trước khi đưa vào khẩu phần.</p><span className="mt-5 inline-block font-semibold text-[#123c36]">Mở tra cứu →</span></Link><Link href="/tinh-khau-phan" className="clinical-card group rounded-xl border-2 border-[#123c36] bg-[#f8fcfa] p-6 hover:-translate-y-0.5 hover:bg-white"><p className="text-sm font-semibold tracking-[0.12em] text-[#123c36]">02 · PHÂN TÍCH</p><h3 className="mt-2 text-2xl font-semibold text-neutral-950">Phiếu tính khẩu phần</h3><p className="mt-3 text-neutral-900">Nhập theo bữa, đối chiếu năng lượng – vi chất – chuẩn tăng trưởng và xuất báo cáo chuyên môn.</p><span className="mt-5 inline-block font-semibold text-[#123c36]">Bắt đầu tính →</span></Link></div><div className="mt-8 rounded-lg border-l-4 border-[#a77b10] bg-[#fff9e8] p-4 text-sm text-neutral-900"><b>Căn cứ chuyên môn:</b> Bảng thành phần thực phẩm Việt Nam – Viện Dinh dưỡng; khuyến nghị dinh dưỡng VDD; mã chế độ ăn Bộ Y tế; WHO Child Growth Standards 2006 và WHO Growth Reference 2007. <Link href="/tai-lieu-tham-khao" className="font-semibold text-[#123c36] underline underline-offset-2">Xem tài liệu tham khảo</Link></div></div>
    </section>
    <section className="px-5 pb-6 sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border-2 border-[#123c36] bg-white shadow-[0_12px_30px_rgba(18,60,54,.1)]"><div className="bg-gradient-to-br from-[#123c36] via-[#1f5c4f] to-[#50a486] px-7 py-10 text-white sm:px-12"><h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">{thankYouTitle}</h2></div><div className="px-7 py-8 sm:px-12"><div className="border-l-4 border-[#a77b10] pl-5"><p className="whitespace-pre-wrap font-serif text-lg leading-8 text-neutral-900">{thankYouBody}</p></div><p className="mt-6 border-t border-[#d0dbd6] pt-4 text-sm text-neutral-700">Mỗi ý kiến đóng góp là một phần quan trọng để công cụ phục vụ thực hành dinh dưỡng lâm sàng tốt hơn.</p><Link href="/lien-he" className="mt-5 inline-block rounded-md border-2 border-[#123c36] px-5 py-2.5 font-semibold text-[#123c36] hover:bg-[#edf4f0]">Gửi ý kiến đóng góp</Link></div></div></section>
    <section className="relative overflow-hidden px-5 pb-12 sm:px-10 lg:px-16">
      <Image src="/dinh-duong-2597-cover.jpg" alt="" fill aria-hidden className="object-cover object-center opacity-[0.14]" />
      <div className="relative mx-auto max-w-6xl rounded-xl border-2 border-[#7f948d] bg-white/95 p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">HỖ TRỢ &amp; LIÊN HỆ</p>
        <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Cần hỗ trợ hoặc góp ý?</h2>
        <p className="mt-2 max-w-2xl text-neutral-900">Liên hệ bộ phận phụ trách nếu cần hướng dẫn sử dụng, báo lỗi dữ liệu hoặc góp ý cải tiến công cụ.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContactCard label="Người phụ trách" value={contactName} sub={organization} />
          {phone && <ContactCard label="Điện thoại / Zalo" value={phone} href={`tel:${phone.replace(/\s/g, "")}`} />}
          {email && <ContactCard label="Email" value={email} href={`mailto:${email}`} />}
          {address && <ContactCard label="Địa chỉ" value={address} />}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {zaloUrl && <a href={zaloUrl} target="_blank" rel="noreferrer" className="rounded-md bg-[#123c36] px-5 py-2.5 font-semibold text-white hover:bg-[#0b302b]">Tham gia nhóm hỗ trợ Zalo</a>}
          <Link href="/lien-he" className="rounded-md border-2 border-[#123c36] px-5 py-2.5 font-semibold text-[#123c36] hover:bg-white">Gửi liên hệ qua website</Link>
        </div>
      </div>
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="flex items-baseline justify-between gap-4 border-b border-[#d0dfd8] pb-2"><span className="text-sm text-neutral-900">{label}</span><span className="text-xl font-semibold text-[#123c36]">{value}</span></div>; }

function ContactCard({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const content = <>
    <p className="text-xs font-semibold tracking-wide text-[#123c36]">{label}</p>
    <p className="mt-1 font-semibold text-neutral-950">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-neutral-700">{sub}</p>}
  </>;
  const className = "rounded-lg border border-[#c3d3cb] bg-[#f7faf8] p-4";
  return href ? <a href={href} className={`${className} block hover:border-[#123c36] hover:bg-white`}>{content}</a> : <div className={className}>{content}</div>;
}
