import { requestMenuActor } from "@/lib/menu-library/store";
import { uploadMenuImage, uploadMenuImageBase64 } from "@/lib/menu-library/image-service";
import { libraryJson, libraryError } from "@/lib/menu-library/http";
import { MENU_IMAGE_JSON_BYTES, MENU_IMAGE_MAX_BYTES } from "@/lib/menu-library/illustration";
import { readNutritionJson, readNutritionBytes } from "@/lib/nutrition-chat/http";
import { NutritionInputError } from "@/lib/nutrition-chat/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const actor = await requestMenuActor(request, true);
    const type = request.headers.get("content-type") ?? "";
    if (type.split(";")[0].trim() === "application/json") return libraryJson(await uploadMenuImageBase64(actor, await readNutritionJson(request, MENU_IMAGE_JSON_BYTES)), 201);
    if (!type.startsWith("multipart/form-data;") || type.length > 300) throw new NutritionInputError("Chọn ảnh bằng multipart/form-data hoặc gửi base64 bằng JSON.", "file", 415);
    const body = await readNutritionBytes(request, MENU_IMAGE_MAX_BYTES + 65536);
    let form: FormData;
    try { form = await new Response(new Uint8Array(body), { headers: { "content-type": type } }).formData(); }
    catch { throw new NutritionInputError("Nội dung tải ảnh không hợp lệ.", "file"); }
    const fields = ["file", "alt", "sourceKind", "requestKey"];
    if ([...form.keys()].some(key => !fields.includes(key)) || fields.some(key => form.getAll(key).length !== 1)) throw new NutritionInputError("Gửi đúng một ảnh, mô tả, nguồn ảnh và mã tải.", "file");
    const file = form.get("file");
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new NutritionInputError("Chỉ nhận JPG, PNG hoặc WebP.", "file", 415);
    return libraryJson(await uploadMenuImage(actor, Buffer.from(await file.arrayBuffer()), { alt: form.get("alt"), sourceKind: form.get("sourceKind"), requestKey: form.get("requestKey") }), 201);
  } catch (error) { return libraryError(error); }
}
