import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { defaultSiteSettings } from "@/lib/site-settings";
import { NUTRITION_PLATFORM_REDIRECTS } from "./oauth-validation";

/** Called inside the successful initial code exchange, under its family lock.
 * The same transaction makes replay/rollback unable to increment the total.
 * Classify by the exact validated callback, never a client-supplied name.
 */
export async function recordNutritionConnection(tx: Pick<Prisma.TransactionClient, "$queryRaw">, redirectUri: string) {
  const chatgpt = redirectUri === NUTRITION_PLATFORM_REDIRECTS.chatgpt ? 1 : 0;
  const claude = redirectUri === NUTRITION_PLATFORM_REDIRECTS.claude ? 1 : 0;
  if (!chatgpt && !claude) return;
  await tx.$queryRaw`
    INSERT INTO "site_settings" ("id", "contactName", "updatedAt", "nutritionChatgptConnections", "nutritionClaudeConnections")
    VALUES ('public', ${defaultSiteSettings.contactName}, CURRENT_TIMESTAMP, ${chatgpt}, ${claude})
    ON CONFLICT ("id") DO UPDATE SET
      "nutritionChatgptConnections" = "site_settings"."nutritionChatgptConnections" + EXCLUDED."nutritionChatgptConnections",
      "nutritionClaudeConnections" = "site_settings"."nutritionClaudeConnections" + EXCLUDED."nutritionClaudeConnections"
    RETURNING "id"
  `;
}
