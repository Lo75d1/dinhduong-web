-- Only retain the public RNI image identifier and provenance URL, not image binaries.
ALTER TABLE "dishes"
  ADD COLUMN "imageSourceId" TEXT,
  ADD COLUMN "imageSourceUrl" TEXT;
