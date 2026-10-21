import { CLASSIFICATION, LIBRARY_API_PATH, LIBRARY_UPDATED_AT, LIBRARY_VERSION, MEAL_REFERENCE_RULES, REFERENCE_SOURCES } from "@/lib/menu-library/catalog";
import { GUIDE_SECTIONS, IMPLEMENTATION_STEPS, implementationAiGuide, menuAiGuide } from "@/lib/menu-library/guide";
import CopyGuide from "./CopyGuide";

const sectionStyle = "scroll-mt-6 rounded-xl border border-[#c3d3cb] bg-white p-5 sm:p-7";
const titleStyle = "text-xl font-semibold text-[#123c36]";
const profiles = { general_school: "Phổ thông", nursery_2021: "Nhà trẻ · CT 2021", kindergarten_2021: "Mẫu giáo · CT 2021", worker_reference: "Người lao động" };

function Citations({ ids }: { ids: readonly string[] }) {
  return <span className="ml-1 inline-flex gap-1">{ids.map(id => {
    const source = REFERENCE_SOURCES.find(item => item.id === id)!;
    return <a key={id} href={`#nguon-${id}`} title={source.title} aria-label={`Tài liệu tham khảo ${source.number}: ${source.title}`} className="font-semibold text-[#146752] underline underline-offset-2">[{source.number}]</a>;
  })}</span>;
}

// The page checks the current server session before rendering this workspace.
export default function LibraryWorkspace() {
  return <div className="space-y-6" data-menu-library>
    <header className="rounded-2xl border border-[#123c36] bg-[#123c36] p-6 text-white sm:p-8">
      <a href="/quan-tri" className="text-sm underline underline-offset-4">← Quản trị</a>
      <p className="mt-5 text-xs font-semibold tracking-widest text-[#d6e9df]">NỘI BỘ · CHỈ ADMIN</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Kho mẫu thực đơn</h1>
      <p className="mt-3 max-w-3xl leading-7 text-[#e1eee7]">Nền tảng phân loại, căn cứ dinh dưỡng và hướng dẫn AI để biên soạn mẫu cho cá nhân và từng đơn vị.</p>
      <p className="mt-4 text-sm text-[#d6e9df]">Phiên bản {LIBRARY_VERSION} · Cập nhật {LIBRARY_UPDATED_AT}</p>
    </header>

    <div className="grid gap-4 md:grid-cols-3">
      {[
        ["Đang dùng được", "Đọc hướng dẫn, đối chiếu nguồn, tải danh mục JSON và sao chép giao việc cho AI."],
        ["Cấu trúc đã chuẩn bị", "Đơn vị, nhóm tuổi, ngày/bữa, định lượng một suất, số suất và nguồn có phiên bản."],
        ["Bước triển khai tiếp", "Lưu mẫu, tính nhiều nhóm, phiếu chia suất và xuất đi chợ tập thể chưa được mở."],
      ].map(([title, text]) => <div key={title} className="rounded-xl border border-[#c3d3cb] bg-white p-5"><h2 className="font-semibold text-[#123c36]">{title}</h2><p className="mt-2 text-sm leading-6 text-neutral-700">{text}</p></div>)}
    </div>

    <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Mục lục kho mẫu thực đơn" className="rounded-xl border border-[#c3d3cb] bg-white p-5 lg:sticky lg:top-5">
        <h2 className="font-semibold text-[#123c36]">Mục lục</h2>
        <ol className="mt-3 space-y-3 text-sm leading-5">
          {GUIDE_SECTIONS.map(section => <li key={section.id}><a className="underline-offset-4 hover:underline" href={`#${section.id}`}>{section.title}</a></li>)}
          <li><a href="#tai-lieu" className="underline-offset-4 hover:underline">7. Tài liệu tham khảo</a></li>
          <li><a href="#trien-khai" className="underline-offset-4 hover:underline">8. Bàn giao triển khai</a></li>
          <li><a href="#lich-su" className="underline-offset-4 hover:underline">9. Lịch sử cập nhật</a></li>
        </ol>
        <a href={LIBRARY_API_PATH} className="mt-5 inline-block text-sm font-semibold text-[#123c36] underline underline-offset-4">Mở danh mục JSON →</a>
      </nav>

      <div className="min-w-0 space-y-5">
        {GUIDE_SECTIONS.map(section => <section key={section.id} id={section.id} className={sectionStyle}>
          <h2 className={titleStyle}>{section.title}</h2>
          {section.paragraphs.map((paragraph, index) => <p key={index} className="mt-3 leading-7 text-neutral-800">{paragraph}{index === section.paragraphs.length - 1 && <Citations ids={section.references} />}</p>)}

          {section.id === "phan-loai" && <div className="mt-5 overflow-x-auto rounded-lg border border-[#c3d3cb]">
            <table className="w-full min-w-[560px] text-left text-sm leading-6"><caption className="sr-only">Phân loại nhánh, đơn vị và nhóm người ăn</caption><thead className="bg-[#edf4f0]"><tr><th className="p-3">Nhánh / đơn vị</th><th className="p-3">Nhóm và hồ sơ</th><th className="p-3">Cách chọn căn cứ</th></tr></thead><tbody>{CLASSIFICATION.map(row => <tr key={row.type} className="border-t border-[#dce6e0]"><th scope="row" className="p-3 align-top font-semibold">{row.branch}<span className="mt-1 block font-normal">{row.type}</span></th><td className="p-3 align-top">{row.groups}</td><td className="p-3 align-top">{row.basis}</td></tr>)}</tbody></table>
          </div>}

          {section.id === "ngay-bua" && <div className="mt-5">
            <p className="rounded-lg border border-[#d8c992] bg-[#fff9e7] p-3 text-sm leading-6"><strong>Bảng tham khảo, chưa áp dụng tự động.</strong> Mẫu số của mọi tỷ lệ là năng lượng cả ngày. Phải xác nhận đối tượng và chương trình trước khi chọn.</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-[#c3d3cb]"><table className="w-full min-w-[490px] text-left text-sm leading-6"><caption className="sr-only">Phân bố năng lượng bữa ăn so với cả ngày</caption><thead className="bg-[#edf4f0]"><tr><th className="p-3">Đối tượng</th><th className="p-3">Bữa / phạm vi</th><th className="p-3">% cả ngày</th><th className="p-3">Nguồn</th></tr></thead><tbody>{MEAL_REFERENCE_RULES.map(rule => <tr key={rule.id} className="border-t border-[#dce6e0]"><th scope="row" className="p-3 font-normal">{profiles[rule.profile]}</th><td className="p-3">{rule.label}</td><td className="whitespace-nowrap p-3 font-semibold">{rule.min}–{rule.max}%</td><td className="p-3"><Citations ids={[rule.sourceId]} /></td></tr>)}</tbody></table></div>
          </div>}

          {section.id === "ai" && <div className="mt-5"><CopyGuide title="hướng dẫn AI lập thực đơn" description="Sao chép trọn hướng dẫn, tỷ lệ tham khảo, ví dụ dữ liệu và danh mục nguồn; dán vào cuộc trò chuyện với AI." text={menuAiGuide()} href={`${LIBRARY_API_PATH}/guide`} /></div>}
        </section>)}

        <section id="tai-lieu" className={sectionStyle}>
          <h2 className={titleStyle}>7. Tài liệu tham khảo</h2>
          <p className="mt-3 leading-7">Mỗi nguồn giữ nguyên cơ quan, phiên bản, phạm vi và vị trí trích. “Đã đối chiếu” chỉ nói về nội dung đã đọc; việc áp dụng cho đơn vị vẫn cần duyệt chuyên môn.</p>
          <ol className="mt-5 space-y-4">{REFERENCE_SOURCES.map(source => <li id={`nguon-${source.id}`} key={source.id} className="scroll-mt-6 rounded-lg border border-[#d4dfd8] bg-[#fafcfb] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="max-w-2xl font-semibold text-[#123c36]">[{source.number}] {source.title}</h3><span className={`rounded px-2 py-1 text-xs font-semibold ${source.verification === "pending" ? "bg-[#fff1cc] text-[#715500]" : "bg-[#e1eee7] text-[#123c36]"}`}>{source.verification === "pending" ? "Chờ xác minh bản gốc" : "Đã đối chiếu phần hướng dẫn"}</span></div>
            <p className="mt-2 text-sm text-neutral-700">{source.issuer} · {source.version} · {source.kind === "official" ? "Nguồn chính thức" : "Tham khảo chuyên môn"}</p>
            <p className="mt-3 text-sm leading-6"><strong>Phạm vi:</strong> {source.scope}</p>
            <p className="mt-2 text-sm leading-6"><strong>Vị trí:</strong> {source.locator}</p>
            <p className="mt-2 text-sm leading-6">{source.note}</p>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#146752] underline underline-offset-4">{source.id === "vdd-rni-2026" ? "Mở tài liệu dẫn chiếu [3] ↗" : "Mở nguồn tham khảo ↗"}</a>
          </li>)}</ol>
        </section>

        <section id="trien-khai" className={sectionStyle}>
          <h2 className={titleStyle}>8. Bàn giao triển khai</h2>
          <p className="mt-3 leading-7">Bản nền có hướng dẫn và hợp đồng nháp. Triển khai tiếp theo từng bước để kiểm tra cách chia nhóm, tính suất và truy vết nguồn trước khi mở cho người dùng.</p>
          <ol className="my-5 list-decimal space-y-3 pl-5 text-sm leading-6">{IMPLEMENTATION_STEPS.slice(1, 6).map(step => <li key={step}>{step}</li>)}</ol>
          <CopyGuide title="giao việc AI triển khai" description="Có đường dẫn repository, nhánh bản nền, tệp cần đọc, thứ tự công việc, kiểm thử và hướng dẫn nghiệm thu sau triển khai." text={implementationAiGuide()} href={`${LIBRARY_API_PATH}/guide?mode=implementation`} />
        </section>

        <section id="lich-su" className={sectionStyle}><h2 className={titleStyle}>9. Lịch sử cập nhật</h2><p className="mt-3 leading-7"><strong>{LIBRARY_UPDATED_AT} · v{LIBRARY_VERSION}</strong> — Khởi tạo phân loại, nguồn tham khảo, tỷ lệ bữa, khung dữ liệu và hai hướng dẫn AI. Danh mục được quản lý theo phiên bản mã nguồn; chưa có màn biên tập hoặc lưu mẫu.</p></section>
      </div>
    </div>
  </div>;
}
