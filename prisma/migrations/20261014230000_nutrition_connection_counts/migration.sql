BEGIN;

ALTER TABLE "site_settings"
  ADD COLUMN "nutritionChatgptConnections" INTEGER NOT NULL DEFAULT 0 CHECK ("nutritionChatgptConnections" >= 0),
  ADD COLUMN "nutritionClaudeConnections" INTEGER NOT NULL DEFAULT 0 CHECK ("nutritionClaudeConnections" >= 0);

-- The existing singleton holds the public totals; only the server may write
-- them. Public output continues through the explicit site-settings API select.
ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "site_settings" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "site_settings" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "site_settings" FROM authenticated';
  END IF;
END $$;

COMMIT;
