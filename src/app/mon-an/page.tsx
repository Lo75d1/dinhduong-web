import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { searchTokens } from "@/lib/search";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 30;

export default async function MonAnPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string; age?: string; disease?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const category = (sp.category ?? "").trim();
  const age = (sp.age ?? "").trim();
  const disease = (sp.disease ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const tokens = searchTokens(q);

  const where: Prisma.DishWhereInput = {
    ...(tokens.length ? { AND: tokens.map((token) => ({ nameNormalized: { contains: token } })) } : {}),
    ...(category ? { categoryRaw: category } : {}),
    ...(age ? { ageGroup: age } : {}),
    ...(disease ? { diseaseDiet: disease } : {}),
  };
  const foodMealWhere: Prisma.FoodWhereInput = { foodType: "MA", ...(tokens.length ? { AND: tokens.map((token) => ({ nameNormalized: { contains: token } })) } : {}) };

  const [items, total, categories, ageGroups, diseaseGroups, foodMeals, foodMealTotal] = await Promise.all([
    prisma.dish.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, name: true, source: true, totalWeightG: true, servingUnit: true, categoryRaw: true, diseaseDiet: true, ageGroup: true, _count: { select: { ingredients: true } } } }),
    prisma.dish.count({ where }),
    prisma.dish.groupBy({ by: ["categoryRaw"], where: { categoryRaw: { not: null } }, orderBy: { categoryRaw: "asc" } }),
    prisma.dish.groupBy({ by: ["ageGroup"], where: { ageGroup: { not: null } }, orderBy: { ageGroup: "asc" } }),
    prisma.dish.groupBy({ by: ["diseaseDiet"], where: { diseaseDiet: { not: null } }, orderBy: { diseaseDiet: "asc" } }),
    prisma.food.findMany({ where: foodMealWhere, orderBy: { name: "asc" }, take: 30, select: { id: true, name: true, source: true, foodGroup: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true } }),
    prisma.food.count({ where: foodMealWhere }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => { const params = new URLSearchParams(); if (q) params.set("q", q); if (category) params.set("category", category); if (age) params.set("age", age); if (disease) params.set("disease", disease); params.set("page", String(p)); return `?${params.toString()}`; };
  const hasRecipeFilters = Boolean(category || age || disease);

  return <div className="flex flex-col gap-5">
    <section className="border-b-2 border-[#123c36] pb-4"><p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">DANH MỤC MÓN ĂN</p><h1 className="mt-1 text-3xl font-semibold">Tra cứu món ăn</h1><p className="mt-2 max-w-4xl text-neutral-900">Danh mục này tách rõ <strong>công thức món ăn</strong> với <strong>món ăn chỉ có số liệu dinh dưỡng</strong>, tránh hiểu nhầm khi lập khẩu phần.</p></section>

    <section className="grid gap-px overflow-hidden rounded-lg border-2 border-[#123c36] bg-[#123c36] sm:grid-cols-3"><div className="bg-white p-4"><p className="text-xs font-semibold tracking-wide text-[#123c36]">CÔNG THỨC RNI</p><p className="mt-1 text-2xl font-semibold">{total.toLocaleString("vi-VN")}</p><p className="text-sm text-neutral-900">kết quả theo bộ lọc công thức</p></div><div className="bg-white p-4"><p className="text-xs font-semibold tracking-wide text-[#123c36]">MÓN ĂN TRONG FOOD</p><p className="mt-1 text-2xl font-semibold">{foodMealTotal.toLocaleString("vi-VN")}</p><p className="text-sm text-neutral-900">có số liệu /100 g, không có công thức</p></div><div className="bg-[#edf4f0] p-4"><p className="text-xs font-semibold tracking-wide text-[#123c36]">CÁCH ĐỌC</p><p className="mt-1 font-semibold">Công thức ≠ số liệu /100 g</p><p className="text-sm text-neutral-900">Kiểm tra nhãn vàng trước khi sử dụng.</p></div></section>

    <form className="grid gap-3 rounded-lg border-2 border-[#7f948d] bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" action="/mon-an"><label className="text-sm font-semibold text-neutral-950 sm:col-span-2">Tên món ăn<input type="text" name="q" defaultValue={q} placeholder="Gõ tên món, có thể không dấu..." className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label><label className="text-sm font-semibold text-neutral-950">Nhóm món gốc<select name="category" defaultValue={category} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2"><option value="">Tất cả nhóm món</option>{categories.map((item) => <option key={item.categoryRaw} value={item.categoryRaw ?? ""}>{item.categoryRaw}</option>)}</select></label><label className="text-sm font-semibold text-neutral-950">Nhóm tuổi<select name="age" defaultValue={age} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2"><option value="">Tất cả nhóm tuổi</option>{ageGroups.map((item) => <option key={item.ageGroup} value={item.ageGroup ?? ""}>{item.ageGroup}</option>)}</select></label><label className="text-sm font-semibold text-neutral-950">Chế độ bệnh lý<select name="disease" defaultValue={disease} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2"><option value="">Không giới hạn</option>{diseaseGroups.map((item) => <option key={item.diseaseDiet} value={item.diseaseDiet ?? ""}>{item.diseaseDiet}</option>)}</select></label><div className="flex items-end"><button className="w-full rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0d2e29]">Tra cứu</button></div></form>

    <section className="overflow-x-auto rounded-lg border-2 border-[#123c36] bg-white"><div className="border-b-2 border-[#123c36] bg-[#edf4f0] px-4 py-3"><h2 className="text-xl font-semibold">A. Công thức món ăn</h2><p className="text-sm text-neutral-900">Món từ RNI có danh sách nguyên liệu, khối lượng và cách chế biến khi nguồn có cung cấp.</p></div><table className="min-w-[950px] w-full text-sm"><thead className="text-left text-neutral-950"><tr><th className="px-4 py-3">Tên món / nguồn</th><th className="px-4 py-3">Nhóm món gốc</th><th className="px-4 py-3 text-right">Nguyên liệu</th><th className="px-4 py-3">Khẩu phần mặc định</th><th className="px-4 py-3">Đối tượng / chế độ</th></tr></thead><tbody>{items.map((dish) => <tr key={dish.id} className="bg-white hover:bg-[#f2f7f4]"><td className="px-4 py-3"><Link href={`/mon-an/${dish.id}`} className="font-semibold text-[#123c36] hover:text-black">{dish.name}</Link><p className="mt-1 text-xs text-neutral-900">Công thức · nguồn: {dish.source}</p></td><td className="px-4 py-3">{dish.categoryRaw ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{dish._count.ingredients}</td><td className="px-4 py-3">{dish.totalWeightG ? `${dish.totalWeightG} g${dish.servingUnit ? ` / ${dish.servingUnit}` : ""}` : "—"}</td><td className="px-4 py-3">{dish.diseaseDiet || dish.ageGroup ? <div className="flex flex-wrap gap-1">{dish.diseaseDiet && <span className="rounded-sm border border-[#9f3f3f] bg-[#fff0f0] px-2 py-0.5 text-xs font-semibold text-[#6b1d1d]">{dish.diseaseDiet}</span>}{dish.ageGroup && <span className="rounded-sm border border-[#386f99] bg-[#edf7ff] px-2 py-0.5 text-xs font-semibold text-[#17496e]">{dish.ageGroup}</span>}</div> : "—"}</td></tr>)}{items.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-neutral-900">Không tìm thấy công thức phù hợp.</td></tr>}</tbody></table></section>

    <section className="overflow-x-auto rounded-lg border-2 border-[#a77b10] bg-white"><div className="border-b-2 border-[#a77b10] bg-[#fff8df] px-4 py-3"><h2 className="text-xl font-semibold">B. Món ăn có số liệu dinh dưỡng</h2><p className="text-sm text-neutral-900">Các bản ghi loại “Món ăn” trong Food được đưa vào đây để tra cứu chung. Đây không phải công thức, nên không hiển thị nguyên liệu hoặc cách chế biến.</p>{hasRecipeFilters && <p className="mt-1 text-xs font-semibold text-[#694d00]">Bộ lọc nhóm món/tuổi/bệnh lý chỉ áp dụng cho bảng A; bảng này vẫn theo từ khoá tên món.</p>}</div><table className="min-w-[950px] w-full text-sm"><thead className="text-left text-neutral-950"><tr><th className="px-4 py-3">Tên món</th><th className="px-4 py-3">Ghi chú nhận biết</th><th className="px-4 py-3">Nguồn / nhóm</th><th className="px-4 py-3 text-right">Kcal</th><th className="px-4 py-3 text-right">Đạm (g)</th><th className="px-4 py-3 text-right">Béo (g)</th><th className="px-4 py-3 text-right">Bột đường (g)</th></tr></thead><tbody>{foodMeals.map((food) => <tr key={food.id} className="bg-[#fffdf7] hover:bg-[#fff1bf]"><td className="px-4 py-3"><Link href={`/thuc-pham/${food.id}`} className="font-semibold text-[#123c36] hover:text-black">{food.name}</Link></td><td className="px-4 py-3"><span className="inline-flex rounded-sm border border-[#a77b10] bg-[#fff3c4] px-2 py-0.5 text-xs font-semibold text-[#5d4300]">Số liệu dinh dưỡng /100 g</span><p className="mt-1 text-xs text-neutral-900">Không có công thức nguyên liệu trong nguồn hiện tại.</p></td><td className="px-4 py-3">{food.source}<p className="mt-1 text-xs text-neutral-900">{food.foodGroup ?? "Chưa phân nhóm"}</p></td><td className="px-4 py-3 text-right tabular-nums">{food.energyKcal ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{food.proteinG ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{food.lipidG ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{food.glucidG ?? "—"}</td></tr>)}{foodMeals.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-900">Không tìm thấy món ăn có số liệu dinh dưỡng theo từ khoá này.</td></tr>}</tbody></table>{foodMealTotal > foodMeals.length && <div className="border-t border-[#a77b10] px-4 py-3 text-sm text-neutral-900">Đang hiển thị 30 / {foodMealTotal.toLocaleString("vi-VN")} bản ghi. Dùng từ khoá để thu hẹp danh sách.</div>}</section>

    {totalPages > 1 && <div className="flex items-center justify-center gap-3"><Link href={qs(Math.max(1, page - 1))} className={`rounded-md border-2 border-[#123c36] px-3 py-1.5 ${page <= 1 ? "pointer-events-none border-neutral-300 text-neutral-500" : "text-[#123c36] hover:bg-white"}`}>← Trước</Link><span>Trang {page} / {totalPages}</span><Link href={qs(Math.min(totalPages, page + 1))} className={`rounded-md border-2 border-[#123c36] px-3 py-1.5 ${page >= totalPages ? "pointer-events-none border-neutral-300 text-neutral-500" : "text-[#123c36] hover:bg-white"}`}>Sau →</Link></div>}
  </div>;
}
