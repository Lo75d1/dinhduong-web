import { getNutritionIdentity } from "@/lib/nutrition-chat/security";
import { readNutritionJsonWithSize } from "@/lib/nutrition-chat/http";
import { validateOperationObject } from "@/lib/nutrition-chat/service";
import { isAdminMenuTool, executeAdminMenuTool } from "@/lib/menu-library/ai-tools";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { menuInputError } from "@/lib/menu-library/validation";
import { MENU_IMAGE_JSON_BYTES } from "@/lib/menu-library/illustration";
import { assertMenuActor, delegatedActor } from "@/lib/menu-library/store";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const identity = await getNutritionIdentity(request, "nutrition:read");
    const large = !request.headers.has("content-length") || Number(request.headers.get("content-length")) > 524288;
    if (large && request.headers.has("content-length")) await assertMenuActor(delegatedActor(identity), true);
    const received = await readNutritionJsonWithSize(request, large ? MENU_IMAGE_JSON_BYTES : 524288);
    const args = validateOperationObject(received.value, ["name", "arguments"], ["name"]);
    if (received.byteLength > 524288 && args.name !== "upload_admin_menu_image") menuInputError("Yêu cầu vượt dung lượng cho phép.", "body", 413);
    if (typeof args.name !== "string" || !isAdminMenuTool(args.name)) menuInputError("Công cụ không tồn tại.", "name", 404);
    return libraryJson(await executeAdminMenuTool(args.name, args.arguments ?? {}, identity));
  } catch (error) { return libraryError(error); }
}
