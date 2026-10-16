BEGIN;
ALTER TABLE "app_users" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "app_sessions" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "nutrition_oauth_clients" ADD COLUMN "ownerId" TEXT;
CREATE INDEX "nutrition_oauth_clients_ownerId_disabledAt_idx" ON "nutrition_oauth_clients"("ownerId", "disabledAt");
ALTER TABLE "nutrition_oauth_clients" ADD CONSTRAINT "nutrition_oauth_clients_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Account credentials and sessions are application-only, as are OAuth credentials.
ALTER TABLE "app_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_change_logs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "app_users", "app_sessions", "data_change_logs" FROM PUBLIC;
DO $account_access$
DECLARE recipient TEXT;
BEGIN
  FOREACH recipient IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = recipient) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.app_users, public.app_sessions, public.data_change_logs FROM %I', recipient);
    END IF;
  END LOOP;
END
$account_access$;
COMMIT;
