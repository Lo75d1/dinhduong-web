import {readNutritionJson,nutritionJson} from "@/lib/nutrition-chat/security";
import {nutritionRestError} from "@/lib/nutrition-chat/rest";
import {validateOperationObject} from "@/lib/nutrition-chat/service";
import {webMenuId} from "@/lib/nutrition-chat/web-menu-store";
import {requireWebMenuOrigin,webMenuAccess,webMenuPayload,webMenuSetCookie} from "@/lib/nutrition-chat/web-menu";
import {NutritionInputError} from "@/lib/nutrition-chat/validation";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  try{
    requireWebMenuOrigin(request);
    const args=validateOperationObject(await readNutritionJson(request,1024),["key"],["key"]);
    if(typeof args.key!=="string")throw new NutritionInputError("Mở đúng link bản tạm từ chat.","key");
    const access=await webMenuAccess(request,webMenuId(args.key),args.key),payload=await webMenuPayload(access);
    return nutritionJson(payload,200,{"Set-Cookie":webMenuSetCookie(args.key,access.expiresAt)});
  }catch(error){return nutritionRestError(error);}
}
