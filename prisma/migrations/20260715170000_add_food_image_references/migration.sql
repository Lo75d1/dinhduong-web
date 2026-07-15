-- Store external image references only; do not copy image files to this server.
ALTER TABLE "foods"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "imageSourceUrl" TEXT;
