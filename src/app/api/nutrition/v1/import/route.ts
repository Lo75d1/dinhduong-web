import { nutritionRestIdentity, nutritionRestError } from "@/lib/nutrition-chat/rest";
import { enforceNutritionRateLimit, nutritionJson, NutritionSecurityError } from "@/lib/nutrition-chat/security";
import { parseNutritionWorkbook } from "@/lib/nutrition-chat/workbook";
import { prepareNutritionMenu } from "@/lib/nutrition-chat/service";
import { NUTRITION_LIMITS, NutritionInputError } from "@/lib/nutrition-chat/validation";
import {prisma} from "@/lib/prisma";
import {nutritionResponseGuidance} from "@/lib/nutrition-chat/response-guidance";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    const identity=await nutritionRestIdentity(request,"nutrition:calculate");
    await enforceNutritionRateLimit(`nutrition-import:${identity.userId}`,{limit:4,windowSeconds:60});
    const max=NUTRITION_LIMITS.uploadBytes+65536,length=request.headers.get("content-length"),contentType=request.headers.get("content-type")??"";
    if(!contentType.startsWith("multipart/form-data;") || contentType.length>300)throw new NutritionInputError("Cần gửi file bằng multipart/form-data.","file",415);
    if(length && (!/^\d{1,10}$/.test(length) || Number(length)>max))throw new NutritionInputError("File vượt 5 MB.","file",413);
    if(!request.body)throw new NutritionInputError("Thiếu file.","file");
    const reader=request.body.getReader(),chunks:Uint8Array[]=[];let bytes=0,timer:ReturnType<typeof setTimeout>|undefined;
    const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new NutritionInputError("Hết thời gian nhận file.","file",408)),10_000);});
    try{while(true){const part=await Promise.race([reader.read(),deadline]);if(part.done)break;bytes+=part.value.byteLength;if(bytes>max)throw new NutritionInputError("File vượt 5 MB.","file",413);chunks.push(part.value);}}
    finally{if(timer)clearTimeout(timer);void reader.cancel().catch(()=>undefined);}
    const form=await new Response(Buffer.concat(chunks),{headers:{"content-type":contentType}}).formData();
    const files=form.getAll("file"),file=files[0];
    if([...form.keys()].some(key=>key!=="file") || files.length!==1 || !(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || !file.size || file.size>NUTRITION_LIMITS.uploadBytes)throw new NutritionInputError("Chọn đúng một file .xlsx của hệ thống, tối đa 5 MB.","file",413);
    return await prisma.$transaction(async tx=>{
      const slots=await tx.$queryRaw<Array<{acquired:boolean}>>`SELECT pg_try_advisory_xact_lock(hashtextextended('nutrition-chat-workbook-v1',0)) AS "acquired"`;
      if(!slots[0]?.acquired)throw new NutritionSecurityError("workbook_busy",503,"Máy chủ đang xử lý Excel; thử lại sau.",undefined,15);
      const input=await parseNutritionWorkbook(new Uint8Array(await file.arrayBuffer()));
      const prepared=await prepareNutritionMenu(input,identity);
      return nutritionJson({...prepared,guidance:nutritionResponseGuidance("prepare_menu",prepared,identity)});
    },{timeout:60_000,maxWait:2000});
  }catch(error){return nutritionRestError(error);}
}
