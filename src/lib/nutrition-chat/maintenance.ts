import { prisma } from "@/lib/prisma";
import { NutritionSecurityError, REFRESH_SECONDS } from "./oauth-validation";

/** Bounded maintenance of expired authorization records only. No Food/Dish/Ration writes. */
export async function cleanupNutritionOAuth(batchSize = 200) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new NutritionSecurityError("invalid_request");
  const now = new Date();
  // Keep spent codes/refresh tokens through absolute family expiry to detect replay.
  const codes = await prisma.nutritionOAuthCode.findMany({ where: { OR: [
    { usedAt: null, expiresAt: { lt: now } },
    { usedAt: { not: null }, expiresAt: { lt: new Date(now.getTime() - REFRESH_SECONDS * 1000) } },
  ] }, select: { id: true }, take: batchSize });
  const tokens = await prisma.nutritionOAuthToken.findMany({ where: { refreshExpiresAt: { lt: now } }, select: { id: true }, take: batchSize });
  const windows = await prisma.nutritionApiWindow.findMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86400_000) } }, select: { key: true }, take: batchSize });
  const clients = await prisma.nutritionOAuthClient.findMany({ where: { expiresAt: { lt: now } }, select: { id: true }, take: batchSize });
  return {
    codes: (await prisma.nutritionOAuthCode.deleteMany({ where: { id: { in: codes.map(row => row.id) }, OR: [
      { usedAt: null, expiresAt: { lt: now } },
      { usedAt: { not: null }, expiresAt: { lt: new Date(now.getTime() - REFRESH_SECONDS * 1000) } },
    ] } })).count,
    tokens: (await prisma.nutritionOAuthToken.deleteMany({ where: { id: { in: tokens.map(row => row.id) }, refreshExpiresAt: { lt: now } } })).count,
    windows: (await prisma.nutritionApiWindow.deleteMany({ where: { key: { in: windows.map(row => row.key) }, expiresAt: { lt: new Date(now.getTime() - 86400_000) } } })).count,
    clients: (await prisma.nutritionOAuthClient.deleteMany({ where: { id: { in: clients.map(row => row.id) }, expiresAt: { lt: now } } })).count,
  };
}
