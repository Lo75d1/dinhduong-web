import Link from "next/link";

export const metadata = { title: "Xem thực đơn bệnh viện | Dinh dưỡng 2598" };

export default function Page() {
  return <main className="mx-auto max-w-xl py-16"><section className="rounded-3xl border-2 border-amber-400 bg-amber-50 p-6"><h1 className="text-2xl font-black text-amber-950">Cần mã QR của khoa</h1><p className="mt-2 text-amber-900">Mỗi khoa có một mã QR riêng để xem đúng thông tin và gửi ghi chú cho điều dưỡng. Vui lòng quét mã được niêm yết tại khoa.</p><Link href="/" className="mt-5 inline-block rounded-xl bg-[#123c36] px-4 py-2.5 font-bold text-white">Về trang chủ</Link></section></main>;
}
