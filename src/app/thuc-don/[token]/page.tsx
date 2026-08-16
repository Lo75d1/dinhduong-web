import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicMealReportForm from "@/app/bao-an/PublicMealReportForm";
import { mealPhotoPublicUrl } from "@/lib/meal-photo";

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
  return <main className="mx-auto max-w-3xl space-y-4 px-4 pb-12">
    <header className="rounded-3xl bg-[#123c36] p-6 text-white sm:p-8">
      <p className="text-xs font-medium tracking-[.18em] text-[#bad8cd]">DINH DƯỠNG 2598 · {department.name.toUpperCase()}</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Thực đơn hôm nay</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-white/80">Ngày {today.key.split("-").reverse().join("/")} · Chọn đúng dòng chế độ ăn đã được nhân viên y tế hướng dẫn.</p>
    </header>
    <section aria-labelledby="menu-title" className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#123c36]/10 px-5 py-4">
        <h2 id="menu-title" className="text-lg font-semibold text-[#123c36]">Các bữa trong ngày</h2>
        <span className="rounded-full bg-[#e1f5ee] px-3 py-1 text-xs font-medium text-[#085041]">Chỉ hiển thị thực đơn đã duyệt</span>
      </div>
      <div className="divide-y divide-[#123c36]/8">{mealTypes.map((meal) => {
        const menu = menuByMeal.get(meal.id);
        return <article key={meal.id} className="px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-[#123c36]">{meal.name}</h3>
            <span className="text-sm text-neutral-500">Phục vụ {meal.serviceLocalTime}</span>
          </div>
          {menu ? <div className="mt-3 grid gap-2.5 sm:grid-cols-2">{menu.items.map((item) =>
            <div key={item.id} className="rounded-xl border border-[#123c36]/10 bg-[#f6faf8] p-3.5">
              <b className="text-sm font-semibold text-[#0f6e56]">{item.dietType.name}</b>
              <p className="mt-1 text-[17px] leading-snug text-neutral-800">{item.dishName}</p>
              {item.note && <p className="mt-1 text-sm text-neutral-500">{item.note}</p>}
              {item.photoStoragePath && mealPhotoPublicUrl(item.photoStoragePath) && <figure className="mt-3 overflow-hidden rounded-xl border border-[#123c36]/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mealPhotoPublicUrl(item.photoStoragePath) ?? undefined} alt={`Ảnh đối chứng ${item.dietType.name}`} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="px-3 py-2 text-xs text-neutral-500">Ảnh suất mẫu để đối chiếu</figcaption>
              </figure>}
            </div>)}</div>
          : <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-3 text-neutral-500">Thực đơn đang được cập nhật.</p>}
        </article>;
      })}</div>
    </section>
    <aside className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900"><b>Lưu ý an toàn:</b> Thực đơn trên màn hình không thay thế chỉ định của bác sĩ hoặc chuyên gia dinh dưỡng. Nếu chưa biết chế độ ăn của mình, hãy hỏi điều dưỡng trước khi dùng.</aside>
    <PublicMealReportForm departmentToken={department.publicToken} />
  </main>;
}
