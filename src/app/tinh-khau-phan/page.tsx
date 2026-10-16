import Calculator from "./Calculator";
import type {Metadata} from "next";
import WebMenuView from "../ket-noi-ai/ban-tam/WebMenuView";

type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{
  const linked=Boolean((await searchParams).banTam);
  return {title:"Tính khẩu phần — Dinh dưỡng 2598",...(linked?{robots:{index:false,follow:false},referrer:"no-referrer" as const}:{})};
}

export default async function Page({searchParams}:Props) {
  return <Calculator linkedMenu={(await searchParams).banTam?<WebMenuView/>:undefined}/>;
}
