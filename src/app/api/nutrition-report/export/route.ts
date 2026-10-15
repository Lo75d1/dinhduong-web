import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import { resolveMenu } from "@/lib/nutrition-chat/core";
import { withNutritionWorkbookSlot } from "@/lib/nutrition-chat/downloads";
import { loadNutritionCatalogue, loadNutritionRecommendations } from "@/lib/nutrition-chat/repository";
import { nutritionRestError } from "@/lib/nutrition-chat/rest";
import { prepareNutritionMenu, saveNutritionMenu, validateOperationObject } from "@/lib/nutrition-chat/service";
import { nutritionRestIdentity } from "@/lib/nutrition-chat/rest";
import { nutritionWebsiteLink } from "@/lib/nutrition-chat/website-links";
import { enforceNutritionRateLimit, getNutritionPublicUrl, nutritionAnonymousKey, NutritionSecurityError, readNutritionJson, validateNutritionOrigin } from "@/lib/nutrition-chat/security";
import { NutritionInputError, NUTRITION_LIMITS, parseMenuInput } from "@/lib/nutrition-chat/validation";
import { buildNutritionWorkbook } from "@/lib/nutrition-chat/workbook";
import type { NutritionMedicationLine, NutritionReportMeta } from "@/lib/nutrition-chat/workbook-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const metadataKeys = ["subjectName", "subjectGroup", "clinicalCourse", "authorName", "authorRole", "authorOrganization", "reportDate", "menuNote"];
function shortText(value: unknown, maximum = 1000): string {
  if (typeof value !== "string" || value.length > maximum) throw new NutritionInputError("Thông tin báo cáo quá dài hoặc không hợp lệ.", "meta");
  return value.trim();
}
export async function POST(request: Request) {
  try {
    validateNutritionOrigin(request, true);
    if (request.headers.get("origin") !== getNutritionPublicUrl()) throw new NutritionSecurityError("invalid_origin", 403, "Xuất báo cáo từ trang website.");
    await enforceNutritionRateLimit(`web-report:${nutritionAnonymousKey(request)}`, { limit: 4, windowSeconds: 60 });
    await enforceNutritionRateLimit("nutrition-export-global", { limit: 60, windowSeconds: 3600 });
    const body = validateOperationObject(await readNutritionJson(request, NUTRITION_LIMITS.jsonBytes), ["input", "meta", "medications", "saveToAccount"], ["input"]);
    if (body.saveToAccount !== undefined && typeof body.saveToAccount !== "boolean") throw new NutritionInputError("Lựa chọn lưu tài khoản không hợp lệ.", "saveToAccount");
    const identity = body.saveToAccount === true ? await nutritionRestIdentity(request, "nutrition:write") : null;
    const input = parseMenuInput(body.input);
    const rawMeta = body.meta === undefined ? {} : validateOperationObject(body.meta, metadataKeys);
    const meta = Object.fromEntries(Object.entries(rawMeta).map(([key, value]) => [key, shortText(value, key === "menuNote" || key === "clinicalCourse" ? 4000 : 300)])) as NutritionReportMeta;
    if (body.medications !== undefined && (!Array.isArray(body.medications) || body.medications.length > 100)) throw new NutritionInputError("Tối đa 100 dòng thuốc/TPBS.");
    const medications = (body.medications as unknown[] | undefined ?? []).map(value => {
      const item = validateOperationObject(value, ["meal", "name", "dose", "timing", "note"], ["meal", "name", "dose", "timing", "note"]);
      return Object.fromEntries(Object.entries(item).map(([key, text]) => [key, shortText(text)])) as NutritionMedicationLine;
    });
    let savedMenuUrl: string | null = null;
    const bytes = await withNutritionWorkbookSlot(async () => {
      const [foods, recommendations] = await Promise.all([loadNutritionCatalogue(ALL_NUTRIENT_FIELDS.map(field => field.key)), input.comparison.mode === "profile" ? loadNutritionRecommendations() : Promise.resolve([])]);
      let menu = resolveMenu(input, foods, recommendations);
      if (identity) {
        const prepared = await prepareNutritionMenu(input, identity);
        const saved = await saveNutritionMenu({ input: prepared.input, confirmationToken: prepared.confirmationToken, idempotencyKey: `export-${prepared.preview.digest}` }, identity);
        menu = { ...menu, savedRecord: { id: saved.ration.id, revision: saved.ration.revision } };
        savedMenuUrl = nutritionWebsiteLink("saved", saved.ration.id);
      }
      return buildNutritionWorkbook(menu, foods, { meta, medications });
    });
    const headers = new Headers({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="bao-cao-dinh-duong.xlsx"',
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    });
    if (savedMenuUrl) headers.set("X-Nutrition-Saved-Url", savedMenuUrl);
    return new Response(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, { headers });
  } catch (error) { return nutritionRestError(error); }
}
