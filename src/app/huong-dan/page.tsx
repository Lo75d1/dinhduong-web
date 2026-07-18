import Link from "next/link";

function Card({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border-2 border-[#7f948d] bg-white p-5"><p className="text-sm font-semibold tracking-[.12em] text-[#123c36]">BƯỚC {number}</p><h2 className="mt-1 text-xl font-semibold">{title}</h2><div className="mt-3 text-neutral-900">{children}</div></section>;
}

export const metadata = { title: "Hướng dẫn sử dụng | Dinh dưỡng 2598" };

export default function GuidePage() {
  return <div className="mx-auto max-w-5xl">
    <section className="border-b-2 border-[#123c36] pb-5"><p className="text-xs font-semibold tracking-[.16em] text-[#123c36]">HƯỚNG DẪN SỬ DỤNG</p><h1 className="mt-1 text-3xl font-semibold">Lập và kiểm tra khẩu phần</h1><p className="mt-2 text-neutral-900">Dinh dưỡng 2598 là công cụ hỗ trợ; bác sĩ, dinh dưỡng viên và người sử dụng vẫn cần kiểm tra dữ liệu trước khi dùng trong hồ sơ chuyên môn.</p></section>
    <div className="mt-5 grid gap-5">
      <Card number="1" title="Tra cứu thực phẩm và món ăn"><p>Vào <Link href="/thuc-pham" className="font-semibold text-[#123c36] underline">Tra cứu</Link>, gõ tên và lọc theo loại. Xem nguồn dữ liệu, giá trị trên 100 g và ghi chú trước khi dùng.</p></Card>
      <Card number="2" title="Chọn đúng chế độ và khối lượng"><div className="space-y-2"><p><b>Khẩu phần 24 giờ:</b> nhập lượng bệnh nhân thực tế đã ăn. Dùng cột hệ số để đổi lượng chín/đã ăn về <b>gram sống sạch</b>.</p><p><b>Lập thực đơn:</b> nhập trực tiếp gram sống sạch. Khi chuyển từ Khẩu phần 24 giờ sang Lập thực đơn, hệ thống giữ kết quả gram sống sạch đã quy đổi, không lấy khối lượng món chín làm số tính.</p><p>Dữ liệu VDD/RNI được áp dụng trên <b>100 g phần ăn được ở trạng thái sống sạch</b>. Khối lượng mua/xuất kho là bước khác: từ sống sạch cộng thêm phần thải bỏ. Nếu chưa có tỷ lệ thải bỏ, hệ thống tạm dùng 1:1 và ghi rõ để kiểm tra.</p></div></Card>
      <Card number="3" title="AI hỗ trợ nhập nhanh"><p>Dán mô tả cả ngày theo dạng <b>bữa: tên món/thực phẩm + lượng g/ml</b>. Gemini dùng chung do quản trị viên cấu hình; người dùng không cần biết API key.</p><pre className="mt-3 overflow-x-auto border border-[#7f948d] bg-[#f7faf8] p-3 text-sm whitespace-pre-wrap">Sáng: phở bò 350 g.{"\n"}Trưa: cơm chín 200 g, cá chép kho 80 g.{"\n"}Phụ sáng: chuối phần ăn được 100 g.</pre><ul className="mt-3 list-disc space-y-1 pl-5"><li>AI giữ cấu trúc bữa và món; người dùng phải kiểm tra lại thực phẩm đã khớp CSDL.</li><li>Không dán tên, số điện thoại, địa chỉ, mã bệnh án hoặc dữ liệu định danh người bệnh.</li></ul></Card>
      <Card number="4" title="Chưa có thực phẩm trong CSDL?"><p>Bấm <b>＋ Thực phẩm mới</b> để dùng tạm trong phiếu hiện tại. Nếu muốn dùng chung về sau, gửi bản nháp kèm nguồn để quản trị viên kiểm duyệt.</p></Card>
      <Card number="5" title="Đọc kết quả và xuất báo cáo"><p>Bảng chi tiết dùng <b>gram sống sạch</b> để tính năng lượng và dưỡng chất. Bảng quy đổi xuất kho trình bày riêng gram sống sạch, tỷ lệ thải bỏ và khối lượng cần mua. Excel xuất đủ cả hai cột cùng dữ liệu gốc /100 g. Xem <Link href="/tai-lieu-tham-khao" className="font-semibold text-[#123c36] underline">Tài liệu tham khảo</Link> để kiểm tra căn cứ chuyên môn.</p></Card>
      <Card number="6" title="Ghi thuốc / TPBS"><p>Bấm <b>💊 Thuốc</b> tại đúng bữa hoặc tạo mốc thuốc riêng, rồi ghi liều lượng, đơn vị, thời điểm và dặn dò. Thuốc/TPBS hiển thị riêng và <b>không tính vào dinh dưỡng khẩu phần</b>; nội dung không thay thế đơn thuốc hay chỉ định điều trị.</p></Card>
    </div>
  </div>;
}
