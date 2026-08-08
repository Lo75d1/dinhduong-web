import { getKnowledgeItems, type KnowledgeKind } from "@/lib/knowledge-hub";

const VALID_KINDS = new Set<KnowledgeKind | "all">([
  "all",
  "legal",
  "guideline",
  "research",
  "official-news",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").slice(0, 120);
  const rawKind = url.searchParams.get("type") || "all";
  const kind = VALID_KINDS.has(rawKind as KnowledgeKind | "all")
    ? (rawKind as KnowledgeKind | "all")
    : "all";
  const items = await getKnowledgeItems({ query, kind });
  return Response.json(
    {
      query,
      kind,
      count: items.length,
      updatedAt: new Date().toISOString(),
      items: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        publishedAt: item.publishedAt,
        authors: item.authors,
        summary: item.summary,
        topics: item.topics,
        doi: item.doi,
        openAccess: item.openAccess,
        summaryMode: item.summaryMode,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
