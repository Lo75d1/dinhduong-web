import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import { mapNutritionFood } from "@/lib/nutrition-chat/repository";
import { validateOperationObject, operationId } from "@/lib/nutrition-chat/service";
import { NutritionSecurityError } from "@/lib/nutrition-chat/oauth-validation";
import { assertMenuActor, lockActor, type MenuActor } from "./store";
import { analyzeLibraryDraft } from "./analysis";
import { menuInputError, validateMenuLibraryDraft } from "./validation";
import type { MenuLibraryDraft } from "./contracts";

type Tx = Prisma.TransactionClient;
const fields = ALL_NUTRIENT_FIELDS.map(field => field.key);
async function analysisFor(tx: Tx, draft: MenuLibraryDraft) {
  const ids = [...new Set(draft.days.flatMap(day => day.meals.flatMap(meal => meal.groupPortions.flatMap(portion => portion.dishes.flatMap(dish => dish.ingredients.map(ingredient => ingredient.foodId))))))];
  const raw = await tx.food.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, source: true, sourceCode: true, foodType: true, unit: true, wastePercent: true, foodGroup: true, ...Object.fromEntries(fields.map(key => [key, true])) } });
  const recommendations = draft.groups.some(group => group.recommendationProfile) ? await tx.nutritionRecommendation.findMany({ orderBy: { stt: "asc" } }) : [];
  return analyzeLibraryDraft(draft, raw.map(food => mapNutritionFood(food as unknown as Record<string, unknown>, fields)), recommendations);
}
async function current(tx: Tx, id: string, expected: unknown) {
  operationId(id, "id");
  if (!Number.isInteger(expected) || Number(expected) < 1) menuInputError("Cần phiên bản đang xem.", "expectedRevision");
  const item = await tx.menuLibraryTemplate.findUnique({ where: { id } });
  if (!item || item.revision !== expected) menuInputError("Mẫu đã thay đổi. Mở lại mẫu trước khi phân tích hoặc duyệt.", "expectedRevision", 409);
  return item.document as unknown as MenuLibraryDraft;
}
export async function analyzeMenuTemplate(actor: MenuActor, id: string, value: unknown) {
  await assertMenuActor(actor);
  const args = validateOperationObject(value, ["expectedRevision", "content"], ["expectedRevision"]);
  const saved = await current(prisma, id, args.expectedRevision);
  const draft = args.content === undefined ? saved : validateMenuLibraryDraft(args.content);
  if (draft.id !== saved.id || draft.version !== saved.version) menuInputError("Bản đang sửa không khớp mẫu hoặc phiên bản.", "content", 409);
  // An unsaved calculation never writes a template, version, or approval.
  return analysisFor(prisma, draft);
}
export async function getMenuReview(actor: MenuActor, id: string, reviewId: string) {
  await assertMenuActor(actor);
  operationId(id, "id"); operationId(reviewId, "reviewId");
  const review = await prisma.menuLibraryReview.findFirst({ where: { id: reviewId, templateId: id }, select: { id: true, revision: true, decision: true, reviewerName: true, note: true, createdAt: true, analysisDigest: true, analysis: true } });
  if (!review) menuInputError("Không tìm thấy lần duyệt của mẫu này.", "reviewId", 404);
  return review;
}
export async function reviewMenuTemplate(actor: MenuActor, id: string, value: unknown) {
  if (actor.via !== "session") throw new NutritionSecurityError("menu_library_access", 403, "Chỉ Admin đăng nhập trên website mới được duyệt mẫu.");
  const args = validateOperationObject(value, ["expectedRevision", "decision", "note", "analysisDigest", "acknowledged"], ["expectedRevision", "decision", "note", "analysisDigest", "acknowledged"]);
  if (!["approved", "changes_requested"].includes(String(args.decision)) || typeof args.note !== "string" || args.note.length > 2000 || /[\x00-\x1f\x7f]/.test(args.note)) menuInputError("Kết quả duyệt hoặc ghi chú không hợp lệ.");
  if (args.decision === "changes_requested" && !args.note.trim()) menuInputError("Ghi nội dung cần chỉnh sửa.", "note");
  if (args.acknowledged !== true) menuInputError("Cần xác nhận đã kiểm tra món, định lượng và dữ liệu thiếu.", "acknowledged");
  const note = args.note.trim();
  return prisma.$transaction(async tx => {
    await lockActor(tx, actor);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"menu-template:" + id}, 0))::text`;
    const draft = await current(tx, id, args.expectedRevision);
    const analysis = await analysisFor(tx, draft);
    if (args.analysisDigest !== analysis.digest) menuInputError("Dữ liệu phân tích đã thay đổi. Phân tích lại và kiểm tra trước khi duyệt.", "analysisDigest", 409);
    if (args.decision === "approved" && !analysis.canApprove) menuInputError("Còn thiếu cấu trúc hoặc cơ sở tính. Chỉnh sửa trước khi duyệt.", "analysis", 422);
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.userId } });
    // Retry after a lost response does not append a duplicate identical decision.
    const last = await tx.menuLibraryReview.findFirst({ where: { templateId: id, revision: draft.version }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (last && last.reviewerId === actor.userId && last.decision === args.decision && last.note === note && last.analysisDigest === analysis.digest) return { id: last.id, revision: draft.version, replayed: true };
    const saved = await tx.menuLibraryReview.create({ data: {
      templateId: id, revision: draft.version, decision: String(args.decision), reviewerId: actor.userId,
      reviewerName: user.displayName || user.email, note, analysis: analysis as unknown as Prisma.InputJsonValue, analysisDigest: analysis.digest,
    } });
    return { id: saved.id, revision: draft.version, replayed: false };
  }, { maxWait: 5000, timeout: 20000 });
}
