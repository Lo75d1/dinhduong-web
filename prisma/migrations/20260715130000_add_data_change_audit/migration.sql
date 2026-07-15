-- Audit trail for admin/editor changes only. No Food/Dish records are modified by this migration.
CREATE TABLE "data_change_logs" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_change_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_change_logs_entityType_entityId_createdAt_idx" ON "data_change_logs"("entityType", "entityId", "createdAt");
CREATE INDEX "data_change_logs_actorId_createdAt_idx" ON "data_change_logs"("actorId", "createdAt");
