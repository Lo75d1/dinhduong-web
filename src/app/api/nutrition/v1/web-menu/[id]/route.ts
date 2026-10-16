import {readNutritionJson,nutritionJson} from "@/lib/nutrition-chat/security";
import {nutritionRestError} from "@/lib/nutrition-chat/rest";
import {validateOperationObject} from "@/lib/nutrition-chat/service";
import {requireWebMenuOrigin,webMenuAccess,webMenuPayload} from "@/lib/nutrition-chat/web-menu";
import {executeNutritionTool} from "@/lib/nutrition-chat/operations";
import {NUTRITION_LIMITS,NutritionInputError} from "@/lib/nutrition-chat/validation";
type Context={params:Promise<{id:string}>};
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:Context){
  try{return nutritionJson(await webMenuPayload(await webMenuAccess(request,(await context.params).id)));}catch(error){return nutritionRestError(error);}
}
export async function POST(request:Request,context:Context){
  try{
    requireWebMenuOrigin(request);const access=await webMenuAccess(request,(await context.params).id);
    const args=validateOperationObject(await readNutritionJson(request,NUTRITION_LIMITS.jsonBytes),["action","input","confirmationToken"],["action","input"]);
    if(!["prepare","calculate","export"].includes(String(args.action)))throw new NutritionInputError("Thao tác bản tạm không hợp lệ.","action");
    const name=args.action==="prepare"?"prepare_menu":args.action==="calculate"?"calculate_menu":"export_workbook";
    const value={input:args.input,...(args.confirmationToken!==undefined?{confirmationToken:args.confirmationToken}:{})};
    return nutritionJson(await executeNutritionTool(name,value,access.identity));
  }catch(error){return nutritionRestError(error);}
}
