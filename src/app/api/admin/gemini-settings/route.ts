import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultSiteSettings } from "@/lib/site-settings";
import { encryptGeminiKey, isAllowedModel } from "@/lib/gemini-settings";
import { logAppError } from "@/lib/app-error-log";

async function requireAdmin() { const user = await requireSessionUser(); if (user.role !== "ADMIN") throw new Error("FORBIDDEN"); return user; }
const safe = (value: { geminiEnabled: boolean; geminiModel: string | null; geminiKeyEncrypted: string | null }) => ({ enabled: value.geminiEnabled, model: value.geminiModel || "gemini-2.5-flash", configured: Boolean(value.geminiKeyEncrypted) });

export async function GET() {
  try { await requireAdmin(); const settings = await prisma.siteSetting.findUnique({ where: { id: "public" }, select: { geminiEnabled: true, geminiModel: true, geminiKeyEncrypted: true } }); return Response.json(settings ? safe(settings) : { enabled: false, model: "gemini-2.5-flash", configured: false }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse(); return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 }); }
}

export async function PATCH(request: Request) {
  let actor: { id: string; email: string } | undefined;
  try {
    actor = await requireAdmin();
    const body = await request.json().catch(() => null) as { enabled?: unknown; model?: unknown; apiKey?: unknown; clearKey?: unknown } | null;
    const model = isAllowedModel(body?.model) ? body!.model : "gemini-2.5-flash";
    const rawKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
    if (rawKey && !/^AIza[\w-]{20,}$/.test(rawKey)) return Response.json({ error: "API key Gemini chưa đúng định dạng." }, { status: 400 });
    const update: { geminiEnabled: boolean; geminiModel: string; geminiKeyEncrypted?: string | null } = { geminiEnabled: body?.enabled === true, geminiModel: model };
    if (rawKey) update.geminiKeyEncrypted = encryptGeminiKey(rawKey);
    if (body?.clearKey === true) update.geminiKeyEncrypted = null;
    const settings = await prisma.siteSetting.upsert({ where: { id: "public" }, create: { id: "public", ...defaultSiteSettings, ...update }, update });
    return Response.json(safe(settings));
  } catch (error) {
    await logAppError("admin/gemini-settings PATCH", error, actor);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    if (error instanceof Error && error.message === "APP_SECRET_MISSING") return Response.json({ error: "VPS chưa có APP_SECRET đủ mạnh; không thể lưu key an toàn." }, { status: 503 });
    return Response.json({ error: "Chưa thể lưu cấu hình Gemini." }, { status: 503 });
  }
}
