import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicMealReportForm from "@/app/bao-an/PublicMealReportForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thực đơn hôm nay | Dinh dưỡng 2598", description: "Xem thực đơn bệnh viện và gửi ghi chú cho điều dưỡng khoa." };

function todayUtc() {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  return { key, date: new Date(`${key}T00:00:00.000Z`) };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const today = todayUtc();
  const department = await prisma.department.findFirst({ where: { publicToken: token, status: "ACTIVE" }, select: { name: true, publicToken: true } });
  if (!department?.publicToken) notFound();
  const [menus, mealTypes] = await Promise.all([
    prisma.kitchenMenu.findMany({ where: { mealDate: today.date, items: { some: { approvedAt: { not: null } } } }, include: { mealType: true, items: { where: { approvedAt: { not: null } }, include: { dietType: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { mealType: { sortOrder: "asc" } } }),
    prisma.mealType.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { serviceLocalTime: "asc" }] }),
  ]);
  const menuByMeal = new Map(menus.map((menu) => [menu.mealTypeId, menu]));
  return <main className="mx-auto max-w-4xl space-y-5 pb-12">
    <header className="rounded-3xl bg-[#123c36] p-5 text-white sm:p-7"><p className="text-xs font-bold tracking-[.18em] text-[#bad8cd]">DINH DƯỠNG 2598 · {department.name.toUpperCase()}</p><h1 className="mt-1 text-3xl font-black">Thực đơn hôm nay</h1><p className="mt-2 text-white/85">Ngày {today.key.split("-").reverse().join("/")} · Chọn đúng dòng chế độ ăn đã được nhân viên y tế hướng dẫn.</p></header>
    <section aria-labelledby="menu-title" className="rounded-2xl border-2 border-[#b7cbc3] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="menu-title" className="text-xl font-black text-[#123c36]">Các bữa trong ngày</h2><span className="rounded-full bg-[#e7f2ed] px-3 py-1 text-xs font-bold text-[#123c36]">Chỉ hiển thị thực đơn đã duyệt</span></div>
      <div className="mt-4 grid gap-3">{mealTypes.map((meal) => { const menu = menuByMeal.get(meal.id); return <article key={meal.id} className="rounded-xl border border-[#cbd9d4] p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-black text-[#123c36]">{meal.name}</h3><span className="text-sm font-bold text-neutral-600">Phục vụ {meal.serviceLocalTime}</span></div>{menu ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{menu.items.map((item) => <div key={item.id} className="rounded-lg bg-[#f1f7f4] p-3"><b className="text-[#123c36]">{item.dietType.name}</b><p className="mt-1 text-base text-neutral-800">{item.dishName}</p>{item.note && <p className="mt-1 text-sm text-neutral-600">{item.note}</p>}</div>)}</div> : <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-neutral-600">Thực đơn đang được cập nhật.</p>}</article>; })}</div>
    </section>
    <aside className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950"><b>Lưu ý an toàn:</b> Thực đơn trên màn hình không thay thế chỉ định của bác sĩ hoặc chuyên gia dinh dưỡng. Nếu chưa biết chế độ ăn của mình, hãy hỏi điều dưỡng trước khi dùng.</aside>
    <PublicMealReportForm departmentToken={department.publicToken} />
  </main>;
}
