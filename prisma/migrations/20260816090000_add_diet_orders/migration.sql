CREATE TABLE "diet_orders" (
  "id" TEXT NOT NULL,
  "patientCode" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "room" TEXT,
  "dietTypeId" TEXT NOT NULL,
  "effectiveDate" DATE NOT NULL,
  "endDate" DATE,
  "clinicalNote" TEXT,
  "critical" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "prescribedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "diet_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "diet_orders_date_check" CHECK ("endDate" IS NULL OR "endDate" >= "effectiveDate"),
  CONSTRAINT "diet_orders_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "diet_orders_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "kitchen_diet_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "diet_orders_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "diet_orders_departmentId_effectiveDate_endDate_status_idx" ON "diet_orders"("departmentId", "effectiveDate", "endDate", "status");
CREATE INDEX "diet_orders_patientCode_status_idx" ON "diet_orders"("patientCode", "status");
CREATE UNIQUE INDEX "diet_orders_one_active_patient_key" ON "diet_orders"("patientCode") WHERE "status" = 'ACTIVE';
CREATE INDEX "diet_orders_dietTypeId_effectiveDate_endDate_status_idx" ON "diet_orders"("dietTypeId", "effectiveDate", "endDate", "status");
