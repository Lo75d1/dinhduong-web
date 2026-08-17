-- Reconcile drift that existed between the historical migration chain and
-- prisma/schema.prisma. Every operation is safe both for a fresh database and
-- for an older database where db push may already have created the new shape.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'proteinMinG')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'proteinMinPct') THEN
    ALTER TABLE "nutrition_recommendations" RENAME COLUMN "proteinMinG" TO "proteinMinPct";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'proteinMaxG')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'proteinMaxPct') THEN
    ALTER TABLE "nutrition_recommendations" RENAME COLUMN "proteinMaxG" TO "proteinMaxPct";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'lipidMin')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'lipidMinPct') THEN
    ALTER TABLE "nutrition_recommendations" RENAME COLUMN "lipidMin" TO "lipidMinPct";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'lipidMax')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'lipidMaxPct') THEN
    ALTER TABLE "nutrition_recommendations" RENAME COLUMN "lipidMax" TO "lipidMaxPct";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'glucidMin')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'glucidMinPct') THEN
    ALTER TABLE "nutrition_recommendations" RENAME COLUMN "glucidMin" TO "glucidMinPct";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'glucidMax')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_recommendations' AND column_name = 'glucidMaxPct') THEN
    ALTER TABLE "nutrition_recommendations" RENAME COLUMN "glucidMax" TO "glucidMaxPct";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "food_aliases" (
  "id" TEXT NOT NULL,
  "foodId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "aliasNormalized" TEXT NOT NULL DEFAULT '',
  "region" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "food_aliases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "food_aliases_foodId_idx" ON "food_aliases"("foodId");
CREATE INDEX IF NOT EXISTS "food_aliases_aliasNormalized_idx" ON "food_aliases"("aliasNormalized");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'food_aliases_foodId_fkey') THEN
    ALTER TABLE "food_aliases"
      ADD CONSTRAINT "food_aliases_foodId_fkey"
      FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "offlineDownloadUrl" TEXT;
