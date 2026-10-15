import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  clearSession,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  requireSessionUser,
  SESSION_COOKIE,
  validPassword,
  verifyPassword,
  type SessionUser,
} from "@/lib/auth";
import { ACCOUNT_ROLES } from "@/lib/account-options";
import {
  CLIENT_SECONDS,
  connectionCsrf,
  getNutritionPublicUrl,
  getNutritionResourceUrl,
  hashNutritionToken,
  NUTRITION_PLATFORM_REDIRECTS,
  NUTRITION_SCOPES,
  NutritionSecurityError,
  randomNutritionToken,
  validateConnectionCsrf,
  validateNutritionOrigin,
} from "@/lib/nutrition-chat/oauth-validation";
import {
  enforceNutritionRateLimit,
  nutritionAnonymousKey,
  nutritionJson,
  readNutritionJson,
} from "@/lib/nutrition-chat/security";

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  disabledAt: true,
  createdAt: true,
} as const;
type Tx = Prisma.TransactionClient;
type Body = Record<string, unknown>;
function fail(message: string, status = 400): never {
  throw new NutritionSecurityError("account_error", status, message);
}
function object(value: unknown): Body {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Nội dung yêu cầu không hợp lệ.");
  return value as Body;
}
function text(value: unknown, max: number, label: string) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > max ||
    /[\x00-\x1f\x7f]/.test(value)
  )
    fail(`${label} không hợp lệ.`);
  return (value as string).trim();
}
function fields(body: Body, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    fail("Yêu cầu chứa trường không được phép.");
}
async function lockUser(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"nutrition-user-grants:" + id}, 0))::text`;
}
async function freshActor(tx: Tx, actor: SessionUser, admin = false) {
  const current = await requireSessionUser(tx);
  const user = await tx.user.findUnique({ where: { id: actor.id } });
  if (!user || current.id !== actor.id || user.disabledAt)
    fail("Phiên đăng nhập đã hết hiệu lực.", 401);
  if (admin && user.role !== "ADMIN") fail("Bạn không có quyền quản trị.", 403);
  return user;
}
async function passwordCheck(tx: Tx, userId: string, password: unknown) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (
    typeof password !== "string" ||
    password.length > 256 ||
    !user ||
    !verifyPassword(password, user.passwordHash)
  )
    fail("Mật khẩu hiện tại chưa đúng.", 403);
}
async function audit(
  tx: Tx,
  actor: SessionUser,
  id: string,
  action: string,
  reason: string,
  before?: Prisma.InputJsonObject,
  after?: Prisma.InputJsonObject,
) {
  await tx.dataChangeLog.create({
    data: {
      entityType: "ACCOUNT",
      entityId: id,
      action,
      actorId: actor.id,
      actorName: actor.displayName,
      reason,
      ...(before ? { beforeJson: before } : {}),
      ...(after ? { afterJson: after } : {}),
    },
  });
}
async function revokeAccess(tx: Tx, id: string) {
  await tx.session.deleteMany({ where: { userId: id } });
  await tx.nutritionOAuthCode.deleteMany({ where: { userId: id } });
  await tx.nutritionOAuthToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
export async function accountHandler(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof NutritionSecurityError)
      return nutritionJson(
        { error: error.description },
        error.status,
        error.retryAfter
          ? { "Retry-After": String(error.retryAfter) }
          : undefined,
      );
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return nutritionJson({ error: "Bạn cần đăng nhập." }, 401);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return nutritionJson({ error: "Email này đã được sử dụng." }, 409);
    return nutritionJson(
      { error: "Chưa thể xử lý yêu cầu. Vui lòng thử lại." },
      503,
    );
  }
}
export async function publicAccountInput(request: Request, action: string) {
  validateNutritionOrigin(request, true);
  await enforceNutritionRateLimit(`account:${action}:global`, {
    limit: action === "register" ? 100 : 1000,
    windowSeconds: 3600,
  });
  await enforceNutritionRateLimit(
    `account:${action}:${nutritionAnonymousKey(request)}`,
    { limit: action === "register" ? 10 : 60, windowSeconds: 3600 },
  );
  return object(await readNutritionJson(request, 4096));
}
async function mutation(request: Request, admin = false) {
  validateNutritionOrigin(request, true);
  const actor = await requireSessionUser();
  if (admin && actor.role !== "ADMIN")
    fail("Bạn không có quyền quản trị.", 403);
  validateConnectionCsrf(
    actor.id,
    request.headers.get("x-account-csrf") ?? undefined,
  );
  await enforceNutritionRateLimit(`account:manage:${actor.id}`, {
    limit: 120,
    windowSeconds: 3600,
  });
  const body = object(await readNutritionJson(request, 8192));
  return { actor, body };
}
export async function accountSnapshot() {
  const actor = await requireSessionUser();
  const raw = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const [
    user,
    sessions,
    connections,
    manualClients,
    rations,
    patients,
    activity,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: userSelect,
    }),
    prisma.session.findMany({
      where: { userId: actor.id, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        userAgent: true,
        tokenHash: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.nutritionOAuthToken.findMany({
      where: {
        userId: actor.id,
        rotatedAt: null,
        revokedAt: null,
        refreshExpiresAt: { gt: new Date() },
        client: { disabledAt: null, expiresAt: { gt: new Date() } },
      },
      select: {
        familyId: true,
        scopes: true,
        createdAt: true,
        refreshExpiresAt: true,
        client: { select: { name: true, redirectUris: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.nutritionOAuthClient.findMany({
      where: { ownerId: actor.id },
      select: {
        id: true,
        name: true,
        scopes: true,
        redirectUris: true,
        createdAt: true,
        expiresAt: true,
        disabledAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.ration.count({ where: { ownerId: actor.id } }),
    prisma.patient.count({ where: { ownerId: actor.id } }),
    prisma.dataChangeLog.findMany({
      where: { entityType: "ACCOUNT", entityId: actor.id },
      select: {
        id: true,
        action: true,
        actorName: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return {
    user,
    asOf: new Date().toISOString(),
    csrf: connectionCsrf(actor.id),
    sessions: sessions.map(({ tokenHash, ...session }) => ({
      ...session,
      current: tokenHash === hashSessionToken(raw),
    })),
    connections,
    manualClients,
    summary: { rations, patients },
    activity,
    mcpUrl: getNutritionResourceUrl(),
  };
}
export async function updateAccountProfile(request: Request) {
  const { actor, body } = await mutation(request);
  fields(body, ["displayName"]);
  const displayName = text(body.displayName, 100, "Tên hiển thị");
  const user = await prisma.$transaction(async (tx) => {
    await lockUser(tx, actor.id);
    await freshActor(tx, actor);
    const result = await tx.user.update({
      where: { id: actor.id },
      data: { displayName },
      select: userSelect,
    });
    await audit(
      tx,
      actor,
      actor.id,
      "PROFILE_UPDATE",
      "Người dùng cập nhật hồ sơ",
      { displayName: actor.displayName },
      { displayName },
    );
    return result;
  });
  return nutritionJson({ user });
}
export async function manageAccount(request: Request, action: string) {
  const { actor, body } = await mutation(request);
  if (action === "manual-create")
    await enforceNutritionRateLimit(`account:manual-create:${actor.id}`, {
      limit: 10,
      windowSeconds: 86400,
    });
  let secret: string | undefined;
  const result = await prisma.$transaction(
    async (tx) => {
      await lockUser(tx, actor.id);
      await freshActor(tx, actor);
      if (action === "password") {
        fields(body, ["currentPassword", "password"]);
        await passwordCheck(tx, actor.id, body.currentPassword);
        if (!validPassword(body.password))
          fail("Mật khẩu mới cần từ 10 đến 256 ký tự.");
        if (body.password === body.currentPassword)
          fail("Mật khẩu mới cần khác mật khẩu hiện tại.");
        await tx.user.update({
          where: { id: actor.id },
          data: { passwordHash: hashPassword(body.password as string) },
        });
        await revokeAccess(tx, actor.id);
        await audit(
          tx,
          actor,
          actor.id,
          "PASSWORD_CHANGE",
          "Người dùng đổi mật khẩu; thu hồi các phiên và kết nối",
        );
        return { signInAgain: true };
      }
      if (action === "sessions") {
        fields(body, ["sessionId", "otherSessions"]);
        const raw = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
        if (body.otherSessions === true)
          await tx.session.deleteMany({
            where: {
              userId: actor.id,
              tokenHash: { not: hashSessionToken(raw) },
            },
          });
        else {
          const id = text(body.sessionId, 128, "Phiên đăng nhập");
          const session = await tx.session.findFirst({
            where: { id, userId: actor.id },
          });
          if (!session) fail("Không tìm thấy phiên đăng nhập.", 404);
          if (session.tokenHash === hashSessionToken(raw))
            fail("Dùng nút Đăng xuất để kết thúc phiên hiện tại.");
          await tx.session.deleteMany({ where: { id, userId: actor.id } });
        }
        await audit(
          tx,
          actor,
          actor.id,
          "SESSIONS_REVOKE",
          "Người dùng thu hồi phiên đăng nhập khác",
        );
        return { ok: true };
      }
      if (action === "connections") {
        fields(body, ["familyId", "all"]);
        const familyId =
          body.all === true ? undefined : text(body.familyId, 128, "Kết nối");
        await tx.nutritionOAuthToken.updateMany({
          where: {
            userId: actor.id,
            revokedAt: null,
            ...(familyId ? { familyId } : {}),
          },
          data: { revokedAt: new Date() },
        });
        if (!familyId)
          await tx.nutritionOAuthCode.deleteMany({
            where: { userId: actor.id },
          });
        await audit(
          tx,
          actor,
          actor.id,
          "CONNECTIONS_REVOKE",
          familyId
            ? "Thu hồi một kết nối ứng dụng"
            : "Thu hồi mọi kết nối ứng dụng",
        );
        return { ok: true };
      }
      if (action === "manual-create") {
        fields(body, ["name", "platform", "currentPassword", "scopes"]);
        await passwordCheck(tx, actor.id, body.currentPassword);
        const name = text(body.name, 80, "Tên cấu hình");
        const platform = body.platform;
        if (platform !== "chatgpt" && platform !== "claude")
          fail("Chọn nền tảng kết nối.");
        if (
          !Array.isArray(body.scopes) ||
          !body.scopes.length ||
          body.scopes.some(
            (v) =>
              typeof v !== "string" ||
              !(NUTRITION_SCOPES as readonly string[]).includes(v),
          )
        )
          fail("Chọn ít nhất một quyền hợp lệ.");
        const scopes = [...new Set(body.scopes as string[])];
        const count = await tx.nutritionOAuthClient.count({
          where: {
            ownerId: actor.id,
            disabledAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        if (count >= 5)
          fail(
            "Đã có 5 cấu hình còn hiệu lực. Thu hồi cấu hình không dùng trước.",
            409,
          );
        secret = randomNutritionToken();
        const client = await tx.nutritionOAuthClient.create({
          data: {
            id: `nc_${randomNutritionToken()}`,
            name,
            ownerId: actor.id,
            redirectUris: [
              NUTRITION_PLATFORM_REDIRECTS[platform as "chatgpt" | "claude"],
            ],
            scopes,
            authMethod: "client_secret_basic",
            secretHash: hashNutritionToken(secret),
            expiresAt: new Date(Date.now() + CLIENT_SECONDS * 1000),
          },
          select: { id: true, name: true, expiresAt: true },
        });
        await audit(
          tx,
          actor,
          actor.id,
          "MANUAL_CLIENT_CREATE",
          "Tạo cấu hình OAuth thủ công",
          undefined,
          { clientId: client.id, name, platform, scopes },
        );
        return {
          client,
          mcpUrl: getNutritionResourceUrl(),
          authorizationUrl: `${getNutritionPublicUrl()}/api/nutrition/v1/oauth/authorize`,
          tokenUrl: `${getNutritionPublicUrl()}/api/nutrition/v1/oauth/token`,
          authMethod: "client_secret_basic",
        };
      }
      if (action === "manual-revoke") {
        fields(body, ["clientId"]);
        const clientId = text(body.clientId, 128, "Cấu hình");
        const client = await tx.nutritionOAuthClient.findFirst({
          where: { id: clientId, ownerId: actor.id },
        });
        if (!client) fail("Không tìm thấy cấu hình.", 404);
        await tx.nutritionOAuthClient.update({
          where: { id: clientId },
          data: { disabledAt: new Date() },
        });
        await tx.nutritionOAuthCode.deleteMany({ where: { clientId } });
        await tx.nutritionOAuthToken.updateMany({
          where: { clientId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await audit(
          tx,
          actor,
          actor.id,
          "MANUAL_CLIENT_REVOKE",
          "Thu hồi cấu hình OAuth thủ công",
          undefined,
          { clientId },
        );
        return { ok: true };
      }
      return fail("Chức năng không tồn tại.", 404);
    },
    { maxWait: 5000, timeout: 15000 },
  );
  if ("signInAgain" in result) await clearSession();
  return nutritionJson({
    ...result,
    ...(secret ? { clientSecret: secret } : {}),
  });
}

export async function listAccountUsers(request: Request) {
  const actor = await requireSessionUser();
  if (actor.role !== "ADMIN") fail("Bạn không có quyền quản trị.", 403);
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100),
    role = params.get("role"),
    status = params.get("status");
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.get("page") ?? "1", 10) || 1),
  );
  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(role && ACCOUNT_ROLES.some(([v]) => v === role) ? { role } : {}),
    ...(status === "active"
      ? { disabledAt: null }
      : status === "disabled"
        ? { disabledAt: { not: null } }
        : {}),
  };
  const [items, total, active, disabled] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...userSelect,
        _count: {
          select: {
            rations: true,
            patients: true,
            sessions: { where: { expiresAt: { gt: new Date() } } },
            nutritionOAuthTokens: {
              where: {
                rotatedAt: null,
                revokedAt: null,
                refreshExpiresAt: { gt: new Date() },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 20,
      skip: (page - 1) * 20,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { disabledAt: null } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
  ]);
  const selectedId = params.get("selected");
  const activity = selectedId
    ? await prisma.dataChangeLog.findMany({
        where: { entityType: "ACCOUNT", entityId: selectedId.slice(0, 128) },
        select: {
          id: true,
          action: true,
          reason: true,
          actorName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];
  return nutritionJson({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
    active,
    disabled,
    activity,
    requesterId: actor.id,
    csrf: connectionCsrf(actor.id),
  });
}
export async function createAccountUser(request: Request) {
  const { actor, body } = await mutation(request, true);
  fields(body, [
    "displayName",
    "email",
    "password",
    "role",
    "currentPassword",
    "reason",
  ]);
  const displayName = text(body.displayName, 100, "Tên hiển thị"),
    email = normalizeEmail(body.email);
  const role = body.role,
    reason = text(body.reason, 300, "Lý do");
  if (
    !email ||
    !validPassword(body.password) ||
    !ACCOUNT_ROLES.some(([v]) => v === role)
  )
    fail("Kiểm tra email, vai trò và mật khẩu (10–256 ký tự).");
  const item = await prisma.$transaction(async (tx) => {
    await lockUser(tx, actor.id);
    await freshActor(tx, actor, true);
    await passwordCheck(tx, actor.id, body.currentPassword);
    const user = await tx.user.create({
      data: {
        displayName,
        email: email!,
        role: role as string,
        passwordHash: hashPassword(body.password as string),
      },
      select: userSelect,
    });
    await audit(tx, actor, user.id, "USER_CREATE", reason, undefined, {
      displayName,
      email: email!,
      role: role as string,
    });
    return user;
  });
  return nutritionJson({ item }, 201);
}
export async function updateAccountUser(request: Request, id: string) {
  const { actor, body } = await mutation(request, true);
  fields(body, [
    "action",
    "displayName",
    "email",
    "role",
    "password",
    "currentPassword",
    "reason",
  ]);
  const reason = text(body.reason, 300, "Lý do"),
    action = body.action;
  const result = await prisma.$transaction(
    async (tx) => {
      // All admin mutations serialize before user locks: two admins cannot lock each other out by racing.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('account-admin-management', 0))::text`;
      for (const userId of [...new Set([actor.id, id])].sort())
        await lockUser(tx, userId);
      await freshActor(tx, actor, true);
      await passwordCheck(tx, actor.id, body.currentPassword);
      const target = await tx.user.findUnique({ where: { id } });
      if (!target) fail("Không tìm thấy người dùng.", 404);
      const before = {
        displayName: target!.displayName,
        email: target!.email,
        role: target!.role,
        disabled: !!target!.disabledAt,
      };
      if (action === "update") {
        const displayName = text(body.displayName, 100, "Tên hiển thị"),
          email = normalizeEmail(body.email),
          role = body.role;
        if (!email || !ACCOUNT_ROLES.some(([v]) => v === role))
          fail("Email hoặc vai trò không hợp lệ.");
        if (actor.id === id && role !== "ADMIN")
          fail("Không thể tự gỡ quyền quản trị.");
        if (
          target!.role === "ADMIN" &&
          !target!.disabledAt &&
          role !== "ADMIN" &&
          (await tx.user.count({
            where: { role: "ADMIN", disabledAt: null },
          })) <= 1
        )
          fail("Cần giữ ít nhất một quản trị viên đang hoạt động.");
        const item = await tx.user.update({
          where: { id },
          data: { displayName, email: email!, role: role as string },
          select: userSelect,
        });
        if (email !== target!.email || role !== target!.role)
          await revokeAccess(tx, id);
        await audit(tx, actor, id, "USER_UPDATE", reason, before, {
          displayName,
          email: email!,
          role: role as string,
        });
        return {
          item,
          signInAgain: actor.id === id && email !== target!.email,
        };
      }
      if (action === "disable" || action === "enable") {
        if (actor.id === id)
          fail("Không thể tự khóa tài khoản quản trị đang dùng.");
        if (
          action === "disable" &&
          target!.role === "ADMIN" &&
          !target!.disabledAt &&
          (await tx.user.count({
            where: { role: "ADMIN", disabledAt: null },
          })) <= 1
        )
          fail("Cần giữ ít nhất một quản trị viên đang hoạt động.");
        const item = await tx.user.update({
          where: { id },
          data: { disabledAt: action === "disable" ? new Date() : null },
          select: userSelect,
        });
        await revokeAccess(tx, id);
        if (action === "disable")
          await tx.nutritionOAuthClient.updateMany({
            where: { ownerId: id, disabledAt: null },
            data: { disabledAt: new Date() },
          });
        await audit(
          tx,
          actor,
          id,
          action === "disable" ? "USER_DISABLE" : "USER_ENABLE",
          reason,
          before,
          { disabled: action === "disable" },
        );
        return { item };
      }
      if (action === "reset-password") {
        if (!validPassword(body.password))
          fail("Mật khẩu mới cần từ 10 đến 256 ký tự.");
        await tx.user.update({
          where: { id },
          data: { passwordHash: hashPassword(body.password as string) },
        });
        await revokeAccess(tx, id);
        await audit(tx, actor, id, "PASSWORD_RESET", reason);
        return { ok: true, signInAgain: actor.id === id };
      }
      if (action === "revoke-access") {
        await revokeAccess(tx, id);
        await audit(
          tx,
          actor,
          id,
          "SESSIONS_REVOKE",
          `${reason} (thu hồi cả kết nối ứng dụng)`,
        );
        return { ok: true, signInAgain: actor.id === id };
      }
      return fail("Thao tác không hợp lệ.");
    },
    { maxWait: 5000, timeout: 15000 },
  );
  if ("signInAgain" in result && result.signInAgain) await clearSession();
  return nutritionJson(result);
}
