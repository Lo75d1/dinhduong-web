-- Additive only: no changes to Food/Dish or existing ration values.
ALTER TABLE "rations" ADD COLUMN "conversationJson" JSONB,
  ADD COLUMN "conversationRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "conversationRequestKey" TEXT;
CREATE UNIQUE INDEX "rations_ownerId_conversationRequestKey_key" ON "rations"("ownerId", "conversationRequestKey");

CREATE TABLE "nutrition_oauth_clients" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "redirectUris" TEXT[] NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "authMethod" TEXT NOT NULL DEFAULT 'none',
  "secretHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "disabledAt" TIMESTAMP(3)
);
CREATE INDEX "nutrition_oauth_clients_expiresAt_idx" ON "nutrition_oauth_clients"("expiresAt");

CREATE TABLE "nutrition_oauth_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codeHash" TEXT NOT NULL,
  "interactionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "codeChallenge" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "issuer" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nutrition_oauth_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "nutrition_oauth_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "nutrition_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "nutrition_oauth_codes_codeHash_key" ON "nutrition_oauth_codes"("codeHash");
CREATE UNIQUE INDEX "nutrition_oauth_codes_interactionId_key" ON "nutrition_oauth_codes"("interactionId");
CREATE INDEX "nutrition_oauth_codes_expiresAt_idx" ON "nutrition_oauth_codes"("expiresAt");
CREATE INDEX "nutrition_oauth_codes_userId_clientId_idx" ON "nutrition_oauth_codes"("userId", "clientId");

CREATE TABLE "nutrition_oauth_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "familyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "accessHash" TEXT NOT NULL,
  "refreshHash" TEXT,
  "scopes" TEXT[] NOT NULL,
  "issuer" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "accessExpiresAt" TIMESTAMP(3) NOT NULL,
  "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
  "rotatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nutrition_oauth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "nutrition_oauth_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "nutrition_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "nutrition_oauth_tokens_accessHash_key" ON "nutrition_oauth_tokens"("accessHash");
CREATE UNIQUE INDEX "nutrition_oauth_tokens_refreshHash_key" ON "nutrition_oauth_tokens"("refreshHash");
CREATE INDEX "nutrition_oauth_tokens_familyId_idx" ON "nutrition_oauth_tokens"("familyId");
CREATE INDEX "nutrition_oauth_tokens_userId_clientId_revokedAt_idx" ON "nutrition_oauth_tokens"("userId", "clientId", "revokedAt");
CREATE INDEX "nutrition_oauth_tokens_refreshExpiresAt_idx" ON "nutrition_oauth_tokens"("refreshExpiresAt");

CREATE TABLE "nutrition_api_windows" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "nutrition_api_windows_expiresAt_idx" ON "nutrition_api_windows"("expiresAt");
