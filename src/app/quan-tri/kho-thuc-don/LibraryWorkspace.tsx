import TemplateCatalog from "./TemplateCatalog";
import Icon from "@/components/ui/Icon";
import HelpPanel from "../HelpPanel";
import styles from "./library.module.css";

export default function LibraryWorkspace() {
  return <div className={styles.workspace} data-menu-library data-admin-workspace>
    <header className={styles.header}>
      <a href="/quan-tri" className={styles.breadcrumb}>← Quản trị</a>
      <h1>Kho thực đơn</h1>
      <p className={styles.description}>Xem nhanh theo ngày, chọn nhiều thực đơn và kéo thả bữa ăn.</p>
    </header>
    <TemplateCatalog />
    <HelpPanel><nav aria-label="Thao tác kho mẫu" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[var(--line)] pb-2"><a href="/quan-tri/ket-noi-ai" className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline underline-offset-4"><Icon name="shield-check" className="h-4 w-4" />Thêm qua AI</a><a href="/quan-tri/kho-thuc-don/huong-dan" className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline underline-offset-4"><Icon name="book-open" className="h-4 w-4" />Hướng dẫn &amp; căn cứ</a></nav><div className="grid gap-3 md:grid-cols-3"><p><strong>Thực đơn:</strong> chọn ô ở các thẻ để chuyển kho, gắn hashtag hoặc xóa nhiều mục. Kéo tay nắm của thẻ sang tên kho để chuyển.</p><p><strong>Bữa ăn:</strong> chọn nhiều bữa, mở thực đơn khác rồi thả khay bữa vào ô ngày nhận. Có thể dùng nút Sao chép / chuyển bữa.</p><p><strong>Nhập món:</strong> chọn Thêm thực đơn hoặc Chỉnh sửa &amp; nhập món. Xóa chuyển vào thùng rác để có thể khôi phục.</p></div></HelpPanel>
  </div>;
}
