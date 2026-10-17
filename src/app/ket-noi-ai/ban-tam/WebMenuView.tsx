"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import Link from "next/link";
import type {MenuInput,ResolvedMenu} from "@/lib/nutrition-chat/contracts";
import LinkedCalculatorResults from "@/app/tinh-khau-phan/LinkedCalculatorResults";
export { default as LinkedCalculatorResults } from "@/app/tinh-khau-phan/LinkedCalculatorResults";
import CalculatorNavigation,{useCalculatorHeader} from "@/app/tinh-khau-phan/CalculatorNavigation";
import { CalculatorInputPanel } from "@/app/tinh-khau-phan/CalculatorLayout";
import ReuseSavedMenu from "../ban-luu/[id]/ReuseSavedMenu";
import {readNutritionResponse} from "../client-api";

type Data={id:string;input:MenuInput;preview:ResolvedMenu;confirmationToken:string;webUrl:string;webExpiresAt:string;stage:"draft"|"calculated";sourceChanged:boolean};
export default function WebMenuView(){
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[view,setView]=useState<"entry"|"analysis">("analysis"),[preview,setPreview]=useState<ResolvedMenu|null>(null),[dirty,setDirty]=useState(false),[unconfirmed,setUnconfirmed]=useState(false);
  const headerSlot=useCalculatorHeader();
  const [actionsContainer,setActionsContainer]=useState<HTMLDivElement|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      const key=window.location.hash.slice(1),params=new URL(window.location.href).searchParams,id=params.get("banTam")??params.get("id");
      if(!/^[A-Za-z0-9_-]{43}$/.test(key) && !/^[a-f0-9]{64}$/.test(id??""))throw new Error("Mở đúng đường dẫn khẩu phần từ chat. Link có thời hạn; muốn giữ lâu dài hãy lưu vào tài khoản.");
      const response=key?await fetch("/api/nutrition/v1/web-menu",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key}),signal:controller.signal}):await fetch(`/api/nutrition/v1/web-menu/${id}`,{cache:"no-store",signal:controller.signal});
      const value=await readNutritionResponse<Data>(response);
      if(!/^[a-f0-9]{64}$/.test(value.id)||!Array.isArray(value.preview?.days))throw new Error("Chưa đọc được khẩu phần hợp lệ.");
      if(!controller.signal.aborted){setData(value);setPreview(value.preview);setView("analysis");setUnconfirmed(value.stage==="draft");window.history.replaceState(null,"",`/tinh-khau-phan?banTam=${value.id}`);}
    }
    void load().catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Chưa mở được khẩu phần.");});
    return()=>controller.abort();
  },[]);
  return <>
    {error?<p role="alert" className="rounded border border-amber-400 bg-amber-50 p-4 text-amber-950">{error}</p>:null}
    {!data&&!error?<p role="status">Đang nạp khẩu phần từ hội thoại…</p>:null}
    {data?<>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#9bb6ab] bg-[#edf4f0] p-3 text-sm"><span><b>Khẩu phần từ hội thoại</b> · {data.preview.days.length} ngày</span><span>Hạn bản tạm: {new Date(data.webExpiresAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</span><button type="button" className="ml-auto font-semibold underline underline-offset-4" onClick={async()=>{try{await navigator.clipboard.writeText(data.webUrl);setNotice("Đã sao chép link khẩu phần.");}catch{setNotice("Chưa sao chép được. Dùng lại link đã nhận trong chat.");}}}>Sao chép link</button><span role="status">{notice}</span><details className="w-full"><summary className="cursor-pointer text-xs">Chia sẻ và lưu lâu dài</summary><p className="mt-2">Ai có link đầy đủ có thể mở đúng bản này trong thời hạn. Muốn giữ lâu dài, đăng nhập và lưu vào tài khoản ở phần dưới. Chỉnh sửa tại đây không ghi đè khẩu phần đang làm thủ công trên máy.</p></details></div>
      {(()=>{const navigation=<CalculatorNavigation pageMode={(preview?.days.length??data.preview.days.length)>1?"multi":"single"} activeView={view} foodCount={preview?.days.reduce((sum,day)=>sum+day.rows.length,0)??0} onViewChange={setView}/>;return headerSlot?createPortal(navigation,headerSlot):navigation;})()}
      {data.sourceChanged?<p role="alert" className="text-amber-900">Nguồn dữ liệu đã đổi; số liệu được tính lại theo nguồn hiện tại. Kiểm tra và duyệt lại trước khi dùng.</p>:null}
      {dirty?<p role="status" className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">Đã sửa đầu vào. Bấm Xem trước và tính lại để cập nhật kết quả.</p>:null}
      <CalculatorInputPanel active={view==="entry"}><ReuseSavedMenu menu={data.preview} initialPrepared={data} temporary={{id:data.id,expiresAt:data.webExpiresAt}} layout="calculator" view={view} actionsContainer={actionsContainer} onDraftChange={()=>setDirty(true)} onPrepared={value=>{setPreview(value);setDirty(false);setUnconfirmed(true);setView("analysis");}}/></CalculatorInputPanel>
      {view==="analysis"&&!dirty&&preview?<LinkedCalculatorResults menu={preview} draft={unconfirmed} actionsRef={setActionsContainer} onEdit={()=>setView("entry")}/>:null}
      <p className="text-sm text-neutral-700">Cần hướng dẫn lưu lâu dài: <Link href="/ket-noi-ai/bat-dau#luu-lau-dai" target="_blank" rel="noopener noreferrer" className="font-semibold underline">xem cách dùng tài khoản</Link>. Excel là lựa chọn tải thêm.</p>
    </>:null}
  </>;
}
