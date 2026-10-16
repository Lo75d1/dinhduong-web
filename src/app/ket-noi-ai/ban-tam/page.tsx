import type {Metadata} from "next";
import WebMenuView from "./WebMenuView";
import Calculator from "../../tinh-khau-phan/Calculator";
export const metadata:Metadata={title:"Xem và chỉnh khẩu phần | Dinh dưỡng 2598",robots:{index:false,follow:false},referrer:"no-referrer"};
export const dynamic="force-dynamic";
export default function Page(){return <Calculator linkedMenu={<WebMenuView/>}/>;}
