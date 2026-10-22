BEGIN;
CREATE TABLE "menu_library_reviews" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "decision" TEXT NOT NULL CHECK ("decision" IN ('approved', 'changes_requested')),
  "reviewerId" TEXT NOT NULL,
  "reviewerName" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "analysis" JSONB NOT NULL,
  "analysisDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("templateId", "revision") REFERENCES "menu_library_versions"("templateId", "revision") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "menu_library_reviews_templateId_revision_createdAt_idx" ON "menu_library_reviews"("templateId", "revision", "createdAt");
ALTER TABLE "menu_library_reviews" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "menu_library_reviews" FROM PUBLIC;
DO $private_menu_reviews$
DECLARE recipient TEXT;
BEGIN
  FOREACH recipient IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = recipient) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.menu_library_reviews FROM %I', recipient);
    END IF;
  END LOOP;
END
$private_menu_reviews$;
COMMIT;
