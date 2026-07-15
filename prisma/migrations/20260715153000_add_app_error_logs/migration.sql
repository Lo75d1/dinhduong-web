-- Operational error log for administrators only. No Food/Dish/source data is modified.
CREATE TABLE "app_error_logs" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actorId" TEXT,
  "actorEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_error_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "app_error_logs_createdAt_idx" ON "app_error_logs"("createdAt");
CREATE INDEX "app_error_logs_source_createdAt_idx" ON "app_error_logs"("source", "createdAt");
