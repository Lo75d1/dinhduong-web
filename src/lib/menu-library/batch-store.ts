import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { lockActor, checkCatalogIds, contentHash, type MenuActor } from "./store";
import { parseBatchRequest, batchReferences, applyBatchOperation } from "./batch";
import type { MenuLibraryDraft } from "./contracts";
import type { BatchResult } from "./manager-contracts";
import { menuInputError } from "./validation";
export async function batchMenuTemplates(actor: MenuActor, value: unknown): Promise<BatchResult> {
  const op = parseBatchRequest(value),
    refs = batchReferences(op),
    hash = contentHash(op);
  return prisma.$transaction(async tx => {
    await lockActor(tx, actor);
    const entityId = `${actor.userId}:${op.requestKey}`;
    const previous = await tx.dataChangeLog.findFirst({
      where: {
        entityType: "MENU_LIBRARY_BATCH",
        entityId,
        actorId: actor.userId
      }
    });
    if (previous) {
      if ((previous.beforeJson as {
        hash?: string;
      } | null)?.hash !== hash) menuInputError("Mã thao tác đã dùng cho nội dung khác.", "requestKey", 409);
      return {
        ...(previous.afterJson as unknown as BatchResult),
        replayed: true
      };
    }
    for (const ref of refs) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"menu-template:" + ref.id},0))::text`;
    const rows = await tx.menuLibraryTemplate.findMany({
      where: {
        id: {
          in: refs.map(ref => ref.id)
        }
      }
    });
    for (const ref of refs) {
      const row = rows.find(row => row.id === ref.id);
      if (!row || row.revision !== ref.revision) menuInputError("Một thực đơn đã đổi phiên bản hoặc không tồn tại. Tải lại; chưa thực đơn nào bị thay đổi.", "revision", 409);
      const document = row.document as unknown as MenuLibraryDraft;
      if (document.id !== row.id || document.version !== row.revision) menuInputError("Nội dung và phiên bản thực đơn chưa khớp. Đọc lại trước khi thao tác.", "revision", 409);
    }
    const originals = new Map(rows.map(row => [row.id, row.document as unknown as MenuLibraryDraft]));
    const changed = applyBatchOperation(originals, op, () => `manual-${randomUUID()}`);
    for (const [id, draft] of changed) {
      await checkCatalogIds(tx, draft);
      const row = rows.find(row => row.id === id)!;
      const saved = await tx.menuLibraryTemplate.updateMany({
        where: {
          id,
          revision: row.revision
        },
        data: {
          revision: draft.version,
          title: draft.title,
          direction: draft.direction,
          updatedAt: new Date(),
          document: draft as unknown as Prisma.InputJsonValue,
          contentHash: contentHash(draft)
        }
      });
      if (saved.count !== 1) menuInputError("Thực đơn vừa thay đổi. Tải lại trước khi thao tác.", "revision", 409);
      await tx.menuLibraryVersion.create({
        data: {
          templateId: id,
          revision: draft.version,
          document: draft as unknown as Prisma.InputJsonValue,
          actorId: actor.userId,
          clientId: actor.clientId,
          reason: op.reason.trim()
        }
      });
    }
    const result: BatchResult = {
      items: [...changed.values()].map(draft => ({
        id: draft.id,
        revision: draft.version
      }))
    };
    await tx.dataChangeLog.create({
      data: {
        entityType: "MENU_LIBRARY_BATCH",
        entityId,
        action: op.action.toUpperCase(),
        actorId: actor.userId,
        actorName: actor.userId,
        beforeJson: {
          hash
        },
        afterJson: result as unknown as Prisma.InputJsonValue,
        reason: op.reason.trim()
      }
    });
    return result;
  }, {
    maxWait: 5000,
    timeout: 20000
  });
}
