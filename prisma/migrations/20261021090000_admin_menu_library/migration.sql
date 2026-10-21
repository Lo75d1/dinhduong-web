BEGIN;
CREATE TABLE "menu_library_templates" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "direction" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "document" JSONB NOT NULL, "createdBy" TEXT NOT NULL, "requestKey" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "menu_library_templates_createdBy_requestKey_key" ON "menu_library_templates"("createdBy", "requestKey");
CREATE INDEX "menu_library_templates_updatedAt_idx" ON "menu_library_templates"("updatedAt");
CREATE TABLE "menu_library_versions" (
  "id" TEXT PRIMARY KEY, "templateId" TEXT NOT NULL REFERENCES "menu_library_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0), "document" JSONB NOT NULL,
  "actorId" TEXT NOT NULL, "clientId" TEXT, "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "menu_library_versions_templateId_revision_key" ON "menu_library_versions"("templateId", "revision");
CREATE TABLE "menu_library_grants" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId" TEXT NOT NULL REFERENCES "nutrition_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "familyId" TEXT NOT NULL, "permission" TEXT NOT NULL CHECK ("permission" IN ('read', 'write')),
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "menu_library_grants_ownerId_familyId_revokedAt_idx" ON "menu_library_grants"("ownerId", "familyId", "revokedAt");
CREATE UNIQUE INDEX "menu_library_grants_one_active_family" ON "menu_library_grants"("ownerId", "familyId") WHERE "revokedAt" IS NULL;
ALTER TABLE "menu_library_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_library_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_library_grants" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "menu_library_templates", "menu_library_versions", "menu_library_grants" FROM PUBLIC;
DO $private_menu_library$
DECLARE recipient TEXT;
BEGIN
  FOREACH recipient IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = recipient) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.menu_library_templates, public.menu_library_versions, public.menu_library_grants FROM %I', recipient);
    END IF;
  END LOOP;
END
$private_menu_library$;
COMMIT;
