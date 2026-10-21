import TemplateCatalog from "./TemplateCatalog";
import Icon from "@/components/ui/Icon";
import HelpPanel from "../HelpPanel";

export default function LibraryWorkspace() {
  return <div className="space-y-3" data-menu-library data-admin-workspace>
    <header className="border-b border-[var(--line)] pb-3"><a href="/quan-tri" className="inline-flex min-h-11 items-center text-sm text-[var(--muted)] underline underline-offset-4">← Quản trị</a><h1 className="flex items-center gap-2 text-[22px] font-semibold leading-7 sm:text-2xl text-[var(--ink)]"><Icon name="notebook-tabs" className="h-6 w-6 text-[var(--accent-ink)]" />Kho mẫu thực đơn</h1></header>
    <HelpPanel><nav aria-label="Thao tác kho mẫu" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[var(--line)] pb-2"><a href="/quan-tri/ket-noi-ai" className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline underline-offset-4"><Icon name="shield-check" className="h-4 w-4" />Ủy quyền AI thêm mẫu</a><a href="/quan-tri/kho-thuc-don/huong-dan" className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline underline-offset-4"><Icon name="book-open" className="h-4 w-4" />Hướng dẫn &amp; căn cứ</a></nav><div className="grid gap-3 md:grid-cols-3"><p><strong>1. Thêm mẫu:</strong> ủy quyền cho AI, giao việc lập thực đơn rồi yêu cầu lưu nháp.</p><p><strong>2. Tra cứu:</strong> tìm tên, lọc cá nhân/tập thể; mở từng mẫu để xem ngày, bữa và nhóm suất.</p><p><strong>3. Xem lại:</strong> mẫu có lịch sử phiên bản. Chưa hỗ trợ tính dinh dưỡng và xuất đi chợ tập thể.</p></div></HelpPanel>
    <TemplateCatalog />
  </div>;
}
