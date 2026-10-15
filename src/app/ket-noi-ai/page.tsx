import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getNutritionPublicUrl, getNutritionResourceUrl } from "@/lib/nutrition-chat/oauth-validation";
import { nutritionStartLinks } from "@/lib/nutrition-chat/start-guide";
import WorkbookImport from "./WorkbookImport";

export const metadata: Metadata = {
  title: "Kết nối ChatGPT & Claude | Dinh dưỡng 2598",
  description: "Hướng dẫn kết nối để tra thực phẩm, chốt khẩu phần trong hội thoại và nhận Excel có thể chỉnh lại.",
  alternates: { canonical: "/ket-noi-ai" },
};
export const dynamic = "force-dynamic";

// A trust-first service page: existing moss brand, low motion, editorial spacing.
// DESIGN_VARIANCE 3 / MOTION_INTENSITY 2 / VISUAL_DENSITY 4.
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";

export default async function ConnectAiPage() {
  const publicUrl = getNutritionPublicUrl();
  const resourceUrl = getNutritionResourceUrl();
  const startLinks = nutritionStartLinks(publicUrl);

  return (
    <div className="mx-auto max-w-5xl text-[#123c36]">
      <section aria-labelledby="connect-title" className="grid gap-8 border-b border-[#b1c8bd] pb-10 md:grid-cols-[1fr_240px] md:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide">DINH DƯỠNG 2598 · KẾT NỐI HỘI THOẠI</p>
          <h1 id="connect-title" className="text-4xl font-semibold leading-[1.12] sm:text-5xl">Nói bữa ăn.<br />Nhận bảng tính.</h1>
          <p className="mt-5 max-w-lg text-lg text-neutral-700">Tra thực phẩm, chốt khẩu phần và nhận Excel chỉnh được ngay từ ChatGPT hoặc Claude.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/ket-noi-ai/bat-dau" className={`rounded-lg bg-[#123c36] px-5 py-3 font-semibold text-white hover:bg-[#0f5c51] ${focus}`}>Bắt đầu bằng QR hoặc link →</Link>
            <a href="#cai-ket-noi" className={`rounded-lg border border-[#123c36] bg-white px-5 py-3 font-semibold hover:bg-[#eaf3ee] ${focus}`}>Cài kết nối lần đầu</a>
            <a href="#nhap-excel" className={`rounded-lg border border-[#123c36] bg-white px-5 py-3 font-semibold hover:bg-[#eaf3ee] ${focus}`}>Gửi lại Excel đã sửa</a>
          </div>
        </div>
        <figure className="flex items-center gap-4 md:flex-col md:gap-2">
          <Image src={startLinks.qr} alt="QR mở trang bắt đầu hội thoại Dinh dưỡng 2598" width={200} height={200} unoptimized className="h-32 w-32 rounded-lg border border-[#b1c8bd] bg-white md:h-48 md:w-48" />
          <figcaption className="max-w-48 text-sm text-neutral-700">Quét để lấy lời nhắn dán vào chat và hướng dẫn từ đầu đến cuối. QR không chứa khóa hoặc tự cấp quyền.</figcaption>
        </figure>
      </section>

      <section aria-labelledby="workflow-title" className="py-10">
        <h2 id="workflow-title" className="text-2xl font-semibold">Ba bước, từ lời kể đến kết quả</h2>
        <ol className="mt-6 space-y-6">
          {[
            ["Làm rõ món và lượng", "AI tra thực phẩm, mở công thức, hỏi lại chỗ thiếu. Nguyên liệu thay thế và nguồn ước lượng được trình bày để bạn chọn."],
            ["Xem và chốt bản nháp", "Bạn xác nhận ngày, bữa, nguyên liệu và định lượng trước khi hệ thống tính. Chỉ lưu bản cá nhân khi bạn yêu cầu."],
            ["Nhận phân tích và Excel", "Hệ thống trả số liệu cùng nguồn và cảnh báo. Sửa vùng nhập trong Excel để tự tính lại; gửi bản cuối khi cần lưu lên web."],
          ].map(([title, description], index) => (
            <li key={title} className="flex gap-4">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dcebe5] font-semibold">{index + 1}</span>
              <div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-1 max-w-3xl text-neutral-700">{description}</p></div>
            </li>
          ))}
        </ol>
        <p className="mt-6 border-l-4 border-[#9bb6ab] pl-4 text-neutral-700">Một ngày hoặc nhiều ngày. Chỉ tính thành phần thì không cần hồ sơ cơ thể; đối chiếu nhu cầu là lựa chọn riêng.</p>
      </section>

      <section id="cai-ket-noi" aria-labelledby="setup-title" className="scroll-mt-6 rounded-xl border border-[#b1c8bd] bg-white p-5 sm:p-8">
        <h2 id="setup-title" className="text-2xl font-semibold">Kết nối một lần cho mỗi tài khoản</h2>
        <p className="mt-3 text-sm text-neutral-700">Nếu đăng ký tự động không hoạt động: <Link href="/tai-khoan?section=connections#ket-noi-thu-cong" className="font-semibold text-[#123c36] underline">tạo cấu hình OAuth thủ công trong Tài khoản</Link>. Xem và thu hồi quyền tại <Link href="/tai-khoan?section=connections" className="underline">Kết nối ứng dụng</Link>.</p>
        <p className="mt-2 text-neutral-700">Đường dẫn công cụ dùng chung cho cả hai nền tảng:</p>
        <code className="mt-3 block break-all rounded-lg bg-[#edf4f0] p-3 text-sm text-[#123c36]">{resourceUrl}</code>
        <div className="mt-7 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-xl font-semibold">ChatGPT</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-700">
              <li>Mở Plugins, thêm custom MCP server với URL phía trên.</li>
              <li>Chọn “OAuth or no authentication” nếu có, hoặc OAuth. Tạo plugin rồi kiểm tra danh sách có 11 công cụ, gồm get_workflow.</li>
              <li>Cài plugin cá nhân; mở hội thoại Work mới, dùng @ chọn plugin và yêu cầu gọi get_workflow để kiểm tra.</li>
              <li>Khi cần tra dữ liệu hoặc tính khẩu phần, bấm kết nối tài khoản khi ChatGPT yêu cầu; đăng nhập Dinh dưỡng 2598 và xem quyền trước khi cấp.</li>
              <li>Đã cài nhưng không thấy công cụ: mở plugin → Refresh, kiểm lại danh sách công cụ rồi thử trong hội thoại mới. Không cần xóa tài khoản hoặc nhập lại dữ liệu trên website.</li>
            </ol>
            <a href="https://developers.openai.com/plugins/quickstart" target="_blank" rel="noopener noreferrer" className={`mt-3 inline-block text-sm underline underline-offset-4 ${focus}`}>Hướng dẫn chính thức của OpenAI</a>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Claude</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-700">
              <li>Mở Customize → Connectors, thêm custom connector với URL phía trên.</li>
              <li>Chọn đăng nhập OAuth và “Register automatically”; cấp quyền bằng tài khoản riêng.</li>
              <li>Bật connector trong chat rồi gửi lời nhắn bắt đầu; có thể cài thêm skill ZIP để dùng lại quy trình.</li>
            </ol>
            <a href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp" target="_blank" rel="noopener noreferrer" className={`mt-3 inline-block text-sm underline underline-offset-4 ${focus}`}>Hướng dẫn chính thức của Claude</a>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-3 border-t border-[#dcebe5] pt-5">
          <a href="/nutrition-chat/dinh-duong-2598-plugin.zip" download className={`rounded-lg bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0f5c51] ${focus}`}>Tải gói plugin</a>
          <a href="/nutrition-chat/dinh-duong-2598-skill.zip" download className={`rounded-lg border border-[#123c36] px-4 py-2 font-semibold hover:bg-[#eaf3ee] ${focus}`}>Tải skill cho Claude</a>
          <a href="/nutrition-chat/huong-dan-ket-noi.md" download className={`px-2 py-2 underline underline-offset-4 ${focus}`}>Tải hướng dẫn chi tiết</a>
        </div>
        <p className="mt-4 text-sm text-neutral-700">Tên mục và quyền cài đặt tùy tài khoản hoặc tổ chức. Gói tải này chưa đồng nghĩa đã được niêm yết trong thư viện công khai. Nếu chưa thấy công cụ, kiểm tra kết nối trước khi tính.</p>
      </section>

      <section id="nhap-excel" aria-labelledby="import-title" className="scroll-mt-6 py-10">
        <h2 id="import-title" className="text-2xl font-semibold">Mở lại thực đơn để dùng tiếp</h2>
        <p className="mt-2 max-w-3xl text-neutral-700">Mở bản đã lưu trong tài khoản hoặc link trong Excel để xem, điều chỉnh và dùng lại. Không cần gửi file lên cho bước này.</p>
        <Link href="/ket-noi-ai/ban-luu" className={`mt-3 inline-block font-semibold underline underline-offset-4 ${focus}`}>Mở thực đơn và khẩu phần đã lưu →</Link>
        <details className="mt-5"><summary className={`cursor-pointer font-semibold ${focus}`}>Đã sửa riêng file Excel trên máy? Nhập các thay đổi tại đây</summary><p className="mt-2 text-sm text-neutral-700">Chỉ dùng khi cần đưa những số đã sửa trong file về hệ thống. Bạn sẽ xem trước và xác nhận trước khi lưu.</p><WorkbookImport /></details>
      </section>

      <section id="quyen-rieng-tu" aria-labelledby="privacy-title" className="border-t border-[#b1c8bd] pt-8">
        <h2 id="privacy-title" className="text-2xl font-semibold">Nguồn rõ, quyền riêng</h2>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-neutral-700">
          <li>Data gốc dùng chung; công thức bạn chỉnh thuộc bản cá nhân. Không tự đưa món mới vào kho Food/Dish.</li>
          <li>Chất chưa có số liệu được báo thiếu. Công thức AI hoặc thực phẩm tham chiếu được ghi là ước lượng.</li>
          <li>Hội thoại và công cụ có thể gửi đầu vào cần thiết tới hệ thống. Hồ sơ cơ thể chỉ dùng khi bạn chọn đối chiếu nhu cầu; tránh đưa thông tin định danh không cần thiết.</li>
          <li>Lưu và mở bản cá nhân cần tài khoản và quyền phù hợp. Tính toán cũng có hạn mức; không dán mật khẩu hoặc token vào chat.</li>
          <li>Link tải Excel có thời hạn. File đã tải chứa dữ liệu bạn chọn; giữ và chia sẻ theo ý bạn. Nhận xét AI cũ không tự viết lại sau khi sửa file.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-5 text-sm">
          <Link href="/tinh-khau-phan" className={`underline underline-offset-4 ${focus}`}>Mở công cụ khẩu phần trên web</Link>
          <Link href="/huong-dan" className={`underline underline-offset-4 ${focus}`}>Hướng dẫn dữ liệu và phương pháp</Link>
          <Link href="/ket-noi-ai/authorize/connections" className={`underline underline-offset-4 ${focus}`}>Quản lý quyền kết nối</Link>
          <Link href="/ket-noi-ai/ban-luu" className={`underline underline-offset-4 ${focus}`}>Khẩu phần hội thoại đã lưu</Link>
        </div>
      </section>
    </div>
  );
}
