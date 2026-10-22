import Link from "next/link";
export default function LongTermUse() {
  return <section id="luu-lau-dai" aria-labelledby="long-term-title" className="scroll-mt-6 rounded-xl border border-[var(--control-line)] bg-[var(--surface-soft)] p-5 sm:p-7">
    <h2 id="long-term-title" className="text-2xl font-semibold">Muốn lưu và dùng lại lâu dài?</h2>
    <p className="mt-3 text-neutral-700">Tạo tài khoản Dinh dưỡng 2598 khi bạn muốn giữ thực đơn, thực phẩm và món ăn riêng để dùng nhiều lần. Chỉ tra, tính hoặc lấy Excel thì không cần bước này.</p>
    <ol className="mt-4 list-decimal space-y-3 pl-5 text-neutral-800">
      <li>Mở <Link href="/dang-nhap?next=%2Ftai-khoan" className="font-semibold underline">Tạo tài khoản / Đăng nhập</Link>. Chưa có tài khoản: chọn <b>Đăng ký mới</b>, nhập họ tên, email, mật khẩu và bấm <b>Tạo tài khoản</b>.</li>
      <li>Quay lại chat và nói: <b>“Tôi muốn lưu thực đơn này vào tài khoản của tôi.”</b> Khi chat yêu cầu, bấm <b>Kết nối tài khoản</b>, đăng nhập trên website Dinh dưỡng 2598 và xem quyền trước khi đồng ý.</li>
      <li>Chat giữ các thông tin bạn đã nhập, đưa lại bản để bạn xác nhận rồi lưu. Sau khi lưu thành công, chat trả đường dẫn mở thực đơn.</li>
      <li>Lần sau mở <Link href="/ket-noi-ai/ban-luu" className="font-semibold underline">Thực đơn của tôi</Link> hoặc nhờ chat mở bản đã lưu. Bạn có thể điều chỉnh và dùng lại, không cần gửi lại Excel.</li>
    </ol>
    <p className="mt-4 text-sm text-neutral-700">Nếu lần đầu bạn cài kết nối chỉ với No authentication, cần dùng <Link href="/ket-noi-ai#cai-ket-noi" className="font-semibold underline">kết nối có đăng nhập tài khoản</Link> để lưu và mở bản riêng. Giữ nội dung bữa ăn trong cuộc chat, không cần nhập lại từ đầu.</p>
    <p className="mt-4 text-sm text-neutral-700">Đăng nhập website và kết nối tài khoản trong chat là hai bước. Chỉ nhập mật khẩu trên trang đăng nhập; không gửi mật khẩu vào hội thoại. Link tải Excel có thời hạn, còn bản đã lưu được mở lại bằng đúng tài khoản của bạn.</p>
  </section>;
}
