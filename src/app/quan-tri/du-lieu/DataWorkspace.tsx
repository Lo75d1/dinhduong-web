"use client";

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
            <span className="rounded-full border border-[#8db3a6] bg-white px-3 py-1.5 text-xs font-semibold text-[#0d5448]">Có kiểm soát thay đổi</span>
          </div>
        </div>
        <div className="grid border-t border-[#d7e3de] bg-[#f7fbf9] text-sm sm:grid-cols-3">
          <div className="border-b border-r border-[#d7e3de] px-4 py-3"><b className="text-[#123c36]">VDD</b><span className="ml-1 text-[#55736a]">thực phẩm, món ăn, ảnh tham chiếu</span></div>
          <div className="border-b border-r border-[#d7e3de] px-4 py-3"><b className="text-[#123c36]">RNI</b><span className="ml-1 text-[#55736a]">công thức, nguyên liệu, ảnh tham chiếu</span></div>
          <div className="border-b border-[#d7e3de] px-4 py-3"><b className="text-violet-800">Long Châu</b><span className="ml-1 text-[#55736a]">thuốc / TPBS tham khảo</span></div>
        </div>
      </section>

      <DataManager />
      <BulkClassifyEditor />
      <ImageSourceSync />
      <MedicationImport />
    </div>
  );
}
