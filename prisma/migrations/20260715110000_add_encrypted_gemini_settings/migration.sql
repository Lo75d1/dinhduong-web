-- Website administration settings only. No Food/Dish/source data is altered.
ALTER TABLE "site_settings"
  ADD COLUMN "geminiKeyEncrypted" TEXT,
  ADD COLUMN "geminiModel" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  ADD COLUMN "geminiEnabled" BOOLEAN NOT NULL DEFAULT false;
