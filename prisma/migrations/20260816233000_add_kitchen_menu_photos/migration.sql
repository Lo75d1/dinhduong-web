ALTER TABLE "kitchen_menu_items"
  ADD COLUMN "photoStoragePath" TEXT,
  ADD COLUMN "photoUploadedById" TEXT,
  ADD COLUMN "photoUploadedAt" TIMESTAMP(3);

ALTER TABLE "kitchen_menu_items"
  ADD CONSTRAINT "kitchen_menu_items_photoUploadedById_fkey"
  FOREIGN KEY ("photoUploadedById") REFERENCES "app_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "kitchen_menu_items_photoUploadedAt_idx"
  ON "kitchen_menu_items"("photoUploadedAt");
