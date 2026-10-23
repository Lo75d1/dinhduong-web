import { dailyCatalogQuery } from "@/lib/menu-library/daily-catalog-query";
import { prisma } from "@/lib/prisma";
import { requestMenuActor } from "@/lib/menu-library/store";
import { libraryError, libraryJson } from "@/lib/menu-library/http";
import { menuInputError } from "@/lib/menu-library/validation";
import { EMPTY_DAILY_FILTERS, validDailyFilters, type DailyCatalog, type DailyFilters } from "@/lib/menu-library/daily-catalog";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requestMenuActor(request);
    const url = new URL(request.url), offset = Number(url.searchParams.get("offset") ?? 0);
    const filters = Object.fromEntries(Object.entries(EMPTY_DAILY_FILTERS).map(([key, fallback]) => [key, (url.searchParams.get(key) ?? fallback).trim()])) as DailyFilters;
    if (!validDailyFilters(filters, offset)) menuInputError("Bộ lọc không hợp lệ.", "query");
    const [result] = await prisma.$queryRaw<Omit<DailyCatalog, "nextOffset">[]>(dailyCatalogQuery(filters, offset));
    return libraryJson({ ...result, nextOffset: offset + result.items.length < result.total ? offset + result.items.length : null });
  } catch (error) { return libraryError(error); }
}
