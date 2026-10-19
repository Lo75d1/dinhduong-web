import "server-only";
import { getSessionUser } from "@/lib/auth";
import { getNutritionIdentity, getNutritionPublicUrl, validateNutritionOrigin, NutritionSecurityError, nutritionErrorResponse, nutritionJson } from "./security";
import { NutritionInputError } from "./validation";
import type { NutritionIdentity } from "./contracts";
import { nutritionErrorGuidance } from "./response-guidance";

export async function nutritionRestIdentity(request:Request,scope:string):Promise<NutritionIdentity> {
  validateNutritionOrigin(request);
  if(request.headers.has("authorization"))return getNutritionIdentity(request,scope);
  // Browser mutations require exact same-origin plus existing SameSite session.
  if(request.method!=="GET" && request.headers.get("origin")!==getNutritionPublicUrl())throw new NutritionSecurityError("invalid_origin",403,"Gửi thao tác từ trang web đã đăng nhập.");
  const user=await getSessionUser();
  if(!user)throw new NutritionSecurityError("invalid_token",401,"Chưa có phiên xác thực. Chỉ tra/tính/Excel: mở phiên tạm bằng POST /api/nutrition/v1/guest-session rồi gửi Bearer trong header; không cần đăng ký. Lưu/mở dữ liệu riêng mới cần đăng nhập.",scope);
  return {userId:user.id,clientId:"web-session",scopes:["nutrition:read","nutrition:calculate","nutrition:write","nutrition:export"]};
}
export function nutritionRestError(error:unknown):Response {
  return error instanceof NutritionInputError?nutritionJson({error:"invalid_input",message:error.message,field:error.field,guidance:nutritionErrorGuidance(error.status,error.field)},error.status):nutritionErrorResponse(error);
}
