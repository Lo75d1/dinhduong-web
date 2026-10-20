import "server-only";
import { catalogTransaction, type CatalogActor } from "./auth";
import {
  QUEUE_LABELS,
  type CatalogBatchSummary,
  type CatalogQueuePage,
} from "./contracts";
import { fail, id, object } from "./policy";
const rank = (state: string) =>
  state === "SUBMITTED" ? 0 : state === "DRAFT" || state === "RETURNED" ? 1 : 2;
export async function listCatalogBatches(
  actor: CatalogActor,
  params = new URLSearchParams(),
): Promise<CatalogQueuePage> {
  const filter = params.get("state") || "ALL",
    q = (params.get("q") || "").trim().slice(0, 100);
  if (!Object.hasOwn(QUEUE_LABELS, filter))
    fail("Bộ lọc đợt dữ liệu chưa hợp lệ.");
  let after = { group: -1, at: "2999-01-01T00:00:00.000Z", id: "", filter, q };
  const encoded = params.get("after");
  if (encoded) {
    if (encoded.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(encoded))
      fail("Mốc trang chưa hợp lệ.");
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    } catch {
      return fail("Mốc trang chưa hợp lệ.");
    }
    const v = object(
      raw,
      ["group", "at", "id", "filter", "q"],
      ["group", "at", "id", "filter", "q"],
    );
    if (
      ![0, 1, 2].includes(v.group as number) ||
      typeof v.at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.at) ||
      !Number.isFinite(Date.parse(v.at)) ||
      v.filter !== filter ||
      v.q !== q
    )
      fail("Bộ lọc đã đổi; tải lại từ trang đầu.");
    after = { group: v.group as number, at: v.at, id: id(v.id), filter, q };
  }
  return catalogTransaction(actor, async (tx, current) => {
    const all = !current.keyId,
      keyId = current.keyId;
    const totals = await tx.$queryRaw<
      Array<{ state: CatalogBatchSummary["state"]; n: number }>
    >`SELECT state,count(*)::int AS n FROM catalog_draft_batches WHERE (${all} OR "keyId" = ${keyId}) AND (${q} = '' OR strpos(lower(title),lower(${q})) > 0) GROUP BY state`;
    const counts: CatalogQueuePage["counts"] = {
      ALL: 0,
      OPEN: 0,
      SUBMITTED: 0,
      DRAFT: 0,
      RETURNED: 0,
      PUBLISHED: 0,
      ARCHIVED: 0,
    };
    for (const row of totals) {
      counts[row.state] = row.n;
      counts.ALL += row.n;
    }
    counts.OPEN = counts.SUBMITTED + counts.DRAFT + counts.RETURNED;
    const rows = await tx.$queryRaw<CatalogBatchSummary[]>`WITH visible AS (
      SELECT id,"ownerId","keyId",principal,title,state,revision,"reviewNote","publishedBy","publishedAt","createdAt","updatedAt",jsonb_array_length("entriesJson") AS "entryCount",
        CASE WHEN state = 'SUBMITTED' THEN 0 WHEN state IN ('DRAFT','RETURNED') THEN 1 ELSE 2 END AS "queueRank"
      FROM catalog_draft_batches WHERE (${all} OR "keyId" = ${keyId}) AND (${q} = '' OR strpos(lower(title),lower(${q})) > 0)
    ) SELECT id,"ownerId","keyId",principal,title,state,revision,"reviewNote","publishedBy","publishedAt","createdAt","updatedAt","entryCount" FROM visible
      WHERE (${filter} = 'ALL' OR state = ${filter} OR ${filter} = 'OPEN' AND state IN ('DRAFT','SUBMITTED','RETURNED'))
      AND ("queueRank" > ${after.group} OR "queueRank" = ${after.group} AND ("updatedAt" < ${new Date(after.at)} OR "updatedAt" = ${new Date(after.at)} AND id < ${after.id}))
      ORDER BY "queueRank", "updatedAt" DESC, id DESC LIMIT 26`;
    const items = JSON.parse(
      JSON.stringify(rows.slice(0, 25)),
    ) as CatalogBatchSummary[];
    const last = items.at(-1);
    return {
      items,
      counts,
      nextCursor:
        rows.length > 25 && last
          ? Buffer.from(
              JSON.stringify({
                group: rank(last.state),
                at: last.updatedAt,
                id: last.id,
                filter,
                q,
              }),
            ).toString("base64url")
          : null,
    };
  });
}
