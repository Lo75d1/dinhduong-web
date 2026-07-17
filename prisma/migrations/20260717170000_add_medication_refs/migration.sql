-- Thuốc/TPBS tham khảo lấy dữ kiện (tên, phân loại, ảnh) từ nguồn công khai,
-- không lưu mô tả nguyên văn của nguồn.
CREATE TABLE "medication_refs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "createdByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_refs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "medication_refs_sourceUrl_key" ON "medication_refs"("sourceUrl");
