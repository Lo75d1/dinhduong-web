import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { NUTRITION_START_STEPS, nutritionStartGuide, nutritionStartLinks, nutritionStartMessage } from "@/lib/nutrition-chat/start-guide";
import StartInChat from "../StartInChat";

export const metadata: Metadata = {
  title: "Bắt đầu bằng QR hoặc link | Dinh dưỡng 2598",
  description: "Quét QR, dán lời nhắn vào ChatGPT hoặc Claude: làm rõ bữa ăn, chốt khẩu phần, nhận phân tích và Excel chỉnh được.",
  alternates: { canonical: "/ket-noi-ai/bat-dau" },
};
export const dynamic = "force-dynamic";

export default function StartNutritionChatPage() {
  const origin = getNutritionPublicUrl();
  const links = nutritionStartLinks(origin);
  return <div className="mx-auto max-w-5xl space-y-8 text-[#123c36]">
    <header className="border-b border-[#b1c8bd] pb-6">
      <p className="text-sm font-semibold tracking-wide">DINH DƯỠNG 2598 · BẮT ĐẦU HỘI THOẠI</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Quét QR hoặc dán link vào chat.</h1>
      <p className="mt-4 max-w-3xl text-lg text-neutral-700">Kể bữa ăn, để AI hỏi chỗ thiếu, xem bản nháp rồi chốt. Hệ thống trả phân tích và Excel có thể chỉnh lại.</p>
    </header>
    <div className="grid items-start gap-6 md:grid-cols-[1fr_220px]">
      <StartInChat message={nutritionStartMessage(origin)} link={links.start} mcp={links.mcp} />
      <figure className="flex flex-col items-center gap-3 rounded-xl border border-[#b1c8bd] bg-white p-5">
        <Image src="/ket-noi-ai/bat-dau/qr.png" unoptimized width={180} height={180} alt="QR mở trang bắt đầu Dinh dưỡng 2598, cùng link dán vào chat" />
        <figcaption className="text-center text-sm text-neutral-700">Quét bằng máy ảnh điện thoại. QR mở đúng trang này, không chứa tài khoản hoặc khóa.</figcaption>
        <a href="/ket-noi-ai/bat-dau/qr.png" download="dinh-duong-2598-bat-dau.png" className="font-semibold underline underline-offset-4">Tải QR để in hoặc chia sẻ</a>
      </figure>
    </div>
    <section className="rounded-xl border border-[#9bb6ab] bg-[#edf4f0] p-5">
      <h2 className="text-xl font-semibold">Lần đầu: cấp quyền kết nối một lần</h2>
      <p className="mt-2 text-neutral-700">Link giúp AI đọc quy trình. Để tra kho, tính và xuất Excel, bạn cần thêm kết nối Dinh dưỡng 2598 và đăng nhập OAuth trên website. Lời nhắn sẽ nhắc bước này nếu chat chưa có công cụ.</p>
      <Link href="/ket-noi-ai#cai-ket-noi" className="mt-4 inline-block rounded-lg bg-[#123c36] px-4 py-2.5 font-semibold text-white hover:bg-[#0f5c51]">Xem cách kết nối ChatGPT / Claude →</Link>
      <p className="mt-3 text-sm text-neutral-700">ChatGPT: tạo và cài plugin cá nhân, mở hội thoại Work rồi dùng @ chọn plugin. Claude: thêm connector và bật trong chat. <a href="https://developers.openai.com/plugins/quickstart" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Hướng dẫn OpenAI</a> · <a href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Hướng dẫn Claude</a>.</p>
    </section>
    <section aria-labelledby="start-workflow-title">
      <h2 id="start-workflow-title" className="text-2xl font-semibold">Từ bữa ăn đến kết quả</h2>
      <ol className="mt-5 space-y-5">{NUTRITION_START_STEPS.map((step, index) => <li key={step.title} className="flex gap-4">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dcebe5] font-semibold">{index + 1}</span>
        <div><h3 className="text-lg font-semibold">{step.title}</h3><p className="mt-1 text-neutral-700">{step.text}</p></div>
      </li>)}</ol>
    </section>
    <div className="flex flex-wrap gap-4 border-t border-[#b1c8bd] pt-5">
      <Link href="/ket-noi-ai#nhap-excel" className="underline underline-offset-4">Gửi lại Excel đã sửa</Link>
      <Link href="/ket-noi-ai/ban-luu" className="underline underline-offset-4">Mở khẩu phần đã lưu</Link>
      <Link href="/ket-noi-ai/authorize/connections" className="underline underline-offset-4">Quản lý / thu hồi kết nối</Link>
      <a href={links.text} className="underline underline-offset-4">Mở bản chữ cho AI</a>
    </div>
    <details className="rounded-xl border border-[#b1c8bd] bg-white p-5">
      <summary className="cursor-pointer font-semibold">Hướng dẫn đầy đủ dành cho AI đọc link</summary>
      <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-700">{nutritionStartGuide(origin)}</pre>
    </details>
  </div>;
}
