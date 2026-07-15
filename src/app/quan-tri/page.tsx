import AdminPortal from "./AdminPortal";

export default function QuanTriPage() {
  return <div className="flex flex-col gap-5"><nav className="grid gap-3 rounded-xl border-2 border-[#123c36] bg-white p-4 sm:grid-cols-2"><a href="/quan-tri/nguoi-dung" className="rounded border-2 border-[#123c36] px-4 py-3 text-center font-semibold text-[#123c36]">Quản lý người dùng &amp; phân quyền</a><a href="/quan-tri/du-lieu" className="rounded border-2 border-[#123c36] px-4 py-3 text-center font-semibold text-[#123c36]">Biên tập dữ liệu thực phẩm</a></nav><AdminPortal /></div>;
}
