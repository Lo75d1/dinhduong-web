-- Public page content setting only. No Food/Dish/source data is altered.
ALTER TABLE "site_settings"
  ADD COLUMN "thankYouTitle" TEXT NOT NULL DEFAULT 'Lời cảm ơn',
  ADD COLUMN "thankYouBody" TEXT;
