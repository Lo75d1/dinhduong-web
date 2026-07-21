-- Phiếu khảo sát SUS (ẩn danh) cho nghiên cứu đánh giá hiệu quả website.
CREATE TABLE "sus_responses" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "useFreq" TEXT,
    "q1" INTEGER NOT NULL,
    "q2" INTEGER NOT NULL,
    "q3" INTEGER NOT NULL,
    "q4" INTEGER NOT NULL,
    "q5" INTEGER NOT NULL,
    "q6" INTEGER NOT NULL,
    "q7" INTEGER NOT NULL,
    "q8" INTEGER NOT NULL,
    "q9" INTEGER NOT NULL,
    "q10" INTEGER NOT NULL,
    "susScore" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sus_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sus_responses_createdAt_idx" ON "sus_responses"("createdAt");
