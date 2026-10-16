-- Additive private application data only. No canonical Food/Dish changes.
BEGIN;
CREATE TABLE "personal_foods" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "requestKey" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_foods_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "personal_dishes" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "requestKey" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_dishes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "personal_foods_ownerId_updatedAt_idx" ON "personal_foods"("ownerId", "updatedAt");
CREATE INDEX "personal_dishes_ownerId_updatedAt_idx" ON "personal_dishes"("ownerId", "updatedAt");
CREATE UNIQUE INDEX "personal_foods_ownerId_requestKey_key" ON "personal_foods"("ownerId", "requestKey");
CREATE UNIQUE INDEX "personal_dishes_ownerId_requestKey_key" ON "personal_dishes"("ownerId", "requestKey");
ALTER TABLE "personal_foods" ADD CONSTRAINT "personal_foods_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "personal_dishes" ADD CONSTRAINT "personal_dishes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "personal_foods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "personal_dishes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "personal_foods", "personal_dishes" FROM PUBLIC;
DO $personal_library_access$
DECLARE recipient TEXT;
BEGIN
  FOREACH recipient IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = recipient) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.personal_foods, public.personal_dishes FROM %I', recipient);
    END IF;
  END LOOP;
END
$personal_library_access$;
COMMIT;
