-- Giá tham khảo của thực phẩm (nhiều giá / Food, theo vùng + nguồn). Chỉ mang
-- tính tham khảo, luôn kèm nguồn/ngày; không suy diễn giá thiếu.
CREATE TABLE "food_prices" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "region" TEXT,
    "amountVnd" DOUBLE PRECISION NOT NULL,
    "basis" TEXT NOT NULL,
    "packG" DOUBLE PRECISION,
    "source" TEXT,
    "sourceUrl" TEXT,
    "note" TEXT,
    "asOfDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "food_prices_foodId_idx" ON "food_prices"("foodId");

CREATE INDEX "food_prices_foodId_region_idx" ON "food_prices"("foodId", "region");

ALTER TABLE "food_prices" ADD CONSTRAINT "food_prices_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
