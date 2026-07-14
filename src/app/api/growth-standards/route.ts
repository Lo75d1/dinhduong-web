import { NextRequest } from "next/server";
import { WHO_GROWTH_ENTRIES } from "@/lib/who-growth";

export async function GET(request: NextRequest) {
  const gender = request.nextUrl.searchParams.get("gender") ?? "";
  if (gender !== "Nam" && gender !== "Nu") return Response.json({ items: [] });
  return Response.json({ items: WHO_GROWTH_ENTRIES.filter((entry) => entry.sex === gender) }, { headers: { "cache-control": "public, max-age=86400" } });
}
