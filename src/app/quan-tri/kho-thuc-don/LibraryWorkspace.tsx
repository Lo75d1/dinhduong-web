import TemplateCatalog from "./TemplateCatalog";
import Icon from "@/components/ui/Icon";
import HelpPanel from "../HelpPanel";

export default function LibraryWorkspace() {
  return <div className="space-y-3" data-menu-library data-admin-workspace>
    <a href="/quan-tri" className="inline-block py-2 font-semibold text-[var(--brand)] underline underline-offset-4">← Quản trị</a>
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold tracking-widest text-[var(--muted)]">DỮ LIỆU &amp; THỰC ĐƠN · NỘI BỘ</p><h1 className="task-title text-3xl font-semibold"><span className="task-icon"><Icon name="notebook-tabs" /></span>Kho mẫu thực đơn</h1></div><nav aria-label="Thao tác kho mẫu" className="flex flex-wrap gap-2"><a href="/quan-tri/ket-noi-ai" className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 py-2 font-semibold text-white">Ủy quyền AI thêm mẫu</a><a href="/quan-tri/kho-thuc-don/huong-dan" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--control-line)] bg-white px-4 py-2 font-semibold text-[var(--brand)]">Hướng dẫn &amp; căn cứ</a></nav></header>
    <HelpPanel><div className="grid gap-3 md:grid-cols-3"><p><strong>1. Thêm mẫu:</strong> ủy quyền cho AI, giao việc lập thực đơn rồi yêu cầu lưu nháp.</p><p><strong>2. Tra cứu:</strong> tìm tên, lọc cá nhân/tập thể; mở từng mẫu để xem ngày, bữa và nhóm suất.</p><p><strong>3. Xem lại:</strong> mẫu có lịch sử phiên bản. Chưa hỗ trợ tính dinh dưỡng và xuất đi chợ tập thể.</p></div></HelpPanel>
    <TemplateCatalog />
  </div>;
}
