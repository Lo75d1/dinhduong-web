import { NextRequest } from "next/server";
import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CSV_COLS = [
  "id", "createdAt", "role", "useFreq",
  "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10",
  "susScore", "comment",
] as const;

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });

    const items = await prisma.susResponse.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });

    if (request.nextUrl.searchParams.get("format") === "csv") {
      const header = CSV_COLS.join(",");
      const lines = items.map((it) =>
        CSV_COLS.map((k) => csvCell((it as Record<string, unknown>)[k])).join(",")
      );
      const csv = "﻿" + [header, ...lines].join("\r\n");
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="sus_responses.csv"',
        },
      });
    }

    const n = items.length;
    const mean = n ? Math.round((items.reduce((s, it) => s + it.susScore, 0) / n) * 10) / 10 : null;
    return Response.json({ items, summary: { count: n, meanScore: mean } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Chưa thể tải khảo sát." }, { status: 503 });
  }
}
