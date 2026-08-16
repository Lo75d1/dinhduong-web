ALTER TABLE "kitchen_menu_items"
ADD COLUMN "snapshotJson" JSONB,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT;

CREATE UNIQUE INDEX "kitchen_menu_items_menuId_dietTypeId_key"
ON "kitchen_menu_items"("menuId", "dietTypeId");

CREATE INDEX "kitchen_menu_items_approvedAt_idx"
ON "kitchen_menu_items"("approvedAt");

ALTER TABLE "kitchen_menu_items"
ADD CONSTRAINT "kitchen_menu_items_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "app_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
