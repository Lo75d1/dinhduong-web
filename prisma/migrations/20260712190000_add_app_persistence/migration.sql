-- Application-owned data only.  Food/Dish source tables are intentionally not
-- referenced or altered by this migration.
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLINICIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rations" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "patientId" TEXT,
    "title" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ration_items" (
    "id" TEXT NOT NULL,
    "rationId" TEXT NOT NULL,
    "foodId" TEXT,
    "meal" TEXT NOT NULL,
    "dish" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "edibleGrams" DOUBLE PRECISION NOT NULL,
    "inputGrams" DOUBLE PRECISION NOT NULL,
    "inputBasis" TEXT NOT NULL,
    "conversionFactor" DOUBLE PRECISION NOT NULL,
    "wastePercent" DOUBLE PRECISION,
    "note" TEXT,
    "nutrientsJson" JSONB NOT NULL,
    "classifyJson" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ration_items_pkey" PRIMARY KEY ("id")
);

-- Người dùng chỉ gửi đề xuất; bảng này không làm thay đổi Food/Dish nguồn.
CREATE TABLE "food_submissions" (
    "id" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "name" TEXT NOT NULL,
    "foodType" TEXT,
    "description" TEXT NOT NULL,
    "sourceNote" TEXT,
    "energyKcal" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "lipidG" DOUBLE PRECISION,
    "glucidG" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "food_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");
CREATE UNIQUE INDEX "app_sessions_tokenHash_key" ON "app_sessions"("tokenHash");
CREATE INDEX "app_sessions_userId_idx" ON "app_sessions"("userId");
CREATE INDEX "app_sessions_expiresAt_idx" ON "app_sessions"("expiresAt");
CREATE INDEX "patients_ownerId_idx" ON "patients"("ownerId");
CREATE INDEX "patients_name_idx" ON "patients"("name");
CREATE INDEX "rations_ownerId_observedAt_idx" ON "rations"("ownerId", "observedAt");
CREATE INDEX "rations_patientId_observedAt_idx" ON "rations"("patientId", "observedAt");
CREATE INDEX "ration_items_rationId_sortOrder_idx" ON "ration_items"("rationId", "sortOrder");
CREATE INDEX "ration_items_foodId_idx" ON "ration_items"("foodId");
CREATE INDEX "food_submissions_submitterId_createdAt_idx" ON "food_submissions"("submitterId", "createdAt");
CREATE INDEX "food_submissions_status_createdAt_idx" ON "food_submissions"("status", "createdAt");

ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rations" ADD CONSTRAINT "rations_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rations" ADD CONSTRAINT "rations_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ration_items" ADD CONSTRAINT "ration_items_rationId_fkey"
  FOREIGN KEY ("rationId") REFERENCES "rations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_submissions" ADD CONSTRAINT "food_submissions_submitterId_fkey"
  FOREIGN KEY ("submitterId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_submissions" ADD CONSTRAINT "food_submissions_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
