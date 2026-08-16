CREATE TABLE "public_meal_reports" (
  "id" TEXT NOT NULL,
  "publicCode" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "reporterName" TEXT NOT NULL,
  "reporterPhone" TEXT,
  "patientRef" TEXT,
  "departmentId" TEXT,
  "departmentName" TEXT NOT NULL,
  "roomBed" TEXT,
  "mealDate" DATE NOT NULL,
  "mealTypeId" TEXT,
  "mealTypeName" TEXT NOT NULL,
  "dietTypeId" TEXT,
  "dietTypeName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "requestType" TEXT NOT NULL DEFAULT 'NEW',
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "reviewedById" TEXT,
  "reviewedByName" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "emailError" TEXT,
  "submittedIpHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "public_meal_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_meal_reports_quantity_check" CHECK ("quantity" BETWEEN 1 AND 1000)
);
CREATE UNIQUE INDEX "public_meal_reports_publicCode_key" ON "public_meal_reports"("publicCode");
CREATE UNIQUE INDEX "public_meal_reports_requestKey_key" ON "public_meal_reports"("requestKey");
CREATE INDEX "public_meal_reports_mealDate_status_idx" ON "public_meal_reports"("mealDate", "status");
CREATE INDEX "public_meal_reports_departmentId_mealDate_idx" ON "public_meal_reports"("departmentId", "mealDate");

ALTER TABLE "departments" ADD COLUMN "publicToken" TEXT;
UPDATE "departments" SET "publicToken" = replace(gen_random_uuid()::text, '-', '') WHERE "publicToken" IS NULL;
CREATE UNIQUE INDEX "departments_publicToken_key" ON "departments"("publicToken");
