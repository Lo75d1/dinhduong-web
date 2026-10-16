"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import type {MenuInput,ResolvedMenu} from "@/lib/nutrition-chat/contracts";
import NutritionMenuAnalysis,{NutritionMenuInput} from "../NutritionMenuAnalysis";
import ReuseSavedMenu from "../ban-luu/[id]/ReuseSavedMenu";
import {readNutritionResponse} from "../client-api";
type Data={id:string;input:MenuInput;preview:ResolvedMenu;webUrl:string;webExpiresAt:string;stage:"draft"|"calculated";sourceChanged:boolean};
export default function WebMenuView(){
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      const key=window.location.hash.slice(1),id=new URL(window.location.href).searchParams.get("id");
      if(!/^[A-Za-z0-9_-]{43}$/.test(key) && !/^[a-f0-9]{64}$/.test(id??""))throw new Error("Mở đúng đường dẫn bản tạm từ chat. Đường dẫn có thời hạn và không phải bản đã lưu trong tài khoản.");
      const response=key?await fetch("/api/nutrition/v1/web-menu",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key}),signal:controller.signal}):await fetch(`/api/nutrition/v1/web-menu/${id}`,{cache:"no-store",signal:controller.signal});
      const value=await readNutritionResponse<Data>(response);
      if(!/^[a-f0-9]{64}$/.test(value.id)||!Array.isArray(value.preview?.days))throw new Error("Chưa đọc được bản tạm hợp lệ.");
      if(!controller.signal.aborted){setData(value);window.history.replaceState(null,"",`/ket-noi-ai/ban-tam?id=${value.id}`);}
    }
    void load().catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Chưa mở được bản tạm.");});
    return()=>controller.abort();
  },[]);
  return <>
    {error?<p role="alert" className="mt-6 rounded border border-amber-400 bg-amber-50 p-4 text-amber-950">{error}</p>:null}
    {!data&&!error?<p role="status" className="mt-6">Đang mở bản tạm và đọc dữ liệu nguồn…</p>:null}
    {data?<>
      <div className="mt-5 space-y-2 rounded border border-[#9bb6ab] bg-[#edf4f0] p-4"><p><b>{data.stage==="draft"?"Bản nháp, chưa chốt đầu vào":"Bản đã tính từ hội thoại"}</b> · Hết hạn {new Date(data.webExpiresAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</p><p className="text-sm">Ai có link đầy đủ có thể mở bản này trong thời hạn. Không có quyền truy cập các bản khác hoặc dữ liệu tài khoản. Đừng chia sẻ link nếu nội dung cần giữ riêng.</p><button type="button" className="font-semibold underline underline-offset-4" onClick={async()=>{try{await navigator.clipboard.writeText(data.webUrl);setNotice("Đã sao chép link bản tạm hiện tại.");}catch{setNotice("Chưa sao chép được. Dùng lại link đã nhận trong chat.");}}}>Sao chép link bản tạm</button><p role="status" className="text-sm">{notice}</p></div>
      {data.sourceChanged?<p role="alert" className="mt-4 text-amber-900">Nguồn dữ liệu đã đổi từ lúc tạo link. Số liệu dưới đây được tính lại theo nguồn hiện tại; kiểm tra và duyệt lại trước khi dùng.</p>:null}
      <h2 className="mt-6 text-2xl font-semibold">{data.preview.title}</h2>
      <NutritionMenuInput menu={data.preview}/>
      <details className="mt-5 rounded border border-[#b1c8bd] p-4" open><summary className="cursor-pointer text-xl font-semibold">Sửa món, thực phẩm và định lượng</summary><ReuseSavedMenu menu={data.preview} temporary={{id:data.id,expiresAt:data.webExpiresAt}}/></details>
      <NutritionMenuAnalysis menu={data.preview}/>
      <p className="mt-5 text-sm text-neutral-700">Muốn giữ lâu dài: <Link href="/ket-noi-ai/bat-dau#luu-lau-dai" target="_blank" rel="noopener noreferrer" className="font-semibold underline">xem cách dùng tài khoản</Link>. Sau khi sửa và tính lại, hệ thống mở link bản cập nhật; bản trong chat trước đó được giữ để đối chiếu.</p>
    </>:null}
  </>;
}
