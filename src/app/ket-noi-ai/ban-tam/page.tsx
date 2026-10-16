import type {Metadata} from "next";
import WebMenuView from "./WebMenuView";
export const metadata:Metadata={title:"Xem và chỉnh khẩu phần | Dinh dưỡng 2598",robots:{index:false,follow:false},referrer:"no-referrer"};
export const dynamic="force-dynamic";
export default function Page(){return <div className="mx-auto max-w-5xl text-[#123c36]"><h1 className="text-3xl font-semibold">Xem và chỉnh khẩu phần trên web</h1><p className="mt-3 text-neutral-700">Bản tạm từ hội thoại. Bạn có thể xem đầu vào, sửa món và định lượng, duyệt lại rồi tính; không cần đăng nhập. Chỉ tải Excel khi cần file.</p><WebMenuView /></div>;}
