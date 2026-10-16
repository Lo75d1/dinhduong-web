import Calculator from "./Calculator";
import type {Metadata} from "next";
import WebMenuView from "../ket-noi-ai/ban-tam/WebMenuView";
import SavedMenuView from "../ket-noi-ai/ban-luu/[id]/SavedMenuView";
import { notFound } from "next/navigation";
import { LegacySavedRationLoader } from "./ServerRationActions";

type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{
  const params=await searchParams;
  const linked=Boolean(params.banTam || params.banLuu || params.banCu || params.thuVien || params.moi);
  return {title:"Tính khẩu phần — Dinh dưỡng 2598",...(linked?{robots:{index:false,follow:false},referrer:"no-referrer" as const}:{})};
}

export default async function Page({searchParams}:Props) {
  const params=await searchParams;
  const id = typeof params.banLuu === "string" ? params.banLuu : undefined;
  if (params.banLuu && (!id || !/^[A-Za-z0-9_-]{1,100}$/.test(id))) notFound();
  if (id) return <Calculator linkedMenu={<SavedMenuView key={`saved:${id}`} rationId={id}/>}/>;
  if (params.banCu) {
    if(typeof params.banCu!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(params.banCu)) notFound();
    return <Calculator linkedMenu={<LegacySavedRationLoader key={`legacy:${params.banCu}`} rationId={params.banCu}/>}/>;
  }
  if (params.thuVien) {
    if (!['food','dish'].includes(String(params.thuVien)) || typeof params.item !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(params.item)) notFound();
    return <Calculator linkedMenu={<SavedMenuView key={`library:${params.thuVien}:${params.item}`} library={{kind:params.thuVien as "food"|"dish",id:params.item}}/>}/>;
  }
  if (params.moi === "1") return <Calculator linkedMenu={<SavedMenuView key="new" createNew/>}/>;
  return <Calculator linkedMenu={params.banTam?<WebMenuView/>:undefined}/>;
}
