"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import type {MenuInput,ResolvedMenu} from "@/lib/nutrition-chat/contracts";
import NutritionMenuAnalysis from "../NutritionMenuAnalysis";
import ReuseSavedMenu from "../ban-luu/[id]/ReuseSavedMenu";
import {readNutritionResponse} from "../client-api";

type Data={id:string;input:MenuInput;preview:ResolvedMenu;webUrl:string;webExpiresAt:string;stage:"draft"|"calculated";sourceChanged:boolean};
export default function WebMenuView(){
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[view,setView]=useState<"entry"|"analysis">("entry"),[preview,setPreview]=useState<ResolvedMenu|null>(null),[dirty,setDirty]=useState(false),[unconfirmed,setUnconfirmed]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      const key=window.location.hash.slice(1),params=new URL(window.location.href).searchParams,id=params.get("banTam")??params.get("id");
      if(!/^[A-Za-z0-9_-]{43}$/.test(key) && !/^[a-f0-9]{64}$/.test(id??""))throw new Error("Mở đúng đường dẫn khẩu phần từ chat. Link có thời hạn; muốn giữ lâu dài hãy lưu vào tài khoản.");
      const response=key?await fetch("/api/nutrition/v1/web-menu",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key}),signal:controller.signal}):await fetch(`/api/nutrition/v1/web-menu/${id}`,{cache:"no-store",signal:controller.signal});
      const value=await readNutritionResponse<Data>(response);
      if(!/^[a-f0-9]{64}$/.test(value.id)||!Array.isArray(value.preview?.days))throw new Error("Chưa đọc được khẩu phần hợp lệ.");
      if(!controller.signal.aborted){setData(value);setPreview(value.preview);setView(value.stage==="calculated"?"analysis":"entry");setUnconfirmed(value.stage==="draft");window.history.replaceState(null,"",`/tinh-khau-phan?banTam=${value.id}`);}
    }
    void load().catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Chưa mở được khẩu phần.");});
    return()=>controller.abort();
  },[]);
  return <>
    {error?<p role="alert" className="rounded border border-amber-400 bg-amber-50 p-4 text-amber-950">{error}</p>:null}
    {!data&&!error?<p role="status">Đang nạp khẩu phần từ hội thoại…</p>:null}
    {data?<>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#9bb6ab] bg-[#edf4f0] p-3 text-sm"><span><b>Khẩu phần từ hội thoại</b> · {data.preview.days.length} ngày</span><span>Hạn bản tạm: {new Date(data.webExpiresAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</span><button type="button" className="ml-auto font-semibold underline underline-offset-4" onClick={async()=>{try{await navigator.clipboard.writeText(data.webUrl);setNotice("Đã sao chép link khẩu phần.");}catch{setNotice("Chưa sao chép được. Dùng lại link đã nhận trong chat.");}}}>Sao chép link</button><span role="status">{notice}</span><details className="w-full"><summary className="cursor-pointer text-xs">Chia sẻ và lưu lâu dài</summary><p className="mt-2">Ai có link đầy đủ có thể mở đúng bản này trong thời hạn. Muốn giữ lâu dài, đăng nhập và lưu vào tài khoản ở phần dưới. Chỉnh sửa tại đây không ghi đè khẩu phần đang làm thủ công trên máy.</p></details></div>
      <nav className="clinical-stepper flex gap-1 rounded-lg border border-[#7f948d] bg-white p-1" aria-label="Các bước tính khẩu phần từ hội thoại">{(["entry","analysis"] as const).map((item,index)=><button key={item} type="button" onClick={()=>setView(item)} aria-pressed={view===item} className={`clinical-step flex-1 rounded-md px-3 py-3 text-center font-semibold ${view===item?"bg-[#123c36] text-white":"text-neutral-800 hover:bg-neutral-100"}`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index+1}</span>{item==="entry"?"Nhập khẩu phần":"Kết quả và phân tích"}</button>)}</nav>
      {data.sourceChanged?<p role="alert" className="text-amber-900">Nguồn dữ liệu đã đổi; số liệu được tính lại theo nguồn hiện tại. Kiểm tra và duyệt lại trước khi dùng.</p>:null}
      {dirty?<p role="status" className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">Đã sửa đầu vào. Bấm Xem trước và tính lại để cập nhật kết quả.</p>:null}
      <section className="clinical-panel min-w-0 rounded-lg border border-[#9bb6ab] bg-white p-4"><ReuseSavedMenu menu={data.preview} temporary={{id:data.id,expiresAt:data.webExpiresAt}} layout="calculator" view={view} onDraftChange={()=>setDirty(true)} onPrepared={value=>{setPreview(value);setDirty(false);setUnconfirmed(true);setView("analysis");}}/></section>
      {view==="analysis"&&!dirty&&preview?<section className="clinical-panel min-w-0 rounded-lg border border-[#9bb6ab] bg-white p-4"><div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">BƯỚC 2 · KẾT QUẢ</p><h2 className="mt-1 text-2xl font-semibold">{preview.title}</h2>{unconfirmed?<p className="mt-2 text-sm text-amber-900">Kết quả xem trước; kiểm tra đủ món/nguyên liệu và xác nhận đầu vào ở trên.</p>:null}</div><NutritionMenuAnalysis menu={preview}/></section>:null}
      <p className="text-sm text-neutral-700">Cần hướng dẫn lưu lâu dài: <Link href="/ket-noi-ai/bat-dau#luu-lau-dai" target="_blank" rel="noopener noreferrer" className="font-semibold underline">xem cách dùng tài khoản</Link>. Excel là lựa chọn tải thêm.</p>
    </>:null}
  </>;
}
