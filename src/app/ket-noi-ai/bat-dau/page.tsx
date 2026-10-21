import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { NUTRITION_START_STEPS, nutritionDoctorStartMessage, nutritionStartGuide, nutritionStartLinks, nutritionStartMessage } from "@/lib/nutrition-chat/start-guide";
import StartInChat from "../StartInChat";
import LongTermUse from "../LongTermUse";
import { NUTRITION_TOOLS } from "@/lib/nutrition-chat/tools";

export const metadata: Metadata = {
  title: "Bắt đầu bằng QR hoặc link | Dinh dưỡng 2598",
  description: "Quét QR, dán lời nhắn vào chat và được hướng dẫn từng bước. Chat tự mở phiên tạm để tra, tính và trả báo cáo; tạo tài khoản khi muốn lưu dùng lại.",
  alternates: { canonical: "/ket-noi-ai/bat-dau" },
};
export const dynamic = "force-dynamic";

export default function StartNutritionChatPage() {
  const origin = getNutritionPublicUrl();
  const links = nutritionStartLinks(origin);
  return <div className="mx-auto max-w-5xl space-y-8 text-[var(--ink)]">
    <header className="border-b border-[var(--line)] pb-6">
      <p className="text-sm font-semibold tracking-wide">DINH DƯỠNG 2598 · BẮT ĐẦU HỘI THOẠI</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl"><Icon name="messages-square" className="mr-2 inline-block h-7 w-7 align-middle" />Quét QR hoặc dán link vào chat.</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">Bạn nói mục đích, muốn làm một ngày hoặc nhiều ngày và các bữa ăn; chat hỏi phần còn thiếu, đưa bản để bạn duyệt rồi trả báo cáo cùng link mở trang Tính khẩu phần đã nạp sẵn dữ liệu để xem, sửa và tính lại. Khi chat có kết nối Dinh dưỡng 2598 hoặc công cụ gửi HTTP, chat tự mở phiên tạm, bạn không cần lấy mã truy cập.</p>
      <p className="mt-3 font-semibold">Chỉ tra, tính hoặc lấy Excel: không cần tài khoản Dinh dưỡng 2598. <a href="#luu-lau-dai" className="underline underline-offset-4">Muốn lưu và dùng lại lâu dài?</a></p>
    </header>
    <div className="grid items-start gap-6 md:grid-cols-[1fr_220px]">
      <StartInChat message={nutritionDoctorStartMessage(origin)} fallbackMessage={nutritionStartMessage(origin)} link={links.start} mcp={links.mcp} />
      <figure className="flex flex-col items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-5">
        <Image src="/ket-noi-ai/bat-dau/qr.png" unoptimized width={180} height={180} alt="QR mở trang bắt đầu Dinh dưỡng 2598, cùng link dán vào chat" />
        <figcaption className="text-center text-sm text-neutral-700">Quét bằng máy ảnh điện thoại. QR mở đúng trang này, không chứa tài khoản hoặc khóa.</figcaption>
        <a href="/ket-noi-ai/bat-dau/qr.png" download="dinh-duong-2598-bat-dau.png" className="font-semibold underline underline-offset-4">Tải QR để in hoặc chia sẻ</a>
      </figure>
    </div>
    <section aria-labelledby="start-workflow-title">
      <h2 id="start-workflow-title" className="text-2xl font-semibold">Từ bữa ăn đến kết quả</h2>
      <ol className="mt-5 space-y-5">{NUTRITION_START_STEPS.map((step, index) => <li key={step.title} className="flex gap-4">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--selected)] font-semibold">{index + 1}</span>
        <div><h3 className="text-lg font-semibold">{step.title}</h3><p className="mt-1 text-neutral-700">{step.text}</p></div>
      </li>)}</ol>
    </section>
    <section id="lan-dau" aria-labelledby="first-use-title" className="scroll-mt-6 rounded-xl border border-[var(--control-line)] bg-white p-5 sm:p-7">
      <h2 id="first-use-title" className="text-2xl font-semibold">Lần đầu dùng: bật kết nối một lần</h2>
      <p className="mt-3 text-neutral-700">QR và link giúp chat đọc hướng dẫn. Chat cần công cụ gọi hệ thống: kết nối Dinh dưỡng 2598 hoặc khả năng gửi HTTP trực tiếp theo hướng dẫn TXT. Chỉ đọc được link thì chưa tính được. Khi đã cài, những lần sau bạn chỉ mở chat có bật kết nối và gửi lời nhắn.</p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-neutral-800">
        <li>Trong ChatGPT, mở <b>Plugins</b>, bấm <b>+</b> → <b>Add custom MCP server</b>, đặt tên <b>Dinh dưỡng 2598</b> và dán địa chỉ bên dưới.</li>
        <li>Ở Authentication, chọn <b>OAuth or no authentication</b> nếu có để dùng được cả phiên tạm lẫn tài khoản. Chỉ tra/tính/Excel có thể chọn <b>No authentication</b>. Tạo plugin, kiểm có <b>{NUTRITION_TOOLS.length} công cụ</b> rồi bấm cài đặt.</li>
        <li>Mở cuộc chat mới ở <b>Work</b>, gõ <b>@</b> và chọn <b>Dinh dưỡng 2598</b>. Quay lên sao chép lời nhắn rồi dán và gửi. Chat sẽ tự mở phiên làm việc.</li>
      </ol>
      <p className="mt-4 break-all rounded border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-base"><span className="block font-semibold">Địa chỉ dán vào Server URL</span>{links.mcp}</p>
      <p className="mt-3 text-neutral-700">Dùng Claude: mở phần Connectors, thêm Dinh dưỡng 2598 bằng cùng địa chỉ và bật trong chat; lựa chọn kết nối phụ thuộc tài khoản hoặc tổ chức.</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href="/ket-noi-ai#cai-ket-noi" className="underline underline-offset-4">Xem hướng dẫn kết nối chi tiết</Link><a href="https://developers.openai.com/plugins/quickstart" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Hướng dẫn chính thức của OpenAI</a></div>
      <p className="mt-3 text-sm text-neutral-700">Đã cài nhưng chat chưa thấy công cụ mới: mở plugin → Refresh, rồi thử trong cuộc chat mới. Nếu không cài được kết nối, AI có công cụ gửi HTTP có thể dùng REST phiên tạm theo TXT. Nếu không có cả hai khả năng, chat vẫn giúp làm rõ đầu vào nhưng chưa thể tính qua hệ thống.</p>
    </section>
    <LongTermUse />
    <div className="flex flex-wrap gap-4 border-t border-[var(--line)] pt-5">
      <Link href="/ket-noi-ai#nhap-excel" className="underline underline-offset-4">Gửi lại Excel đã sửa</Link>
      <Link href="/ket-noi-ai/ban-luu" className="underline underline-offset-4">Mở khẩu phần đã lưu</Link>
      <Link href="/ket-noi-ai/authorize/connections" className="underline underline-offset-4">Quản lý / thu hồi kết nối</Link>
      <a href={links.text} className="underline underline-offset-4">Mở bản chữ cho AI</a>
    </div>
    <details className="rounded-xl border border-[var(--line)] bg-white p-5">
      <summary className="cursor-pointer font-semibold">Hướng dẫn đầy đủ dành cho AI đọc link</summary>
      <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-700">{nutritionStartGuide(origin)}</pre>
    </details>
  </div>;
}
