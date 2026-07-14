import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { searchTokens } from "@/lib/search";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 30;
const TYPE_LABELS: Record<string, string> = { TS: "Tươi sống", CB: "Chế biến", MA: "Món ăn", SP: "Sản phẩm" };

export default async function ThucPhamPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; type?: string; source?: string; group?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type = ["TS", "CB", "MA", "SP"].includes(sp.type ?? "") ? sp.type ?? "" : "";
  const source = ["VDD", "RNI"].includes(sp.source ?? "") ? sp.source ?? "" : "";
  const group = (sp.group ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const tokens = searchTokens(q);
  const where: Prisma.FoodWhereInput = {
    ...(tokens.length ? { AND: tokens.map((token) => ({ OR: [{ nameNormalized: { contains: token } }, { aliases: { some: { aliasNormalized: { contains: token } } } }] })) } : {}),
    ...(type ? { foodType: type } : {}),
    ...(source ? { source } : {}),
    ...(group ? { foodGroup: group } : {}),
  };

  const [items, total, types, sources, groups, mealRecords] = await Promise.all([
    prisma.food.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, source: true, foodType: true, foodGroup: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true },
    }),
    prisma.food.count({ where }),
    prisma.food.groupBy({ by: ["foodType"], where: { foodType: { not: null } }, orderBy: { foodType: "asc" } }),
    prisma.food.groupBy({ by: ["source"], orderBy: { source: "asc" } }),
    prisma.food.groupBy({ by: ["foodGroup"], where: { foodGroup: { not: null } }, orderBy: { foodGroup: "asc" } }),
    prisma.food.count({ where: { foodType: "MA" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (source) params.set("source", source);
    if (group) params.set("group", group);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="border-b-2 border-[#123c36] pb-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">DANH MỤC THAM CHIẾU</p>
        <h1 className="mt-1 text-3xl font-semibold">Tra cứu thực phẩm</h1>
        <p className="mt-2 max-w-4xl text-neutral-900">Giá trị dinh dưỡng đều tính trên 100 g phần ăn được. Danh mục này bao gồm cả các bản ghi <strong>món ăn</strong> đã có số liệu dinh dưỡng.</p>
      </section>

      <section className="grid gap-px overflow-hidden rounded-lg border-2 border-[#123c36] bg-[#123c36] sm:grid-cols-3">
        <div className="bg-white p-4"><p className="text-xs font-semibold tracking-wide text-[#123c36]">KẾT QUẢ TRA CỨU</p><p className="mt-1 text-2xl font-semibold">{total.toLocaleString("vi-VN")}</p><p className="text-sm text-neutral-900">bản ghi phù hợp</p></div>
        <div className="bg-white p-4"><p className="text-xs font-semibold tracking-wide text-[#123c36]">MÓN ĂN TRONG FOOD</p><p className="mt-1 text-2xl font-semibold">{mealRecords.toLocaleString("vi-VN")}</p><p className="text-sm text-neutral-900">bản ghi loại Món ăn (MA)</p></div>
        <div className="bg-[#edf4f0] p-4"><p className="text-xs font-semibold tracking-wide text-[#123c36]">PHÂN BIỆT DỮ LIỆU</p><p className="mt-1 font-semibold">MA = số liệu dinh dưỡng</p><p className="text-sm text-neutral-900">Công thức nguyên liệu xem tại Món ăn.</p></div>
      </section>

      <form className="grid gap-3 rounded-lg border-2 border-[#7f948d] bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" action="/thuc-pham">
        <label className="text-sm font-semibold text-neutral-950 sm:col-span-2">Tên thực phẩm hoặc món ăn
          <input type="text" name="q" defaultValue={q} placeholder="VD: cá chép, bún riêu; gõ không dấu được" className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-neutral-950">Loại bản ghi
          <select name="type" defaultValue={type} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2"><option value="">Tất cả loại</option>{types.map((item) => <option key={item.foodType} value={item.foodType ?? ""}>{TYPE_LABELS[item.foodType ?? ""] ?? item.foodType}</option>)}</select>
        </label>
        <label className="text-sm font-semibold text-neutral-950">Nguồn dữ liệu
          <select name="source" defaultValue={source} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2"><option value="">Tất cả nguồn</option>{sources.map((item) => <option key={item.source} value={item.source}>{item.source}</option>)}</select>
        </label>
        <label className="text-sm font-semibold text-neutral-950">Nhóm thực phẩm
          <select name="group" defaultValue={group} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2"><option value="">Tất cả nhóm</option>{groups.map((item) => <option key={item.foodGroup} value={item.foodGroup ?? ""}>{item.foodGroup}</option>)}</select>
        </label>
        <div className="flex items-end gap-2"><button className="flex-1 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0d2e29]">Tra cứu</button>{(q || type || source || group) && <Link href="/thuc-pham" className="rounded-md border border-[#52786d] px-3 py-2 font-semibold text-[#123c36]">Xóa</Link>}</div>
      </form>

      <section className="overflow-x-auto rounded-lg border-2 border-[#123c36] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#123c36] bg-[#edf4f0] px-4 py-3"><div><h2 className="text-xl font-semibold">Kết quả thực phẩm &amp; món ăn dinh dưỡng</h2><p className="text-sm text-neutral-900">Nhãn trong cột “Dạng dữ liệu” cho biết cách sử dụng bản ghi.</p></div><Link href="/mon-an" className="rounded-md border-2 border-[#123c36] bg-white px-3 py-1.5 text-sm font-semibold text-[#123c36] hover:bg-[#dcebe4]">Tra cứu công thức món ăn →</Link></div>
        <table className="min-w-[950px] w-full text-sm"><thead className="text-left text-neutral-950"><tr><th className="px-4 py-3 font-semibold">Tên bản ghi</th><th className="px-4 py-3 font-semibold">Dạng dữ liệu / nguồn</th><th className="px-4 py-3 font-semibold">Nhóm phân loại</th><th className="px-4 py-3 text-right font-semibold">Kcal</th><th className="px-4 py-3 text-right font-semibold">Đạm (g)</th><th className="px-4 py-3 text-right font-semibold">Béo (g)</th><th className="px-4 py-3 text-right font-semibold">Bột đường (g)</th></tr></thead><tbody>{items.map((food) => { const isMeal = food.foodType === "MA"; return <tr key={food.id} className={isMeal ? "bg-[#fff8df] hover:bg-[#fff1bf]" : "bg-white hover:bg-[#f2f7f4]"}><td className="px-4 py-3"><Link href={`/thuc-pham/${food.id}`} className="font-semibold text-[#123c36] hover:text-black">{food.name}</Link>{isMeal && <p className="mt-1 text-xs font-semibold text-[#694d00]">Món ăn có số liệu dinh dưỡng; không mặc định có công thức nguyên liệu.</p>}</td><td className="px-4 py-3"><span className={`inline-flex rounded-sm border px-2 py-0.5 text-xs font-semibold ${isMeal ? "border-[#a77b10] bg-[#fff3c4] text-[#5d4300]" : "border-[#5c7d74] bg-[#edf4f0] text-[#123c36]"}`}>{TYPE_LABELS[food.foodType ?? ""] ?? "Chưa phân loại"}</span><p className="mt-1 text-xs text-neutral-900">Nguồn: {food.source}</p></td><td className="px-4 py-3">{food.foodGroup ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{food.energyKcal ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{food.proteinG ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{food.lipidG ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{food.glucidG ?? "—"}</td></tr>; })}{items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-900">Không tìm thấy bản ghi phù hợp với điều kiện tra cứu.</td></tr>}</tbody></table>
      </section>

      {totalPages > 1 && <div className="flex items-center justify-center gap-3"><Link href={qs(Math.max(1, page - 1))} className={`rounded-md border-2 border-[#123c36] px-3 py-1.5 ${page <= 1 ? "pointer-events-none border-neutral-300 text-neutral-500" : "text-[#123c36] hover:bg-white"}`}>← Trước</Link><span>Trang {page} / {totalPages}</span><Link href={qs(Math.min(totalPages, page + 1))} className={`rounded-md border-2 border-[#123c36] px-3 py-1.5 ${page >= totalPages ? "pointer-events-none border-neutral-300 text-neutral-500" : "text-[#123c36] hover:bg-white"}`}>Sau →</Link></div>}
    </div>
  );
}
