-- AlterTable
ALTER TABLE "dishes" ADD COLUMN     "nameNormalized" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "foods" ADD COLUMN     "nameNormalized" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "dishes_nameNormalized_idx" ON "dishes"("nameNormalized");

-- CreateIndex
CREATE INDEX "foods_nameNormalized_idx" ON "foods"("nameNormalized");
