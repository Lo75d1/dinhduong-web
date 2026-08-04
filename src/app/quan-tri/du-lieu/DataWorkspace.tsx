"use client";

import Link from "next/link";
import BulkClassifyEditor from "./BulkClassifyEditor";
import DataManager from "./DataManager";
import ImageSourceSync from "./ImageSourceSync";
import MedicationImport from "./MedicationImport";

export default function DataWorkspace() {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border-2 border-[#123c36] bg-white shadow-[0_10px_24px_rgba(18,60,54,.06)]">
        <div className="bg-[linear-gradient(110deg,#f8fcfa,#eaf4ef)] px-5 py-5 sm:px-7">
          <p className="text-xs font-bold tracking-[.18em] text-[#0f5a4e]">QUẢN TRỊ DỮ LIỆU</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#102f2b]">Không gian dữ liệu hợp nhất</h1>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-[#405b55]">Quản lý thực phẩm, món ăn, ảnh tham chiếu, thuốc và thực phẩm bổ sung tại cùng một trang. Mỗi bản ghi vẫn giữ nhãn nguồn để đối chiếu và mọi lần lưu đều có lý do, nhật ký thay đổi.</p>
            </div>
            <span className="flex flex-wrap items-center gap-2"><Link href="/quan-tri/phan-loai" className="rounded-full border-2 border-[#0c5f4d] bg-[#0c5f4d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0b5549]">📱 Phân loại nhanh (điện thoại)</Link><span className="rounded-full border border-[#8db3a6] bg-white px-3 py-1.5 text-xs font-semibold text-[#0d5448]">Có kiểm soát thay đổi</span></span>
          </div>
        </div>
        <div className="grid border-t border-[#d7e3de] bg-[#f7fbf9] text-sm sm:grid-cols-3">
          <div className="border-b border-r border-[#d7e3de] px-4 py-3"><b className="text-[#123c36]">VDD</b><span className="ml-1 text-[#55736a]">thực phẩm, món ăn, ảnh tham chiếu</span></div>
          <div className="border-b border-r border-[#d7e3de] px-4 py-3"><b className="text-[#123c36]">RNI</b><span className="ml-1 text-[#55736a]">công thức, nguyên liệu, ảnh tham chiếu</span></div>
          <div className="border-b border-[#d7e3de] px-4 py-3"><b className="text-violet-800">Long Châu</b><span className="ml-1 text-[#55736a]">thuốc / TPBS tham khảo</span></div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[#0b6957] bg-white p-4 shadow-[0_8px_20px_rgba(18,60,54,.04)] sm:p-5">
        <p className="text-xs font-bold tracking-[.16em] text-[#0f5a4e]">XUẤT DỮ LIỆU OFFLINE</p>
        <h2 className="mt-0.5 text-lg font-semibold text-[#122f2a]">Tải đầy đủ — foods + món ăn (kèm nguyên liệu) + thuốc/TPBS</h2>
        <p className="mt-1 text-sm text-[#506761]">Bản đầy đủ để làm offline: JSON gộp có mọi chỉ số dinh dưỡng + công thức nguyên liệu từng món + kho thuốc/TPBS tham khảo (foods gồm cả VDD lẫn RNI để nguyên liệu tra được thành phần).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/admin/data/export-rni?format=json" download className="rounded-lg bg-[#123c36] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b5549]">⬇ Tải đầy đủ (JSON)</a>
          <a href="/api/admin/data/export-rni?format=foods" download className="rounded-lg border-2 border-[#0b6957] bg-white px-4 py-2 text-sm font-bold text-[#0b6957] hover:bg-[#eef6f1]">⬇ Foods (CSV)</a>
          <a href="/api/admin/data/export-rni?format=dishes" download className="rounded-lg border-2 border-[#0b6957] bg-white px-4 py-2 text-sm font-bold text-[#0b6957] hover:bg-[#eef6f1]">⬇ Món ăn (CSV)</a>
          <a href="/api/admin/data/export-rni?format=ingredients" download className="rounded-lg border-2 border-[#0b6957] bg-white px-4 py-2 text-sm font-bold text-[#0b6957] hover:bg-[#eef6f1]">⬇ Nguyên liệu món (CSV)</a>
          <a href="/api/admin/data/export-rni?format=medications" download className="rounded-lg border-2 border-violet-500 bg-white px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50">⬇ Thuốc/TPBS (CSV)</a>
        </div>
      </section>

      <DataManager />
      <BulkClassifyEditor />
      <ImageSourceSync />
      <MedicationImport />
    </div>
  );
}
