import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { defaultSiteSettings } from "@/lib/site-settings";

type GuideCardProps = {
  id?: string;
  label: string;
  title: string;
  children: ReactNode;
};

function GuideCard({ id, label, title, children }: GuideCardProps) {
  return (
    <section id={id} className="min-w-0 scroll-mt-24 rounded-xl border-2 border-[#7f948d] bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold tracking-[.14em] text-[#123c36]">{label}</p>
      <h2 className="mt-1 text-xl font-semibold text-neutral-950 sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-7 text-neutral-900">{children}</div>
    </section>
  );
}

function StepList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="grid grid-cols-[2rem_1fr] gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#123c36] text-sm font-bold text-white">{index + 1}</span>
          <div className="pt-0.5">{item}</div>
        </li>
      ))}
    </ol>
  );
}

function Note({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "violet" }) {
  const styles = {
    green: "border-[#2f7b68] bg-[#edf7f3]",
    amber: "border-[#a77b10] bg-[#fff9e8]",
    violet: "border-violet-600 bg-violet-50",
  };
  return <div className={"rounded-lg border-l-4 p-4 text-sm leading-6 " + styles[tone]}>{children}</div>;
}

const actionLink = "inline-flex min-h-11 items-center justify-center rounded-md border-2 border-[#123c36] bg-white px-4 py-2 font-semibold text-[#123c36] hover:bg-[#edf4f0]";

export const metadata = {
  title: "Hướng dẫn toàn bộ hệ thống | Dinh dưỡng 2598",
  description: "Hướng dẫn sử dụng Dinh dưỡng 2598 bản online, Excel offline và khu quản trị.",
};

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const settings = await prisma.siteSetting.findUnique({
    where: { id: "public" },
    select: { contactName: true, organization: true, phone: true, email: true, address: true, zaloUrl: true },
  }).catch(() => null);
  const contactName = settings?.contactName || defaultSiteSettings.contactName;
  const organization = settings?.organization || defaultSiteSettings.organization;
  const phone = settings?.phone || defaultSiteSettings.phone;
  const email = settings?.email || defaultSiteSettings.email;
  const address = settings?.address || defaultSiteSettings.address;
  const zaloUrl = settings?.zaloUrl || defaultSiteSettings.zaloUrl;

  return (
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-2xl border-2 border-[#123c36] bg-gradient-to-br from-[#eaf3ee] via-white to-[#fff9e8] p-6 sm:p-9">
        <p className="text-xs font-semibold tracking-[.16em] text-[#123c36]">HƯỚNG DẪN TOÀN BỘ HỆ THỐNG</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight text-[#123c36] sm:text-4xl">Từ tra cứu đến lập thực đơn, phân tích và xuất báo cáo</h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-neutral-900">Chọn bản phù hợp với thiết bị của bạn. Bản online thuận tiện trên điện thoại và đồng bộ tài khoản; bản Excel chạy offline trên máy tính, giữ dữ liệu ngay trong file và có công cụ xuất Word, Excel, phiếu đi chợ.</p>
        <nav aria-label="Mục lục hướng dẫn" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <a href="#online" className={actionLink}>📱 Dùng bản online</a>
          <a href="#offline" className={actionLink}>💻 Dùng Excel offline</a>
          <a href="#ket-qua" className={actionLink}>📊 Đọc kết quả</a>
          <a href="#quan-tri" className={actionLink}>🔐 Dành cho quản trị</a>
          <a href="#lien-he" className={actionLink}>☎ Liên hệ hỗ trợ</a>
        </nav>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border-2 border-[#2f7b68] bg-[#edf7f3] p-5">
          <p className="text-xs font-semibold tracking-[.14em] text-[#123c36]">NÊN CHỌN ONLINE KHI</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-900">
            <li>Dùng điện thoại hoặc cần mở nhanh ở nhiều thiết bị.</li>
            <li>Cần lưu và mở lại khẩu phần bằng tài khoản.</li>
            <li>Cần AI hỗ trợ tách mô tả khẩu phần thành bản xem trước.</li>
          </ul>
        </div>
        <div className="rounded-xl border-2 border-[#a77b10] bg-[#fff9e8] p-5">
          <p className="text-xs font-semibold tracking-[.14em] text-[#73540d]">NÊN CHỌN EXCEL OFFLINE KHI</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-900">
            <li>Làm việc tại nơi mạng yếu hoặc cần dữ liệu nằm trong máy.</li>
            <li>Cần bảng đầy đủ 162 thành phần dinh dưỡng.</li>
            <li>Cần xuất Word, Excel sạch hoặc phiếu đi chợ cho bếp.</li>
          </ul>
        </div>
      </section>

      <div className="mt-8 grid gap-6">
        <GuideCard id="online" label="PHẦN A · BẢN ONLINE" title="Quy trình nhanh trên điện thoại hoặc máy tính">
          <StepList items={[
            <><b>Tra cứu trước khi lập phiếu.</b> Mở <Link href="/thuc-pham" className="font-semibold text-[#123c36] underline">Thực phẩm</Link> hoặc <Link href="/mon-an" className="font-semibold text-[#123c36] underline">Món ăn</Link>, tìm không dấu và dùng bộ lọc nguồn, loại, nhóm tuổi hoặc bệnh lý. Giá trị dinh dưỡng được trình bày trên 100 g phần ăn được.</>,
            <><b>Mở Tính khẩu phần.</b> Chọn <b>Khẩu phần 24h</b> nếu nhập lượng đã ăn thực tế; chọn <b>Lập thực đơn</b> nếu nhập trực tiếp gram sống sạch.</>,
            <><b>Nhập hồ sơ.</b> Bấm <b>Thông tin để khuyến nghị</b>, điền tuổi, giới, chiều cao, cân nặng, mức hoạt động và tình trạng sinh lý. Trẻ em sẽ có thêm đối chiếu tăng trưởng WHO khi đủ dữ liệu.</>,
            <><b>Tạo cây Bữa → Món → Thực phẩm.</b> Thêm bữa, thêm món, chọn đúng món đang làm việc rồi tìm thực phẩm hoặc món ăn ở thanh phía dưới. Món từ cơ sở dữ liệu sẽ tự bung nguyên liệu đã liên kết.</>,
            <><b>Kiểm tra khối lượng.</b> Trong Khẩu phần 24h, nhập lượng đã ăn và hệ số quy đổi về sống sạch. Trong Lập thực đơn, nhập lượng sống sạch; hệ thống hiển thị thêm lượng mua/kho khi có tỷ lệ thải bỏ.</>,
            <><b>Sang phân tích.</b> Bấm <b>Sang phân tích</b> hoặc nút <b>2 · Kết quả</b> trên đầu màn hình để xem nhu cầu, tổng dinh dưỡng, vi chất, bảng chi tiết, quy đổi và biểu đồ.</>,
          ]} />
          <Note><b>Mẹo mới:</b> tại dòng tiêu đề món, sửa ô <b>∑ món</b> để tăng hoặc giảm tổng khối lượng; các nguyên liệu trong món sẽ được chia lại theo đúng tỷ lệ hiện có.</Note>
        </GuideCard>

        <GuideCard label="BẢN ONLINE · THÊM DỮ LIỆU" title="Thực phẩm mới, món nhanh và AI nhập liệu">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#b8cbc1] bg-[#f7faf8] p-4"><h3 className="font-semibold text-[#123c36]">Món / Đồ ăn nhanh</h3><p className="mt-1 text-sm leading-6">Tạo một nhóm món trống, sau đó chọn món này và thêm từng thực phẩm vào đúng bên trong.</p></div>
            <div className="rounded-lg border border-[#b8cbc1] bg-[#f7faf8] p-4"><h3 className="font-semibold text-[#123c36]">Thực phẩm mới</h3><p className="mt-1 text-sm leading-6">Dùng ngay trong phiếu hiện tại. Nếu muốn bổ sung vào dữ liệu dùng chung, gửi đề xuất kèm nguồn để quản trị viên kiểm duyệt.</p></div>
            <div className="rounded-lg border border-[#d9c27f] bg-[#fffdf6] p-4"><h3 className="font-semibold text-[#73540d]">AI hỗ trợ</h3><p className="mt-1 text-sm leading-6">Dán mô tả theo bữa. AI chỉ tạo bản xem trước; bạn phải xác nhận thực phẩm khớp với cơ sở dữ liệu trước khi thêm.</p></div>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-[#7f948d] bg-[#f7faf8] p-4 text-sm whitespace-pre-wrap">Sáng: phở bò 350 g.{"\n"}Trưa: cơm 200 g, cá chép kho 80 g.{"\n"}Phụ chiều: chuối phần ăn được 100 g.</pre>
          <Note tone="amber"><b>Không nhập dữ liệu định danh người bệnh vào AI:</b> tên, số điện thoại, địa chỉ, mã bệnh án hoặc thông tin riêng tư khác.</Note>
        </GuideCard>

        <GuideCard label="BẢN ONLINE · THUỐC / TPBS" title="Sắp thuốc theo bữa nhưng không cộng vào dinh dưỡng">
          <StepList items={[
            <>Bấm <b>💊 Thuốc</b> ở bữa cần dùng, hoặc mở bảng thuốc ở thanh tìm kiếm.</>,
            <>Chọn <b>TPBS</b> hoặc <b>Thuốc</b>. Với thuốc, xác nhận đã có ý kiến bác sĩ điều trị và dược sĩ trước khi sắp theo bữa.</>,
            <>Nhập liều, đơn vị và ghi chú; đặt ở <b>trước bữa</b>, <b>sau bữa</b> hoặc <b>mốc riêng</b>.</>,
          ]} />
          <Note tone="violet">Thuốc và thực phẩm bổ sung chỉ phục vụ theo dõi trình tự dùng. Chúng không được tính vào năng lượng hay thành phần dinh dưỡng và không thay thế đơn thuốc.</Note>
        </GuideCard>

        <GuideCard id="ket-qua" label="PHẦN B · KẾT QUẢ" title="Cách đọc các khối phân tích">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-sm">
              <thead><tr className="bg-[#123c36] text-white"><th className="px-3 py-2 text-left">Khối</th><th className="px-3 py-2 text-left">Nội dung chính</th><th className="px-3 py-2 text-left">Cần kiểm tra</th></tr></thead>
              <tbody className="[&_td]:border-b [&_td]:border-[#d6e0db] [&_td]:px-3 [&_td]:py-3 [&_td]:align-top">
                <tr><td className="font-semibold">Hồ sơ & nhu cầu</td><td>BMI, năng lượng mục tiêu, P/L/G, khuyến nghị RNI và mã chế độ ăn.</td><td>Tuổi, giới, mức hoạt động và tình trạng sinh lý đã đúng chưa.</td></tr>
                <tr><td className="font-semibold">Tổng quan khẩu phần</td><td>Tổng gram, kcal, protein, lipid, glucid và phân bố theo bữa.</td><td>Các món đã nhập đúng đơn vị và đúng trạng thái sống sạch chưa.</td></tr>
                <tr><td className="font-semibold">Vi chất</td><td>Đối chiếu vitamin và khoáng chất với nhu cầu khuyến nghị.</td><td>Dấu “≥” hoặc ô trống có thể phản ánh dữ liệu thực phẩm còn thiếu.</td></tr>
                <tr><td className="font-semibold">Bảng chi tiết</td><td>Bữa → Món → Thực phẩm, khối lượng và dưỡng chất từng dòng.</td><td>Tổng món, tổng bữa và tổng ngày phải khớp cây nhập liệu.</td></tr>
                <tr><td className="font-semibold">Quy đổi & biểu đồ</td><td>Đơn vị ăn, lượng mua/kho, 10 biểu đồ và các phân bố chuyên sâu.</td><td>Phần nguồn gốc lipid có thể là ước lượng theo tên khi dữ liệu nguồn không có trường tương ứng.</td></tr>
              </tbody>
            </table>
          </div>
          <Note tone="amber">Kết quả là công cụ hỗ trợ chuyên môn. Khi dùng cho người bệnh, cần đối chiếu tình trạng lâm sàng, y lệnh, xét nghiệm và hướng dẫn của cơ sở điều trị.</Note>
        </GuideCard>

        <GuideCard label="BẢN ONLINE · LƯU VÀ XUẤT" title="Giữ lại phiếu và tạo báo cáo">
          <ul className="list-disc space-y-2 pl-5">
            <li><b>Lưu trên thiết bị:</b> dữ liệu đang nhập được giữ cục bộ trong trình duyệt.</li>
            <li><b>Lưu lên server:</b> đăng nhập, bấm <b>Lưu lên server</b>; dùng <b>Mở thực đơn đã lưu</b> để nạp lại hoặc xóa phiếu không cần.</li>
            <li><b>In / PDF:</b> bấm <b>Thiết lập / In PDF</b>, nhập thông tin người được đánh giá và người lập, rồi mở bản in A4.</li>
            <li><b>Excel đầy đủ:</b> bấm <b>Xuất Excel đầy đủ</b> để lấy bảng chi tiết, quy đổi xuất kho, dữ liệu gốc /100 g và thuốc/TPBS.</li>
          </ul>
          <Note tone="amber">Mở một thực đơn đã lưu sẽ thay nội dung đang nhập. Hãy lưu phiếu hiện tại trước nếu cần giữ cả hai.</Note>
        </GuideCard>

        <GuideCard id="offline" label="PHẦN C · EXCEL OFFLINE" title="Khởi động và lập thực đơn trong file XLSM">
          <StepList items={[
            <><b>Mở file bằng Microsoft Excel trên máy tính.</b> Chọn <b>Enable Editing</b> và <b>Enable Content / Bật nội dung</b> để cho phép macro chạy.</>,
            <><b>Vào sheet ThucDon.</b> Hộp <b>Nhập khẩu phần / Lập thực đơn</b> tự mở bên phải; nếu đã đóng, bấm nút <b>🧰 CÔNG CỤ</b>.</>,
            <><b>Chọn chế độ.</b> Lập thực đơn nhập gram sống sạch; Khẩu phần 24h nhập lượng đã ăn và hệ số quy đổi.</>,
            <><b>Tìm món, thực phẩm hoặc thuốc.</b> Chọn loại tìm, nhập từ khóa, chọn kết quả, bữa và gram rồi bấm <b>Thêm vào thực đơn</b>.</>,
            <><b>Chọn đúng nhóm đích.</b> Bấm một dòng <b>MÓN ĂN</b> hoặc <b>THỰC PHẨM</b> trong cây; hộp công cụ sẽ ghi bữa và nhóm đang chọn. Thực phẩm thêm sau đó sẽ đi vào đúng món đó.</>,
            <><b>Sửa khối lượng.</b> Sửa gram của món hoặc nguyên liệu trong cây. Ô đổi sẽ chuyển vàng; bấm <b>Cân bằng khối lượng: món ↔ nguyên liệu</b> để cập nhật dữ liệu và tính lại.</>,
          ]} />
          <Note>Bản offline hiện có 3.719 thực phẩm, 7.369 món, 41.457 dòng nguyên liệu, 6.187 thuốc/TPBS, 72 nhóm nhu cầu và 246 mã chế độ ăn.</Note>
        </GuideCard>

        <GuideCard label="EXCEL OFFLINE · CÔNG CỤ BỔ SUNG" title="Tạo dữ liệu riêng, thêm bữa và quản lý cây thực đơn">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#b8cbc1] p-4"><h3 className="font-semibold text-[#123c36]">＋ Thực phẩm mới</h3><p className="mt-1 text-sm leading-6">Nhập tên và các thành phần biết chắc trên 100 g. Ô không có nguồn thì để trống; không điền số 0 thay cho thiếu dữ liệu.</p></div>
            <div className="rounded-lg border border-[#b8cbc1] p-4"><h3 className="font-semibold text-[#123c36]">＋ Món mới</h3><p className="mt-1 text-sm leading-6">Đặt tên món, tìm nguyên liệu, nhập gram, kiểm tra tổng kcal/P/L/G rồi lưu. Sau đó tìm lại tên món trong hộp nhập để thêm vào thực đơn.</p></div>
            <div className="rounded-lg border border-[#b8cbc1] p-4"><h3 className="font-semibold text-[#123c36]">＋ Thêm bữa ăn mới</h3><p className="mt-1 text-sm leading-6">Tạo các mốc riêng như “Bữa phụ 22h”. Bữa mới được thêm cuối danh sách.</p></div>
            <div className="rounded-lg border border-[#b8cbc1] p-4"><h3 className="font-semibold text-[#123c36]">Xóa và ẩn nguyên liệu</h3><p className="mt-1 text-sm leading-6">Chọn đúng dòng trước khi xóa. Nút Ẩn/hiện nguyên liệu chỉ đổi cách xem, không xóa nguyên liệu khỏi phép tính.</p></div>
          </div>
          <Note tone="amber">Thực phẩm và món tự tạo được lưu ngay trong file Excel đang dùng. Hãy sao lưu file trước khi nhập số lượng lớn hoặc chia sẻ cho người khác.</Note>
        </GuideCard>

        <GuideCard label="EXCEL OFFLINE · HỒ SƠ VÀ PHÂN TÍCH" title="Từ hồ sơ đến bảng đầy đủ 162 chất">
          <StepList items={[
            <>Mở <b>HoSo</b>, nhập họ tên hoặc mã quy ước, tuổi, đơn vị tuổi, giới, chiều cao, cân nặng, hoạt động và sinh lý; bấm <b>Lưu & Tính nhu cầu</b>.</>,
            <>Mở <b>KhuyenNghi</b>, lọc nhóm bệnh và chọn mã chế độ ăn phù hợp; bấm <b>Áp dụng mã này</b>.</>,
            <>Từ nút <b>Kết quả / Phân tích</b>, mở lần lượt: dashboard dinh dưỡng, bảng chi tiết, 10 biểu đồ, tra cứu thực phẩm đủ chất, tra cứu thuốc và <b>Phân tích đầy đủ 162 chất</b>.</>,
            <>Đối chiếu tổng món, tổng bữa và tổng ngày. Nếu có ô trống, hiểu là chưa có dữ liệu nguồn — không tự coi là bằng 0.</>,
          ]} />
        </GuideCard>

        <GuideCard label="EXCEL OFFLINE · XUẤT BÁO CÁO" title="Word, Excel sạch và phiếu đi chợ">
          <ul className="list-disc space-y-2 pl-5">
            <li><b>Xuất Word:</b> tạo báo cáo thực đơn, đối chiếu nhu cầu và phiếu đi chợ. Máy phải cài Microsoft Word.</li>
            <li><b>Xuất Excel:</b> tạo file .xlsx sạch gồm thực đơn, phân tích, bảng đầy đủ, biểu đồ, hồ sơ và khuyến nghị; không mang macro và sheet dữ liệu ẩn.</li>
            <li><b>Phiếu đi chợ:</b> gộp nguyên liệu trùng tên, tính phần ăn được, tỷ lệ thải bỏ và lượng cần mua.</li>
          </ul>
          <Note tone="amber">Nếu máy không có Word, chức năng Word sẽ báo lỗi gọn; xuất Excel vẫn dùng được. Luôn mở thử file xuất và so tổng trước khi gửi hoặc in.</Note>
        </GuideCard>

        <GuideCard id="quan-tri" label="PHẦN D · QUẢN TRỊ WEBSITE" title="Vận hành nội dung và dữ liệu an toàn">
          <ul className="list-disc space-y-2 pl-5">
            <li><b>Người dùng & phân quyền:</b> tạo hoặc điều chỉnh tài khoản theo đúng vai trò.</li>
            <li><b>Biên tập dữ liệu:</b> xem trước thay đổi, đối chiếu nguồn, xác nhận rồi mới cập nhật; không sửa hàng loạt khi chưa có bản kiểm tra.</li>
            <li><b>Thuốc/TPBS và phân loại:</b> dùng khu quản trị chuyên biệt, kiểm tra nhóm và nguồn trước khi nhập.</li>
            <li><b>Cấu hình công khai:</b> thông tin liên hệ, nhóm Zalo và liên kết tải bản Excel offline được quản lý tại trang quản trị.</li>
            <li><b>Gemini:</b> Admin cấu hình key dùng chung; key được mã hóa và không hiển thị lại. Kiểm tra kết nối sau khi cập nhật.</li>
            <li><b>Vận hành:</b> theo dõi liên hệ, thống kê truy cập, khảo sát SUS và nhật ký lỗi để ưu tiên sửa vấn đề thực tế.</li>
          </ul>
          <Note><b>Nguyên tắc dữ liệu:</b> ưu tiên nguồn chính thức, không suy diễn số thiếu, không xóa dữ liệu gốc; mọi thay đổi chuyên môn cần có xem trước, lý do và nhật ký.</Note>
        </GuideCard>

        <GuideCard id="lien-he" label="LIÊN HỆ & HỖ TRỢ" title="Khi cần hướng dẫn, báo lỗi hoặc góp ý dữ liệu">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#b8cbc1] bg-[#f7faf8] p-4">
              <p className="text-xs font-semibold tracking-[.12em] text-[#123c36]">NGƯỜI PHỤ TRÁCH</p>
              <p className="mt-2 text-lg font-semibold text-[#123c36]">{contactName}</p>
              {organization && <p className="mt-1">{organization}</p>}
              {phone && <a className="mt-3 block font-semibold text-[#123c36] underline" href={"tel:" + phone.replace(/\s/g, "")}>Điện thoại/Zalo: {phone}</a>}
              {email && <a className="mt-1 block text-[#123c36] underline" href={"mailto:" + email}>{email}</a>}
              {address && <p className="mt-2">Địa chỉ: {address}</p>}
            </div>
            <div className="rounded-lg border border-[#d9c27f] bg-[#fffdf6] p-4">
              <p className="font-semibold text-[#73540d]">Chọn đúng kênh hỗ trợ</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                <li>Hướng dẫn sử dụng hoặc báo lỗi: mô tả thao tác, thiết bị và ảnh màn hình.</li>
                <li>Góp ý dữ liệu: gửi tên thực phẩm/món, chỉ tiêu cần sửa và nguồn đối chiếu.</li>
                <li>Không gửi hồ sơ bệnh án, ảnh xét nghiệm hoặc dữ liệu sức khỏe định danh.</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/lien-he" className="rounded-md bg-[#123c36] px-5 py-2.5 font-semibold text-white">Gửi liên hệ qua website</Link>
            {zaloUrl && <a href={zaloUrl} target="_blank" rel="noreferrer" className={actionLink}>Mở nhóm hỗ trợ Zalo</a>}
          </div>
          <Note tone="amber">Tình huống cấp cứu hoặc cần tư vấn điều trị phải liên hệ cơ sở y tế phù hợp; kênh hỗ trợ của hệ thống không thay thế tư vấn khám chữa bệnh.</Note>
        </GuideCard>

        <GuideCard label="XỬ LÝ LỖI THƯỜNG GẶP" title="Kiểm tra nhanh trước khi báo lỗi">
          <div className="grid gap-4 md:grid-cols-2">
            <div><h3 className="font-semibold text-[#123c36]">Online</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6"><li>Không thấy kết quả: bỏ bớt bộ lọc và thử từ khóa không dấu.</li><li>Không thêm được thực phẩm: chọn một món trong cây trước.</li><li>Kết quả trống: quay lại bước 1 và thêm ít nhất một thực phẩm có dữ liệu.</li><li>Xuất Excel lỗi: kiểm tra mạng rồi thử lại.</li></ul></div>
            <div><h3 className="font-semibold text-[#123c36]">Excel offline</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6"><li>Nút không chạy: đóng file, mở lại và bật macro.</li><li>Hộp công cụ không hiện: bấm nút 🧰 CÔNG CỤ trên ThucDon.</li><li>Sửa gram nhưng tổng chưa đổi: bấm Cân bằng khối lượng.</li><li>Word không xuất: kiểm tra máy đã cài Microsoft Word.</li></ul></div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/lien-he" className="rounded-md bg-[#123c36] px-5 py-2.5 font-semibold text-white">Gửi báo lỗi / góp ý</Link>
            <Link href="/tai-lieu-tham-khao" className={actionLink}>Xem tài liệu tham khảo</Link>
            <Link href="/khao-sat" className={actionLink}>Khảo sát SUS</Link>
          </div>
        </GuideCard>
      </div>
    </div>
  );
}
