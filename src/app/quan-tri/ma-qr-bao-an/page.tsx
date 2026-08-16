import QRCode from "qrcode";
import Image from "next/image";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Mã QR thực đơn theo khoa | Dinh dưỡng 2598" };

export default async function Page() {
  const user = await requireSessionUser();
  if (!["ADMIN", "DIETITIAN", "KITCHEN_MANAGER"].includes(user.role)) return <main><p>Bạn không có quyền xem mã QR này.</p></main>;
  const site = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!site) return <main className="mx-auto max-w-xl"><p className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-900">Chưa cấu hình PUBLIC_SITE_URL.</p></main>;
  const departments = await prisma.department.findMany({ where: { status: "ACTIVE", publicToken: { not: null } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, publicToken: true } });
  const cards = await Promise.all(departments.map(async (department) => { const url = `${site}/thuc-don/${department.publicToken}`; return { ...department, url, qr: await QRCode.toDataURL(url, { width: 700, margin: 2, errorCorrectionLevel: "H", color: { dark: "#123c36", light: "#ffffff" } }) }; }));
  return <main className="mx-auto max-w-6xl space-y-5"><header className="rounded-3xl bg-[#123c36] p-6 text-white"><p className="text-xs font-bold tracking-[.18em] text-[#bad8cd]">DINH DƯỠNG 2598</p><h1 className="mt-1 text-3xl font-black">Mã QR thực đơn theo khoa</h1><p className="mt-2 text-white/80">In đúng mã tại từng khoa. Người bệnh chỉ xem thực đơn và gửi ghi chú; không thể thay đổi số suất.</p></header><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <section key={card.id} className="break-inside-avoid rounded-2xl border-2 border-[#123c36] bg-white p-5 text-center"><h2 className="text-xl font-black text-[#123c36]">{card.name}</h2><p className="mt-1 text-sm text-neutral-600">Quét để xem thực đơn hôm nay</p><Image unoptimized src={card.qr} width={700} height={700} alt={`Mã QR thực đơn ${card.name}`} className="mx-auto mt-3 h-auto w-full max-w-64" /><p className="mt-3 break-all text-xs text-neutral-500">{card.url}</p></section>)}</div>{!cards.length && <p className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-900">Chưa có khoa nào được cấp mã QR. Tạo lại hoặc cập nhật khoa trong phần quản trị.</p>}</main>;
}
