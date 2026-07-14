"use client";

import Link from "next/link";
import { useState } from "react";

type Overview = {
  totals: { foods: number; dishes: number; missingEnergy: number; missingMacros: number; missingGroup: number; duplicateNormalizedNames: number; unlinkedIngredients: number };
  foodsNeedReview: Array<{ id: string; name: string; source: string; foodType: string | null; energyKcal: number | null; proteinG: number | null; lipidG: number | null; glucidG: number | null }>;
  dishesNeedReview: Array<{ id: string; name: string; source: string; categoryRaw: string | null; _count: { ingredients: number } }>;
};

export default function AdminConsole() {
  const [password, setPassword] = useState("");
  const [activePass, setActivePass] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function request(path: string, pass = activePass) {
    return fetch(path, { headers: { "x-admin-preview-pass": pass } });
  }

  async function openAdmin(pass = password) {
    setLoading(true);
    setMessage("");
    try {
      const response = await request("/api/admin/preview/overview", pass);
      const data = await response.json();
      if (!response.ok) { setMessage(data.error ?? "Không mở được khu quản trị."); return; }
      setActivePass(pass);
      setOverview(data);
    } catch {
      setMessage("Không kết nối được máy chủ để kiểm tra dữ liệu.");
    } finally { setLoading(false); }
  }

  async function exportData() {
    setLoading(true);
    setMessage("");
    try {
      const response = await request("/api/admin/preview/export");
      if (!response.ok) { const data = await response.json(); setMessage(data.error ?? "Không thể xuất dữ liệu."); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "du-lieu-dinh-duong.xls";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Đã xuất dữ liệu thực phẩm và công thức món ăn ra Excel.");
    } catch { setMessage("Xuất dữ liệu không thành công. Hãy thử lại."); }
    finally { setLoading(false); }
  }

  function logout() {
    setActivePass("");
    setPassword("");
    setOverview(null);
    setMessage("");
  }

  if (!overview) return <section className="mx-auto max-w-md rounded-xl border-2 border-[#123c36] bg-white p-6 shadow-sm"><p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">KIỂM TRA NỘI BỘ</p><h1 className="mt-2 text-3xl font-semibold text-neutral-950">Khu vực quản trị</h1><p className="mt-3 text-neutral-900">Chỉ dùng để rà dữ liệu nguồn trên môi trường kiểm tra. Website chính thức sẽ dùng tài khoản quản trị và phân quyền.</p><form onSubmit={(event) => { event.preventDefault(); void openAdmin(); }} className="mt-5"><label className="font-semibold text-neutral-950">Mã kiểm tra nội bộ<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className="mt-1 w-full rounded-md border-2 border-[#52786d] px-3 py-2" /></label><button disabled={loading} className="mt-4 w-full rounded-md bg-[#123c36] px-4 py-2.5 font-semibold text-white disabled:bg-[#66847b]">{loading ? "Đang kiểm tra…" : "Mở khu kiểm tra"}</button></form>{message && <p className="mt-3 rounded border-2 border-[#a77b10] bg-[#fff8df] p-3 text-sm font-semibold text-neutral-950">{message}</p>}<p className="mt-4 text-xs text-neutral-800">Cần bật rõ biến môi trường và đặt mã riêng tối thiểu 12 ký tự. Không có mật khẩu mặc định.</p></section>;

  const { totals } = overview;
  return <div className="flex flex-col gap-6"><section className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#123c36] pb-4"><div><p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">VẬN HÀNH DỮ LIỆU · KIỂM TRA TẠM THỜI</p><h1 className="mt-1 text-3xl font-semibold text-neutral-950">Quản trị dữ liệu dinh dưỡng</h1><p className="mt-2 max-w-3xl text-neutral-900">Kiểm tra độ đầy đủ, rà các liên kết công thức và xuất dữ liệu nguồn. Các màn hình này chỉ đọc dữ liệu, không tự sửa hay ghi đè bản gốc.</p></div><div className="flex gap-2"><button onClick={() => void openAdmin()} disabled={loading} className="rounded-md border-2 border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36]">Làm mới</button><button onClick={logout} className="rounded-md border-2 border-neutral-500 bg-white px-3 py-2 text-sm font-semibold text-neutral-900">Khóa lại</button></div></section>{message && <p className="rounded-md border-2 border-[#52786d] bg-white p-3 font-semibold text-neutral-950">{message}</p>}<section className="grid gap-px overflow-hidden rounded-lg border-2 border-[#123c36] bg-[#123c36] sm:grid-cols-2 lg:grid-cols-4">{[["Thực phẩm", totals.foods], ["Công thức món", totals.dishes], ["Thiếu năng lượng", totals.missingEnergy], ["Thiếu P/L/G", totals.missingMacros]].map(([label, value]) => <div key={String(label)} className="bg-white p-4"><p className="text-sm font-semibold text-neutral-900">{label}</p><p className="mt-1 text-2xl font-semibold text-[#123c36]">{value}</p></div>)}</section><section className="rounded-xl border-2 border-[#123c36] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#123c36] pb-4"><div><h2 className="text-xl font-semibold text-neutral-950">Xuất dữ liệu nguồn</h2><p className="mt-1 text-sm text-neutral-900">Một file Excel gồm hai sheet: toàn bộ thực phẩm và công thức món ăn kèm nguyên liệu liên kết.</p></div><button onClick={() => void exportData()} disabled={loading} className="rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white disabled:bg-[#66847b]">{loading ? "Đang xử lý…" : "Xuất Excel dữ liệu"}</button></div><p className="mt-3 text-sm text-neutral-900">File có đủ trường nguồn, phân loại và toàn bộ chất dinh dưỡng /100 g hiện có.</p></section><section className="rounded-xl border-2 border-[#7f948d] bg-white p-5"><h2 className="border-b-2 border-[#123c36] pb-3 text-xl font-semibold">Kiểm duyệt / rà dữ liệu nguồn</h2><p className="mt-2 text-sm text-neutral-900">Danh sách dưới đây là các bản ghi cần người quản trị kiểm tra lại trước khi quyết định bổ sung số liệu. Không có thao tác tự động sửa dữ liệu.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Thiếu nhóm thực phẩm", totals.missingGroup], ["Tên chuẩn hóa trùng", totals.duplicateNormalizedNames], ["Nguyên liệu món chưa liên kết", totals.unlinkedIngredients]].map(([label, value]) => <div key={String(label)} className="border-l-4 border-[#a77b10] bg-[#fff8df] p-3"><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div><div className="mt-5 overflow-x-auto"><h3 className="mb-2 font-semibold text-neutral-950">Thực phẩm thiếu số liệu cốt lõi</h3><table className="min-w-[900px] w-full text-sm"><thead><tr><th className="px-3 py-2 text-left">Tên</th><th className="px-3 py-2 text-left">Nguồn / loại</th><th className="px-3 py-2 text-right">Kcal</th><th className="px-3 py-2 text-right">Đạm</th><th className="px-3 py-2 text-right">Béo</th><th className="px-3 py-2 text-right">Bột đường</th><th className="px-3 py-2 text-left">Kiểm tra</th></tr></thead><tbody>{overview.foodsNeedReview.map((food) => <tr key={food.id}><td className="px-3 py-2 font-semibold"><Link href={`/thuc-pham/${food.id}`} className="text-[#123c36] hover:underline">{food.name}</Link></td><td className="px-3 py-2">{food.source} · {food.foodType ?? "—"}</td><td className="px-3 py-2 text-right">{food.energyKcal ?? "—"}</td><td className="px-3 py-2 text-right">{food.proteinG ?? "—"}</td><td className="px-3 py-2 text-right">{food.lipidG ?? "—"}</td><td className="px-3 py-2 text-right">{food.glucidG ?? "—"}</td><td className="px-3 py-2">Rà nguồn /100 g</td></tr>)}{overview.foodsNeedReview.length === 0 && <tr><td colSpan={7} className="px-3 py-7 text-center">Không có bản ghi thiếu năng lượng hoặc P/L/G.</td></tr>}</tbody></table></div><div className="mt-6 overflow-x-auto"><h3 className="mb-2 font-semibold text-neutral-950">Công thức có nguyên liệu chưa liên kết</h3><table className="min-w-[720px] w-full text-sm"><thead><tr><th className="px-3 py-2 text-left">Tên món</th><th className="px-3 py-2 text-left">Nguồn</th><th className="px-3 py-2 text-left">Nhóm</th><th className="px-3 py-2 text-right">Tổng nguyên liệu</th><th className="px-3 py-2">Hành động đề nghị</th></tr></thead><tbody>{overview.dishesNeedReview.map((dish) => <tr key={dish.id}><td className="px-3 py-2 font-semibold"><Link href={`/mon-an/${dish.id}`} className="text-[#123c36] hover:underline">{dish.name}</Link></td><td className="px-3 py-2">{dish.source}</td><td className="px-3 py-2">{dish.categoryRaw ?? "—"}</td><td className="px-3 py-2 text-right">{dish._count.ingredients}</td><td className="px-3 py-2">Đối chiếu và liên kết Food khi xác nhận</td></tr>)}{overview.dishesNeedReview.length === 0 && <tr><td colSpan={5} className="px-3 py-7 text-center">Không có công thức cần kiểm tra liên kết.</td></tr>}</tbody></table></div></section><section className="rounded-xl border-2 border-[#a77b10] bg-[#fff8df] p-5"><h2 className="text-xl font-semibold">Kiểm duyệt đề xuất từ người dùng</h2><p className="mt-2 text-neutral-900">Giao diện duyệt đề xuất đã có, nhưng bảng đề xuất/tài khoản chưa được đồng bộ an toàn vào database hiện tại nên chưa thể dùng chung. Phần kiểm tra dữ liệu nguồn và xuất Excel ở trên hoạt động độc lập, không cần migration này.</p></section></div>;
}
