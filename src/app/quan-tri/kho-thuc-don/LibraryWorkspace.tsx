import TemplateCatalog from "./TemplateCatalog";
import Icon from "@/components/ui/Icon";
import HelpPanel from "../HelpPanel";
import styles from "./library.module.css";

export default function LibraryWorkspace() {
  return <div className={styles.workspace} data-menu-library data-admin-workspace>
    <header className={styles.header}>
      <a href="/quan-tri" className={styles.breadcrumb}>← Quản trị</a>
      <h1>Kho mẫu thực đơn</h1>
      <p className={styles.description}>Tìm trong toàn bộ kho, lọc và mở thực đơn theo từng ngày.</p>
      <a href="/quan-tri/ket-noi-ai" className={styles.primary}><Icon name="plus" className="h-4 w-4" />Thêm qua AI</a>
    </header>
    <TemplateCatalog />
    <HelpPanel><nav aria-label="Thao tác kho mẫu" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[var(--line)] pb-2"><a href="/quan-tri/ket-noi-ai" className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline underline-offset-4"><Icon name="shield-check" className="h-4 w-4" />Ủy quyền AI thêm mẫu</a><a href="/quan-tri/kho-thuc-don/huong-dan" className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline underline-offset-4"><Icon name="book-open" className="h-4 w-4" />Hướng dẫn &amp; căn cứ</a></nav><div className="grid gap-3 md:grid-cols-3"><p><strong>1. Thêm mẫu:</strong> ủy quyền cho AI, giao việc lập thực đơn rồi yêu cầu lưu nháp.</p><p><strong>2. Tra cứu:</strong> tìm tên thực đơn, món ăn hoặc đơn vị; lọc chế độ, kcal và bữa phục vụ rồi mở đúng ngày.</p><p><strong>3. Kiểm tra và duyệt:</strong> mở mẫu để sửa món/định lượng, phân tích từng nhóm và duyệt phiên bản. Chưa có xuất đi chợ tập thể.</p></div></HelpPanel>
  </div>;
}
