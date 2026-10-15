import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
export async function GET(request: NextRequest) { try { await requireDataEditor(); const id = request.nextUrl.searchParams.get("entityId"); const items = await prisma.dataChangeLog.findMany({ where: { entityType: { not: "ACCOUNT" }, ...(id ? { entityId: id } : {}) }, orderBy: { createdAt: "desc" }, take: 100 }); return Response.json({ items }); } catch (e) { if (e instanceof Error && e.message === "UNAUTHORIZED") return unauthorizedResponse(); return Response.json({ error: "Không có quyền xem lịch sử." }, { status: 403 }); } }
