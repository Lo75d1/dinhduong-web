-- Additive metadata + private drafts. This migration does not update any Food/Dish values.
BEGIN;
ALTER TABLE "foods" ADD COLUMN "imageCredit" TEXT, ADD COLUMN "imageLicense" TEXT;
CREATE TABLE "catalog_editor_keys" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "label" TEXT NOT NULL, "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "catalog_editor_keys_ownerId_createdAt_idx" ON "catalog_editor_keys"("ownerId", "createdAt");
CREATE TABLE "catalog_draft_batches" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "keyId" TEXT REFERENCES "catalog_editor_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "principal" TEXT NOT NULL, "requestKey" TEXT NOT NULL, "title" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("state" IN ('DRAFT', 'SUBMITTED', 'RETURNED', 'PUBLISHED', 'ARCHIVED')),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0), "entriesJson" JSONB NOT NULL DEFAULT '[]',
  "reviewNote" TEXT, "publishedBy" TEXT, "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_draft_batches_principal_requestKey_key" UNIQUE ("principal", "requestKey")
);
CREATE INDEX "catalog_draft_batches_ownerId_updatedAt_idx" ON "catalog_draft_batches"("ownerId", "updatedAt");
CREATE INDEX "catalog_draft_batches_state_updatedAt_idx" ON "catalog_draft_batches"("state", "updatedAt");
ALTER TABLE "catalog_editor_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "catalog_draft_batches" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "catalog_editor_keys", "catalog_draft_batches" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "catalog_editor_keys", "catalog_draft_batches" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "catalog_editor_keys", "catalog_draft_batches" FROM authenticated;
  END IF;
END $$;

COMMIT;
