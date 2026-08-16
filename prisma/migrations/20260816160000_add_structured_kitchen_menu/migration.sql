ALTER TABLE "kitchen_menu_items"
  ADD COLUMN "dishId" TEXT,
  ADD COLUMN "servingWeightG" DOUBLE PRECISION;

CREATE INDEX "kitchen_menu_items_dishId_idx" ON "kitchen_menu_items"("dishId");

ALTER TABLE "kitchen_menu_items"
  ADD CONSTRAINT "kitchen_menu_items_dishId_fkey"
  FOREIGN KEY ("dishId") REFERENCES "dishes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
