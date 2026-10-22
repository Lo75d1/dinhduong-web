import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getSessionUser } from "@/lib/auth";
import type { NutritionIdentity } from "@/lib/nutrition-chat/contracts";
import { connectionCsrf, validateConnectionCsrf, validateNutritionOrigin, NutritionSecurityError, getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { getNutritionIdentity, enforceNutritionRateLimit } from "@/lib/nutrition-chat/security";
import { validateOperationObject, operationId } from "@/lib/nutrition-chat/service";
import { validateMenuLibraryDraft, draftWarnings, menuInputError } from "./validation";
import type { MenuLibraryDraft } from "./contracts";
import { EATING_CONTEXT_OPTIONS } from "./contracts";
import { menuListMetadata } from "./list-metadata";
import { menuConnectionCode } from "./connection";

type Tx = Prisma.TransactionClient;
export type MenuActor = { userId: string; clientId: string | null; familyId: string | null; via: "session" | "oauth" };
function deny(message = "Admin chưa ủy quyền kho mẫu cho phiên kết nối này.", status = 403): never { throw new NutritionSecurityError("menu_library_access", status, message); }
export function delegatedActor(identity: NutritionIdentity): MenuActor {
  if (identity.kind === "guest" || !identity.familyId || !identity.scopes.includes("nutrition:read")) deny();
  return { userId: identity.userId, clientId: identity.clientId, familyId: identity.familyId, via: "oauth" };
}
export async function assertMenuActor(actor: MenuActor, write = false, tx: Tx = prisma) {
  const user = await tx.user.findUnique({ where: { id: actor.userId } });
  if (!user || user.disabledAt || user.role !== "ADMIN") deny("Bạn không có quyền quản trị kho mẫu.");
  if (actor.via === "oauth") {
    const now = new Date();
    const grant = await tx.menuLibraryGrant.findFirst({ where: { ownerId: actor.userId, clientId: actor.clientId!, familyId: actor.familyId!, revokedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" } });
    if (!grant) deny(`Admin chưa ủy quyền kho mẫu cho phiên ${menuConnectionCode(actor.familyId!)}. Mở /quan-tri/ket-noi-ai, chọn đúng mã phiên và cấp quyền; giữ nguyên kết nối AI rồi thử lại.`);
    if (write && grant.permission !== "write") deny(`Phiên ${menuConnectionCode(actor.familyId!)} chỉ có quyền đọc kho mẫu. Admin chọn đúng mã phiên tại /quan-tri/ket-noi-ai và cấp quyền đọc/lưu/sửa nháp; giữ nguyên kết nối AI rồi thử lại.`);
    const token = await tx.nutritionOAuthToken.findFirst({ where: { userId: actor.userId, clientId: actor.clientId!, familyId: actor.familyId!, revokedAt: null, accessExpiresAt: { gt: now }, client: { disabledAt: null, expiresAt: { gt: now }, authMethod: { not: "api_token" } } } });
    if (!token) deny("Phiên kết nối đã hết hiệu lực.");
  } else {
    const current = await getSessionUser(tx);
    if (!current || current.id !== actor.userId || current.role !== "ADMIN") deny("Bạn cần đăng nhập quản trị.", 401);
  }
  return user;
}
export async function requestMenuActor(request: Request, write = false, humanOnly = false): Promise<MenuActor> {
  validateNutritionOrigin(request);
  let actor: MenuActor;
  if (request.headers.has("authorization")) {
    if (humanOnly) deny("Chỉ Admin đăng nhập trên website mới được cấp hoặc thu hồi ủy quyền.");
    actor = delegatedActor(await getNutritionIdentity(request, "nutrition:read"));
  } else {
    const user = await getSessionUser();
    if (!user) deny("Bạn cần đăng nhập quản trị.", 401);
    actor = { userId: user.id, clientId: null, familyId: null, via: "session" };
    if (write) { validateNutritionOrigin(request, true); validateConnectionCsrf(user.id, request.headers.get("x-menu-library-csrf") ?? undefined); }
  }
  await assertMenuActor(actor, write);
  await enforceNutritionRateLimit(`menu-library:${write ? "write" : "read"}:${actor.userId}`, { limit: write ? 30 : 120, windowSeconds: 60 });
  return actor;
}
export async function lockActor(tx: Tx, actor: MenuActor) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"nutrition-user-grants:" + actor.userId}, 0))::text`;
  if (actor.familyId) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.familyId}, 0))::text`;
  await assertMenuActor(actor, true, tx);
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
function contentHash(content: unknown) { return createHash("sha256").update(canonical(content)).digest("hex"); }
function summary(item: { id: string; title: string; direction: string; revision: number; createdBy: string; createdAt: Date; updatedAt: Date }) {
  return { id: item.id, title: item.title, direction: item.direction, revision: item.revision, createdBy: item.createdBy, createdAt: item.createdAt, updatedAt: item.updatedAt, url: `${getNutritionPublicUrl()}/quan-tri/kho-thuc-don?template=${encodeURIComponent(item.id)}` };
}
const summarySelect = { id: true, title: true, direction: true, revision: true, createdBy: true, createdAt: true, updatedAt: true } as const;

export async function listMenuTemplates(actor: MenuActor, q = "", offset = 0, direction = "", eatingContext = "") {
  await assertMenuActor(actor);
  if (!["", "individual", "collective"].includes(direction) || !["", ...EATING_CONTEXT_OPTIONS.map(option => option.value)].includes(eatingContext) || q.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 10000) menuInputError("Bộ lọc không hợp lệ.", "query");
  q = q.trim();
  // Search and direction both run before pagination. At most one page plus lookahead
  // is read; only the small metadata projection leaves this server function.
  const rows = await prisma.menuLibraryTemplate.findMany({ where: {
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { document: { path: ["unit", "label"], string_contains: q, mode: "insensitive" as const } },
    ] } : {}),
    ...(direction ? { direction } : {}),
    ...(eatingContext ? { document: { path: ["eatingContext"], equals: eatingContext } } : {}),
  }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: offset, take: 21, select: { ...summarySelect, document: true } });
  const items = await Promise.all(rows.slice(0, 20).map(async row => {
    const review = await prisma.menuLibraryReview.findFirst({ where: { templateId: row.id, revision: row.revision }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { decision: true } });
    return { ...summary(row), ...menuListMetadata(row.document), reviewState: review?.decision ?? "draft" };
  }));
  return { items, nextOffset: rows.length > 20 ? offset + 20 : null, ...(actor.via === "session" ? { csrf: connectionCsrf(actor.userId) } : {}) };
}
export async function getMenuTemplate(actor: MenuActor, id: string) {
  await assertMenuActor(actor); operationId(id, "id");
  const item = await prisma.menuLibraryTemplate.findUnique({ where: { id } });
  if (!item) menuInputError("Không tìm thấy mẫu.", "id", 404);
  const history = await prisma.menuLibraryVersion.findMany({ where: { templateId: id }, orderBy: { revision: "desc" }, take: 20, select: { revision: true, actorId: true, clientId: true, reason: true, createdAt: true } });
  const draft = item.document as unknown as MenuLibraryDraft;
  const ids = [...new Set(draft.days.flatMap(day => day.meals.flatMap(meal => meal.groupPortions.flatMap(portion => portion.dishes.flatMap(dish => dish.ingredients.map(ingredient => ingredient.foodId))))))];
  const foods = ids.length ? await prisma.food.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, unit: true } }) : [];
  const reviews = await prisma.menuLibraryReview.findMany({ where: { templateId: id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30, select: { id: true, revision: true, decision: true, reviewerName: true, note: true, createdAt: true, analysisDigest: true } });
  const currentReview = await prisma.menuLibraryReview.findFirst({ where: { templateId: id, revision: item.revision }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, revision: true, decision: true, reviewerName: true, note: true, createdAt: true, analysisDigest: true, analysis: true } });
  const warnings = draftWarnings(draft);
  if (currentReview) warnings[0] = currentReview.decision === "approved" ? "Đã duyệt phiên bản này. Khi áp dụng cần đối chiếu hồ sơ và chỉ định; không phải xác nhận đủ mọi chất hoặc tính đi chợ." : "Phiên bản này được yêu cầu chỉnh sửa; xem nhận xét của người duyệt.";
  return { template: summary({ id: item.id, title: item.title, direction: item.direction, revision: item.revision, createdBy: item.createdBy, createdAt: item.createdAt, updatedAt: item.updatedAt }), content: draft, foods, history, reviews, currentReview, ...(actor.via === "session" ? { csrf: connectionCsrf(actor.userId) } : {}), warnings };
}
async function checkCatalogIds(tx: Tx, draft: MenuLibraryDraft) {
  const dishes = draft.days.flatMap(day => day.meals.flatMap(meal => meal.groupPortions.flatMap(portion => portion.dishes)));
  const ingredients = dishes.flatMap(dish => dish.ingredients), foodIds = [...new Set(ingredients.map(item => item.foodId))], recipeIds = [...new Set(dishes.flatMap(dish => dish.recipeId ? [dish.recipeId] : []))];
  const foods = foodIds.length ? await tx.food.findMany({ where: { id: { in: foodIds } }, select: { id: true, unit: true } }) : [];
  const recipes = recipeIds.length ? await tx.dish.findMany({ where: { id: { in: recipeIds } }, select: { id: true } }) : [];
  if (foods.length !== foodIds.length || recipes.length !== recipeIds.length) menuInputError("Có mã thực phẩm hoặc công thức không tồn tại trong kho.", "catalogIds", 422);
  if (ingredients.some(item => (foods.find(food => food.id === item.foodId)?.unit || "g") !== item.unit)) menuInputError("Đơn vị nguyên liệu không khớp kho; không tự đổi g/ml.", "unit", 422);
  const dietIds = [...new Set(draft.groups.flatMap(group => group.dietCode ? [group.dietCode] : []))];
  if (dietIds.length && (await tx.dietCode.findMany({ where: { id: { in: dietIds } }, select: { id: true } })).length !== dietIds.length) menuInputError("Mã chế độ ăn chưa có trong kho.", "dietCode", 422);
}
export async function saveMenuTemplate(actor: MenuActor, value: unknown, templateId?: string) {
  const args = validateOperationObject(value, ["content", "requestKey", "expectedRevision", "reason"], ["content", "requestKey", "reason"]);
  const draft = validateMenuLibraryDraft(args.content), requestKey = operationId(args.requestKey, "requestKey");
  if (typeof args.reason !== "string" || !args.reason.trim() || args.reason.length > 500 || /[\x00-\x1f\x7f]/.test(args.reason)) menuInputError("Cần ghi lý do lưu mẫu.", "reason");
  const reason = args.reason.trim(), expected = args.expectedRevision;
  if (templateId ? draft.id !== templateId || !Number.isInteger(expected) || Number(expected) < 1 || draft.version !== Number(expected) + 1 : expected !== undefined || draft.version !== 1) menuInputError("ID/phiên bản chưa khớp. Tạo mới version=1; sửa dùng expectedRevision và version tiếp theo.", "version", 409);
  const hash = contentHash(draft);
  return prisma.$transaction(async tx => {
    await lockActor(tx, actor);
    if (!templateId) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"menu-request:" + actor.userId + ":" + requestKey}, 0))::text`;
    // A second Admin can edit this shared catalog, but concurrent edits must not overwrite.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"menu-template:" + draft.id}, 0))::text`;
    const replay = await tx.menuLibraryVersion.findFirst({ where: { templateId: draft.id, actorId: actor.userId, revision: draft.version } });
    if (templateId && replay && contentHash(replay.document) === hash) return { id: draft.id, revision: draft.version, replayed: true, url: summary({ id: draft.id, title: draft.title, direction: draft.direction, revision: draft.version, createdBy: actor.userId, createdAt: new Date(), updatedAt: new Date() }).url, warnings: draftWarnings(draft) };
    await checkCatalogIds(tx, draft);
    if (draft.derivedFrom) {
      if (draft.derivedFrom.templateId === draft.id || !await tx.menuLibraryVersion.findFirst({ where: { templateId: draft.derivedFrom.templateId, revision: draft.derivedFrom.version } })) menuInputError("Mẫu gốc/phiên bản không tồn tại.", "derivedFrom", 422);
    }
    if (!templateId) {
      const existing = await tx.menuLibraryTemplate.findFirst({ where: { createdBy: actor.userId, requestKey } });
      if (existing) {
        const original = await tx.menuLibraryVersion.findFirst({ where: { templateId: existing.id, revision: 1 } });
        if (!original || contentHash(original.document) !== hash) menuInputError("requestKey đã dùng cho nội dung khác.", "requestKey", 409);
        return { ...summary(existing), replayed: true, warnings: draftWarnings(existing.document as unknown as MenuLibraryDraft) };
      }
      if (await tx.menuLibraryTemplate.findUnique({ where: { id: draft.id } })) menuInputError("ID mẫu đã tồn tại.", "id", 409);
      await tx.menuLibraryTemplate.create({ data: { id: draft.id, title: draft.title, direction: draft.direction, revision: 1, document: draft as unknown as Prisma.InputJsonValue, createdBy: actor.userId, requestKey, contentHash: hash } });
    } else {
      const changed = await tx.menuLibraryTemplate.updateMany({ where: { id: templateId, revision: Number(expected) }, data: { title: draft.title, direction: draft.direction, revision: draft.version, document: draft as unknown as Prisma.InputJsonValue, contentHash: hash } });
      if (changed.count !== 1) menuInputError("Mẫu đã đổi phiên bản hoặc không tồn tại. Đọc lại trước khi sửa.", "expectedRevision", 409);
    }
    await tx.menuLibraryVersion.create({ data: { templateId: draft.id, revision: draft.version, document: draft as unknown as Prisma.InputJsonValue, actorId: actor.userId, clientId: actor.clientId, reason } });
    return { ...summary((await tx.menuLibraryTemplate.findUniqueOrThrow({ where: { id: draft.id }, select: summarySelect }))), replayed: false, warnings: draftWarnings(draft) };
  }, { maxWait: 5000, timeout: 15000 });
}

export async function menuDelegations(actor: MenuActor) {
  if (actor.via !== "session") deny();
  await assertMenuActor(actor);
  const now = new Date();
  const tokens = await prisma.nutritionOAuthToken.findMany({ where: { userId: actor.userId, rotatedAt: null, revokedAt: null, refreshExpiresAt: { gt: now }, client: { authMethod: { not: "api_token" }, disabledAt: null, expiresAt: { gt: now } } }, select: { familyId: true, clientId: true, createdAt: true, client: { select: { name: true, redirectUris: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  const grants = await prisma.menuLibraryGrant.findMany({ where: { ownerId: actor.userId, revokedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, familyId: true, clientId: true, permission: true, expiresAt: true, createdAt: true } });
  return { csrf: connectionCsrf(actor.userId), connections: tokens.map(token => ({ connectionCode: menuConnectionCode(token.familyId), familyId: token.familyId, clientId: token.clientId, name: token.client.name, hosts: token.client.redirectUris.map(uri => new URL(uri).hostname), createdAt: token.createdAt, grant: grants.find(grant => grant.familyId === token.familyId && grant.clientId === token.clientId) ?? null })) };
}
export async function changeMenuDelegation(actor: MenuActor, value: unknown, revoke = false) {
  if (actor.via !== "session") deny();
  const args = validateOperationObject(value, revoke ? ["id"] : ["familyId", "permission", "hours"], revoke ? ["id"] : ["familyId", "permission", "hours"]);
  return prisma.$transaction(async tx => {
    await lockActor(tx, actor);
    const grant = revoke ? await tx.menuLibraryGrant.findFirst({ where: { id: operationId(args.id, "id"), ownerId: actor.userId } }) : null;
    if (revoke && !grant) menuInputError("Không tìm thấy ủy quyền.", "id", 404);
    const familyId = grant?.familyId ?? operationId(args.familyId, "familyId");
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${familyId}, 0))::text`;
    const now = new Date();
    if (revoke) {
      await tx.menuLibraryGrant.updateMany({ where: { id: grant!.id, ownerId: actor.userId, revokedAt: null }, data: { revokedAt: now } });
      await tx.dataChangeLog.create({ data: { entityType: "MENU_LIBRARY_GRANT", entityId: grant!.id, action: "REVOKE", actorId: actor.userId, actorName: actor.userId, reason: "Admin thu hồi quyền AI quản lý mẫu." } });
      return { revoked: true };
    }
    if (!["read", "write"].includes(String(args.permission)) || ![1, 8, 24, 168].includes(Number(args.hours)) || typeof args.hours !== "number") menuInputError("Chọn quyền đọc/ghi và hạn 1 giờ, 8 giờ, 24 giờ hoặc 7 ngày.", "permission");
    const token = await tx.nutritionOAuthToken.findFirst({ where: { familyId, userId: actor.userId, revokedAt: null, rotatedAt: null, refreshExpiresAt: { gt: now }, client: { authMethod: { not: "api_token" }, disabledAt: null, expiresAt: { gt: now } } } });
    if (!token) deny("Chỉ cấp quyền cho phiên OAuth đang kết nối với chính tài khoản Admin này.");
    await tx.menuLibraryGrant.updateMany({ where: { ownerId: actor.userId, familyId, revokedAt: null }, data: { revokedAt: now } });
    const created = await tx.menuLibraryGrant.create({ data: { ownerId: actor.userId, clientId: token.clientId, familyId, permission: String(args.permission), expiresAt: new Date(now.getTime() + Number(args.hours) * 3600000) } });
    await tx.dataChangeLog.create({ data: { entityType: "MENU_LIBRARY_GRANT", entityId: created.id, action: "GRANT", actorId: actor.userId, actorName: actor.userId, afterJson: { familyId, clientId: token.clientId, permission: created.permission, expiresAt: created.expiresAt.toISOString() }, reason: "Admin chủ động ủy quyền kho mẫu cho phiên AI." } });
    return { id: created.id, expiresAt: created.expiresAt, permission: created.permission };
  });
}
