import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  CLASSIFICATION_VERSION,
  MAX_BATCH_ENTRIES,
  type CatalogBatch,
  type CatalogEntry,
  type CatalogFood,
  type CatalogKey,
} from "./contracts";
import {
  canPublish,
  catalogTransaction,
  keyHash,
  requirePublisher,
  type CatalogActor,
} from "./auth";
import { fail, id, object, proposals, revision, stable, text } from "./policy";
import { normalizeVi } from "@/lib/normalize";
type Tx = Prisma.TransactionClient;
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));
async function audit(
  tx: Tx,
  actor: CatalogActor,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
  reason: string,
) {
  await tx.$queryRaw`INSERT INTO data_change_logs (id,"entityType","entityId",action,"actorId","actorName","beforeJson","afterJson",reason)
    VALUES (${randomUUID()},${entityType},${entityId},${action},${actor.id},${actor.displayName},${JSON.stringify(before)}::jsonb,${JSON.stringify(after)}::jsonb,${reason}) RETURNING id`;
}
async function foodSnapshot(
  tx: Tx,
  foodId: string,
  lock = false,
): Promise<CatalogFood> {
  if (lock)
    await tx.$queryRaw`SELECT id FROM foods WHERE id = ${foodId} FOR UPDATE`;
  const rows = await tx.$queryRaw<
    CatalogFood[]
  >`SELECT f.id, f.name, f.source, f."sourceCode", f.unit, f."updatedAt", f."foodType", f."foodGroup", f."proteinOrigin",
    f."imageUrl", f."imageSourceUrl", f."imageCredit", f."imageLicense",
    COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM food_prices p WHERE p."foodId" = f.id),'[]'::jsonb) AS prices FROM foods f WHERE f.id = ${foodId}`;
  if (!rows[0]) fail("Không tìm thấy thực phẩm.", 404);
  return json(rows[0]);
}
async function getBatch(
  tx: Tx,
  actor: CatalogActor,
  batchId: string,
  lock = false,
): Promise<CatalogBatch> {
  const rows = lock
    ? await tx.$queryRaw<
        CatalogBatch[]
      >`SELECT * FROM catalog_draft_batches WHERE id = ${batchId} FOR UPDATE`
    : await tx.$queryRaw<
        CatalogBatch[]
      >`SELECT * FROM catalog_draft_batches WHERE id = ${batchId}`;
  const b = rows[0];
  if (!b || (actor.keyId && b.keyId !== actor.keyId))
    fail("Không tìm thấy đợt dữ liệu bạn có quyền mở.", 404);
  return json(b);
}
function editable(batch: CatalogBatch, expected: unknown) {
  if (batch.revision !== revision(expected))
    fail("Bản nháp đã thay đổi. Tải lại trước khi sửa hoặc duyệt.", 409);
  if (batch.state !== "DRAFT" && batch.state !== "RETURNED")
    fail(
      "Đợt đã gửi duyệt hoặc đã áp dụng; bản này đang được giữ nguyên.",
      409,
    );
}
export async function listCatalogFoods(
  actor: CatalogActor,
  params: URLSearchParams,
) {
  return catalogTransaction(actor, async (tx) => {
    const q = normalizeVi((params.get("q") ?? "").slice(0, 100));
    const after = params.get("after") || "";
    if (after) id(after);
    const missing = params.get("missing") ?? "";
    if (!["", "classification", "image", "price"].includes(missing))
      fail("Bộ lọc chưa hợp lệ.");
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT f.id FROM foods f WHERE f.id > ${after} AND (${q} = '' OR strpos(f."nameNormalized", ${q}) > 0)
      AND (${missing} = '' OR ${missing} = 'classification' AND (COALESCE(f."foodGroup",'') = '' OR COALESCE(f."foodType",'') = '' OR COALESCE(f."proteinOrigin",'') = '')
        OR ${missing} = 'image' AND COALESCE(f."imageUrl",'') = '' OR ${missing} = 'price' AND NOT EXISTS (SELECT 1 FROM food_prices p WHERE p."foodId" = f.id)) ORDER BY f.id LIMIT 26`;
    const selected = rows.slice(0, 25),
      items: CatalogFood[] = [];
    for (const row of selected) items.push(await foodSnapshot(tx, row.id));
    return { items, nextCursor: rows.length > 25 ? selected.at(-1)!.id : null };
  });
}
export { listCatalogBatches } from "./queue";
export async function readCatalogBatch(actor: CatalogActor, batchId: string) {
  return catalogTransaction(actor, async (tx, current) => {
    const batch = await getBatch(tx, current, id(batchId));
    const history = await tx.$queryRaw<
      Array<{
        id: string;
        action: string;
        actorName: string;
        reason: string;
        createdAt: string;
      }>
    >`SELECT id,action,"actorName",reason,"createdAt" FROM data_change_logs WHERE "entityType" = 'CATALOG_BATCH' AND "entityId" = ${batch.id} ORDER BY "createdAt" DESC LIMIT 100`;
    return { batch, history: json(history), canPublish: canPublish(current) };
  });
}
export async function createCatalogBatch(actor: CatalogActor, raw: unknown) {
  const v = object(raw, ["title", "requestKey"], ["title", "requestKey"]),
    title = text(v.title, "Tên đợt", 160),
    requestKey = id(v.requestKey);
  return catalogTransaction(actor, async (tx, current) => {
    // Serialize idempotency and the per-principal open-draft quota across workers.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"catalog-create:" + actor.principal},0))::text`;
    const found = await tx.$queryRaw<
      CatalogBatch[]
    >`SELECT * FROM catalog_draft_batches WHERE principal = ${actor.principal} AND "requestKey" = ${requestKey}`;
    if (found[0]) {
      if (found[0].title !== title)
        fail("requestKey đã dùng với tên đợt khác.", 409);
      return json(found[0]);
    }
    const counts = await tx.$queryRaw<
      Array<{ n: number }>
    >`SELECT count(*)::int AS n FROM catalog_draft_batches WHERE principal = ${actor.principal} AND state NOT IN ('PUBLISHED','ARCHIVED')`;
    if (counts[0].n >= 30)
      fail("Đang có 30 đợt chưa chốt; hoàn tất các đợt hiện có trước.", 409);
    const rows = await tx.$queryRaw<
      CatalogBatch[]
    >`INSERT INTO catalog_draft_batches (id,"ownerId","keyId",principal,"requestKey",title) VALUES (${randomUUID()},${actor.id},${actor.keyId},${actor.principal},${requestKey},${title}) RETURNING *`;
    await audit(
      tx,
      current,
      "CATALOG_BATCH",
      rows[0].id,
      "DRAFT_CREATE",
      null,
      { title },
      "Tạo đợt bổ sung dữ liệu; chưa áp dụng kho chính.",
    );
    return json(rows[0]);
  });
}
export async function saveCatalogBatch(
  actor: CatalogActor,
  batchId: string,
  raw: unknown,
) {
  const v = object(
      raw,
      ["expectedRevision", "title", "entries"],
      ["expectedRevision", "title", "entries"],
    ),
    wanted = proposals(v.entries),
    title = text(v.title, "Tên đợt", 160);
  return catalogTransaction(actor, async (tx, current) => {
    const batch = await getBatch(tx, current, id(batchId), true);
    editable(batch, v.expectedRevision);
    const entries: CatalogEntry[] = [];
    // No canonical writes here. Server captures the actual old values, never client-provided snapshots.
    for (const proposal of wanted) {
      const before = await foodSnapshot(tx, proposal.foodId);
      if (before.updatedAt !== proposal.expectedUpdatedAt)
        fail(
          `Dữ liệu ${before.name} đã thay đổi; tìm lại và kiểm tra đề xuất.`,
          409,
        );
      if (
        proposal.prices?.some(
          (p) => p.id && !before.prices.some((old) => old.id === p.id),
        )
      )
        fail("Dòng giá không thuộc thực phẩm đang sửa.");
      entries.push({
        proposal,
        before,
        classificationVersion: CLASSIFICATION_VERSION,
      });
    }
    const rows = await tx.$queryRaw<
      CatalogBatch[]
    >`UPDATE catalog_draft_batches SET title = ${title}, "entriesJson" = ${JSON.stringify(entries)}::jsonb, state = 'DRAFT', revision = revision + 1, "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${batch.id} RETURNING *`;
    await audit(
      tx,
      current,
      "CATALOG_BATCH",
      batch.id,
      "DRAFT_EDIT",
      { revision: batch.revision, entries: batch.entriesJson },
      { revision: rows[0].revision, entries },
      "Lưu đề xuất; kho chính giữ nguyên.",
    );
    return json(rows[0]);
  });
}
export async function catalogBatchAction(
  actor: CatalogActor,
  batchId: string,
  action: string,
  raw: unknown,
) {
  const v = object(
    raw,
    ["expectedRevision", "reviewNote", "confirmation"],
    ["expectedRevision"],
  );
  if (!["submit", "return", "rebase", "publish", "archive"].includes(action))
    fail("Thao tác không được hỗ trợ.", 404);
  return catalogTransaction(actor, async (tx, current) => {
    const batch = await getBatch(tx, current, id(batchId), true);
    if (batch.revision !== revision(v.expectedRevision))
      fail("Bản nháp đã thay đổi; tải lại để xem đúng phiên bản.", 409);
    if (action === "archive") {
      editable(batch, v.expectedRevision);
      const rows = await tx.$queryRaw<
        CatalogBatch[]
      >`UPDATE catalog_draft_batches SET state = 'ARCHIVED', revision = revision + 1, "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${batch.id} RETURNING *`;
      await audit(
        tx,
        current,
        "CATALOG_BATCH",
        batch.id,
        "ARCHIVE",
        { revision: batch.revision },
        { revision: rows[0].revision },
        "Đóng bản nháp chưa dùng; giữ toàn bộ nội dung và lịch sử, kho chính không đổi.",
      );
      return json(rows[0]);
    }
    if (action === "submit") {
      editable(batch, v.expectedRevision);
      if (!batch.entriesJson.length)
        fail("Thêm ít nhất một đề xuất trước khi gửi duyệt.");
      const rows = await tx.$queryRaw<
        CatalogBatch[]
      >`UPDATE catalog_draft_batches SET state = 'SUBMITTED', revision = revision + 1,"reviewNote" = NULL,"updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${batch.id} RETURNING *`;
      await audit(
        tx,
        current,
        "CATALOG_BATCH",
        batch.id,
        "SUBMIT",
        { revision: batch.revision },
        { revision: rows[0].revision, count: batch.entriesJson.length },
        "Gửi duyệt; chưa cập nhật kho chính.",
      );
      return json(rows[0]);
    }
    if (action === "rebase") {
      editable(batch, v.expectedRevision);
      const entries: CatalogEntry[] = [];
      for (const entry of batch.entriesJson) {
        const before = await foodSnapshot(tx, entry.proposal.foodId);
        if (
          entry.proposal.prices?.some(
            (p) => p.id && !before.prices.some((old) => old.id === p.id),
          )
        )
          fail("Một dòng giá nguồn đã mất; sửa đề xuất trước.", 409);
        entries.push({
          ...entry,
          before,
          proposal: { ...entry.proposal, expectedUpdatedAt: before.updatedAt },
        });
      }
      const rows = await tx.$queryRaw<
        CatalogBatch[]
      >`UPDATE catalog_draft_batches SET "entriesJson" = ${JSON.stringify(entries)}::jsonb, state = 'DRAFT', revision = revision + 1,"updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${batch.id} RETURNING *`;
      await audit(
        tx,
        current,
        "CATALOG_BATCH",
        batch.id,
        "REBASE",
        { entries: batch.entriesJson },
        { entries },
        "Đọc lại kho gốc; cần kiểm tra và gửi duyệt lại.",
      );
      return json(rows[0]);
    }
    requirePublisher(current);
    if (batch.state !== "SUBMITTED")
      fail("Chỉ duyệt đợt đã gửi và đang chờ duyệt.", 409);
    const note = text(v.reviewNote, "Ghi chú duyệt", 1500);
    if (action === "return") {
      const rows = await tx.$queryRaw<
        CatalogBatch[]
      >`UPDATE catalog_draft_batches SET state = 'RETURNED',"reviewNote" = ${note},revision = revision + 1,"updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${batch.id} RETURNING *`;
      await audit(
        tx,
        current,
        "CATALOG_BATCH",
        batch.id,
        "RETURN",
        { revision: batch.revision },
        { revision: rows[0].revision },
        note,
      );
      return json(rows[0]);
    }
    if (v.confirmation !== "APPLY_REVIEWED_BATCH")
      fail("Cần xác nhận áp dụng đúng bản đã xem.");
    if (
      !batch.entriesJson.length ||
      batch.entriesJson.length > MAX_BATCH_ENTRIES
    )
      fail("Đợt dữ liệu chưa hợp lệ.");
    // Revalidate stored proposals before writing; sort locks to avoid cross-batch deadlocks.
    const wanted = proposals(batch.entriesJson.map((e) => e.proposal));
    for (const proposal of [...wanted].sort((a, b) =>
      a.foodId.localeCompare(b.foodId),
    )) {
      const entry = batch.entriesJson.find(
        (e) => e.proposal.foodId === proposal.foodId,
      )!;
      const before = await foodSnapshot(tx, proposal.foodId, true);
      // Lock price rows too. Portal writes always lock Food first; old write routes are retired.
      await tx.$queryRaw`SELECT id FROM food_prices WHERE "foodId" = ${proposal.foodId} FOR UPDATE`;
      if (stable(before) !== stable(entry.before))
        fail(
          `${before.name} đã thay đổi từ lúc soạn; trả lại và đọc lại kho gốc trước khi duyệt.`,
          409,
        );
      const c = proposal.classification,
        image = proposal.image;
      await tx.$queryRaw`UPDATE foods SET "foodType" = COALESCE(${c?.foodType ?? null},"foodType"), "foodGroup" = COALESCE(${c?.foodGroup ?? null},"foodGroup"), "proteinOrigin" = COALESCE(${c?.proteinOrigin ?? null},"proteinOrigin"),
        "imageUrl" = COALESCE(${image?.url ?? null},"imageUrl"), "imageSourceUrl" = COALESCE(${image?.sourceUrl ?? null},"imageSourceUrl"), "imageCredit" = COALESCE(${image?.credit ?? null},"imageCredit"), "imageLicense" = COALESCE(${image?.license ?? null},"imageLicense"),"updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${proposal.foodId} RETURNING id`;
      for (const p of proposal.prices ?? []) {
        if (p.id) {
          const rows = await tx.$queryRaw<
            Array<{ id: string }>
          >`UPDATE food_prices SET region = ${p.region},"amountVnd" = ${p.amountVnd},basis = ${p.basis},"packG" = ${p.packG},source = ${p.source},"sourceUrl" = ${p.sourceUrl},note = ${p.note},"asOfDate" = ${new Date(p.asOfDate + "T00:00:00.000Z")},"updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${p.id} AND "foodId" = ${proposal.foodId} RETURNING id`;
          if (!rows[0])
            fail("Dòng giá không còn thuộc thực phẩm; chưa áp dụng đợt.", 409);
        } else
          await tx.$queryRaw`INSERT INTO food_prices (id,"foodId",region,"amountVnd",basis,"packG",source,"sourceUrl",note,"asOfDate","updatedAt") VALUES (${randomUUID()},${proposal.foodId},${p.region},${p.amountVnd},${p.basis},${p.packG},${p.source},${p.sourceUrl},${p.note},${new Date(p.asOfDate + "T00:00:00.000Z")},(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) RETURNING id`;
      }
      const after = await foodSnapshot(tx, proposal.foodId);
      await audit(
        tx,
        current,
        "FOOD",
        proposal.foodId,
        "CATALOG_PUBLISH",
        before,
        {
          ...after,
          batchId: batch.id,
          evidence: proposal,
          classificationVersion: CLASSIFICATION_VERSION,
        },
        proposal.reason,
      );
    }
    const rows = await tx.$queryRaw<
      CatalogBatch[]
    >`UPDATE catalog_draft_batches SET state = 'PUBLISHED',"reviewNote" = ${note},"publishedBy" = ${current.id},"publishedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),revision = revision + 1,"updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE id = ${batch.id} RETURNING *`;
    await audit(
      tx,
      current,
      "CATALOG_BATCH",
      batch.id,
      "PUBLISH",
      { revision: batch.revision },
      { revision: rows[0].revision, count: wanted.length },
      note,
    );
    return json(rows[0]);
  });
}
export async function catalogKeys(
  actor: CatalogActor,
  action = "list",
  raw?: unknown,
) {
  return catalogTransaction(actor, async (tx, current) => {
    requirePublisher(current);
    if (action === "list")
      return json(
        await tx.$queryRaw<
          CatalogKey[]
        >`SELECT id,"ownerId",label,"expiresAt","revokedAt","createdAt" FROM catalog_editor_keys WHERE "ownerId" = ${current.id} ORDER BY "createdAt" DESC LIMIT 100`,
      );
    if (action === "revoke") {
      const v = object(raw, ["id"], ["id"]),
        keyId = id(v.id);
      const rows = await tx.$queryRaw<
        CatalogKey[]
      >`UPDATE catalog_editor_keys SET "revokedAt" = COALESCE("revokedAt", (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) WHERE id = ${keyId} AND "ownerId" = ${current.id} RETURNING id,"ownerId",label,"expiresAt","revokedAt","createdAt"`;
      if (!rows[0]) fail("Không tìm thấy khóa của bạn.", 404);
      await audit(
        tx,
        current,
        "CATALOG_KEY",
        keyId,
        "REVOKE",
        null,
        { label: rows[0].label },
        "Thu hồi khóa biên tập.",
      );
      return json(rows[0]);
    }
    if (action !== "create") fail("Thao tác khóa không được hỗ trợ.", 404);
    const v = object(raw, ["label", "validDays"], ["label", "validDays"]),
      label = text(v.label, "Tên khóa", 100);
    if (
      !Number.isInteger(v.validDays) ||
      (v.validDays as number) < 1 ||
      (v.validDays as number) > 30
    )
      fail("Khóa có thời hạn từ 1 đến 30 ngày.");
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"catalog-key-create:" + current.id},0))::text`;
    const counts = await tx.$queryRaw<
      Array<{ n: number }>
    >`SELECT count(*)::int AS n FROM catalog_editor_keys WHERE "ownerId" = ${current.id} AND "revokedAt" IS NULL AND "expiresAt" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`;
    if (counts[0].n >= 10)
      fail("Tối đa 10 khóa đang hoạt động; thu hồi khóa cũ trước.", 409);
    const token = `ce1_${randomBytes(32).toString("base64url")}`,
      expiresAt = new Date(Date.now() + (v.validDays as number) * 86400000),
      keyId = randomUUID();
    const rows = await tx.$queryRaw<
      CatalogKey[]
    >`INSERT INTO catalog_editor_keys (id,"ownerId",label,"tokenHash","expiresAt") VALUES (${keyId},${current.id},${label},${keyHash(token)},${expiresAt}) RETURNING id,"ownerId",label,"expiresAt","revokedAt","createdAt"`;
    await audit(
      tx,
      current,
      "CATALOG_KEY",
      keyId,
      "CREATE",
      null,
      { label, expiresAt },
      "Khóa chỉ tra kho và soạn/gửi bản nháp; không duyệt, xóa hoặc sửa dinh dưỡng.",
    );
    return { key: json(rows[0]), token };
  });
}
