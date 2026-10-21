import TemplateCatalog from "./TemplateCatalog";

export default function LibraryWorkspace() {
  return <div className="space-y-5" data-menu-library>
    <a href="/quan-tri" className="inline-block py-2 font-semibold text-[#123c36] underline underline-offset-4">← Quản trị</a>
    <header className="rounded-xl border border-[#b7ccc0] bg-white p-6"><p className="text-xs font-semibold tracking-widest text-[#52786d]">DỮ LIỆU &amp; THỰC ĐƠN · NỘI BỘ</p><h1 className="mt-2 text-3xl font-semibold text-[#123c36]">Kho mẫu thực đơn</h1><p className="mt-3 text-neutral-700">Mẫu cá nhân và tập thể, lưu nháp có phiên bản để xem lại và tiếp tục biên soạn.</p><nav aria-label="Thao tác kho mẫu" className="mt-5 flex flex-wrap gap-3"><a href="/quan-tri/ket-noi-ai" className="rounded-lg bg-[#123c36] px-4 py-3 font-semibold text-white">Ủy quyền AI thêm mẫu</a><a href="/quan-tri/kho-thuc-don/huong-dan" className="rounded-lg border border-[#8fa99e] px-4 py-3 font-semibold text-[#123c36]">Hướng dẫn &amp; căn cứ</a></nav></header>
    <TemplateCatalog />
  </div>;
}
