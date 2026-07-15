-- Website-operated records only. No Food/Dish/source data is altered.
CREATE TABLE "site_settings" (
  "id" TEXT NOT NULL DEFAULT 'public',
  "contactName" TEXT NOT NULL,
  "organization" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "zaloUrl" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "site_settings" ("id", "contactName", "organization", "phone", "zaloUrl")
VALUES (
  'public',
  'Lê Công Bảo Long',
  'Phòng PC07 Công an thành phố Huế · Đội PC & CNCH khu vực 4',
  '0986703396',
  'https://zalo.me/g/dhgc4wmunry94r4cbxzm'
);

CREATE TABLE "contact_messages" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "audience" TEXT,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");

CREATE TABLE "page_visits" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "page_visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "page_visits_createdAt_idx" ON "page_visits"("createdAt");
CREATE INDEX "page_visits_path_createdAt_idx" ON "page_visits"("path", "createdAt");
