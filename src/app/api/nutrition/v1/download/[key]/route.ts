import { readNutritionDownload } from "@/lib/nutrition-chat/downloads";
import { nutritionRestError } from "@/lib/nutrition-chat/rest";
import { NUTRITION_NO_STORE_HEADERS, validateNutritionOrigin } from "@/lib/nutrition-chat/security";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{key:string}>}) {
  try {
    validateNutritionOrigin(request);const {key}=await params;
    const bytes=await readNutritionDownload(key,new URL(request.url).searchParams.get("ticket"));
    return new Response(new Uint8Array(bytes),{headers:{...NUTRITION_NO_STORE_HEADERS,"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":"attachment; filename=\"Dinh-duong-2598.xlsx\"","Content-Length":String(bytes.length)}});
  }catch(error){return nutritionRestError(error);}
}
