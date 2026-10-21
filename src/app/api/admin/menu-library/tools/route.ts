import { getNutritionIdentity } from "@/lib/nutrition-chat/security";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
import { validateOperationObject } from "@/lib/nutrition-chat/service";
import { isAdminMenuTool, executeAdminMenuTool } from "@/lib/menu-library/ai-tools";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { menuInputError } from "@/lib/menu-library/validation";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const identity = await getNutritionIdentity(request, "nutrition:read");
    const args = validateOperationObject(await readNutritionJson(request, 524288), ["name", "arguments"], ["name"]);
    if (typeof args.name !== "string" || !isAdminMenuTool(args.name)) menuInputError("Công cụ không tồn tại.", "name", 404);
    return libraryJson(await executeAdminMenuTool(args.name, args.arguments ?? {}, identity));
  } catch (error) { return libraryError(error); }
}
