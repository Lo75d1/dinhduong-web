import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { removeNutritionFixtureDirectory } from "./fixtures/nutrition-oauth/safe-temp";
import { verifyFixturePrivateAccess } from "./fixtures/nutrition-oauth/private-access-checks";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import type * as OAuth from "../src/lib/nutrition-chat/oauth";
import type * as Security from "../src/lib/nutrition-chat/security";
import type * as State from "./fixtures/nutrition-oauth/state";
import type * as Database from "./fixtures/nutrition-oauth/database";
import type * as ConnectionStats from "../src/lib/nutrition-chat/connection-stats";
import { CONSENT_COOKIE, getNutritionPublicUrl, getNutritionResourceUrl, hashNutritionToken, randomNutritionToken } from "../src/lib/nutrition-chat/oauth-validation";

type FixtureRuntime = typeof OAuth & typeof Security & typeof State & typeof Database & typeof ConnectionStats;
type Registered = { client_id: string; client_secret?: string; token_endpoint_auth_method: string };
type Tokens = { access_token: string; refresh_token: string; token_type: string; expires_in: number; scope: string; resource: string };
let checks = 0;

async function main() {
  const saved = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "nutrition-oauth-fixture-"));
  const require = createRequire(import.meta.url);
  let runtime: FixtureRuntime | undefined;
  try {
    process.env.NUTRITION_PUBLIC_URL = "https://dinhduong2598.food";
    process.env.APP_SECRET = "disposable-fixture-placeholder-no-live-secrets";
    delete process.env.NUTRITION_OAUTH_REDIRECT_URIS;
    delete process.env.NUTRITION_ALLOWED_ORIGINS;
    delete process.env.NUTRITION_TRUST_PROXY;
    const sources = ["src/lib/nutrition-chat/oauth.ts", "src/lib/nutrition-chat/security.ts", "src/lib/nutrition-chat/connection-stats.ts", "scripts/fixtures/nutrition-oauth/state.ts", "scripts/fixtures/nutrition-oauth/database.ts"];
    const outfile = join(directory, "oauth-fixture.cjs");
    await build({
      stdin: { contents: sources.map(path => `export * from ${JSON.stringify(resolve(path))};`).join("\n"), resolveDir: process.cwd(), loader: "ts" },
      outfile, bundle: true, platform: "node", format: "cjs", logLevel: "silent",
      plugins: [{ name: "disposable-oauth-fixtures", setup(builder) {
        builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only-stub", namespace: "empty" }));
        builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};", loader: "js" }));
        builder.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/database.ts") }));
        builder.onResolve({ filter: /^(next\/headers|@\/lib\/auth)$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/state.ts") }));
        builder.onResolve({ filter: /^@electric-sql\/pglite$/ }, () => ({ path: require.resolve("@electric-sql/pglite"), external: true }));
      } }],
    });
    runtime = require(outfile) as FixtureRuntime;
    const api = runtime;
    const migration = resolve("prisma/migrations/20261014090000_nutrition_chat_oauth/migration.sql");
    await api.initializeOAuthFixture(migration);
    const privateAccess = await verifyFixturePrivateAccess(api, migration);
    checks += privateAccess.checks;
    async function totals() {
      return (await api.fixtureQuery<{ chatgpt: number; claude: number }>('SELECT "nutritionChatgptConnections" AS chatgpt, "nutritionClaudeConnections" AS claude FROM "site_settings" WHERE "id" = \'public\''))[0];
    }
    assert.deepEqual(await totals(), { chatgpt: 0, claude: 0 }); checks++;
    for (const role of ["anon", "authenticated", "nutrition_fixture_public_probe"]) {
      const [access] = await api.fixtureQuery<{ read: boolean; write: boolean }>('SELECT has_table_privilege($1, \'site_settings\', \'SELECT\') AS read, has_table_privilege($1, \'site_settings\', \'UPDATE\') AS write', [role]);
      assert.deepEqual(access, { read: false, write: false }); checks++;
    }
    api.setFixtureUser({ id: "user-a", email: "fixture-a@example.test", displayName: "Người dùng A (fixture)", role: "CLINICIAN" });
    const publicUrl = getNutritionPublicUrl();
    const resource = getNutritionResourceUrl();
    const scopes = "nutrition:read nutrition:calculate nutrition:write nutrition:export";
    function form(path: string, values: Record<string, string>, basic?: string) {
      return new Request(`${publicUrl}/api/nutrition/v1/oauth/${path}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: publicUrl, ...(basic ? { Authorization: basic } : {}) }, body: new URLSearchParams(values) });
    }
    function nativeForm(path: string, values: Record<string, string>) {
      const request = form(path, values);
      for (const [name, value] of Object.entries({ Origin: "null", "Sec-Fetch-Site": "same-origin", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Dest": "document" })) request.headers.set(name, value);
      return request;
    }
    async function register(method = "none"): Promise<Registered> {
      const response = await api.nutritionOAuthHandler(api.registerNutritionClient, new Request(`${publicUrl}/api/nutrition/v1/oauth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_name: "Claude (fixture)", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"], token_endpoint_auth_method: method }),
      }));
      assert.equal(response.status, 201); checks++;
      return await response.json() as Registered;
    }
    const client = await register();
    const otherClient = await register();
    const basicClient = await register("client_secret_basic");
    const postClient = await register("client_secret_post");
    const rows = await api.fixtureQuery<{ secretHash: string }>('SELECT "secretHash" FROM "nutrition_oauth_clients" WHERE "id" = $1', [basicClient.client_id]);
    assert.equal(rows[0].secretHash, hashNutritionToken(basicClient.client_secret!)); checks++;
    assert.notEqual(rows[0].secretHash, basicClient.client_secret); checks++;
    assert.equal(api.nutritionAuthorizationMetadata().issuer, publicUrl); checks++;
    assert.equal(api.nutritionProtectedResourceMetadata().resource, resource); checks++;
    assert.equal(api.nutritionAuthorizationMetadata().client_id_metadata_document_supported, false); checks++;

    async function authorize(selected: Registered = client, requestedScope = scopes) {
      const verifier = randomNutritionToken();
      const params = new URLSearchParams({ client_id: selected.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", state: "fixture-client-state", response_type: "code", code_challenge_method: "S256", code_challenge: hashNutritionToken(verifier), scope: requestedScope, resource });
      const response = await api.nutritionOAuthHandler(api.beginNutritionAuthorization, new Request(`${publicUrl}/api/nutrition/v1/oauth/authorize?${params}`));
      assert.equal(response.status, 302); checks++;
      const consent = await api.nutritionConsentPageData();
      assert.equal(consent.user!.id, "user-a"); checks++;
      const badCsrf = await api.nutritionOAuthHandler(api.confirmNutritionAuthorization, nativeForm("authorize", { csrf: "wrong", decision: "approve" }));
      assert.equal(badCsrf.status, 403); checks++;
      const savedCookie = api.fixtureCookies.get(CONSENT_COOKIE)!;
      const foreign = nativeForm("authorize", { csrf: consent.csrf!, decision: "approve" }); foreign.headers.set("Sec-Fetch-Site", "cross-site");
      assert.equal((await api.nutritionOAuthHandler(api.confirmNutritionAuthorization, foreign)).status, 403); checks++;
      const confirmed = await api.nutritionOAuthHandler(api.confirmNutritionAuthorization, nativeForm("authorize", { csrf: consent.csrf!, decision: "approve" }));
      assert.equal(confirmed.status, 303); checks++;
      const redirect = new URL(confirmed.headers.get("location")!);
      assert.equal(redirect.searchParams.get("iss"), publicUrl); checks++;
      assert.equal(redirect.searchParams.get("state"), "fixture-client-state"); checks++;
      // Replaying even a copied signed interaction cannot issue a second authorization code.
      api.fixtureCookies.set(CONSENT_COOKIE, savedCookie);
      const repeated = await api.nutritionOAuthHandler(api.confirmNutritionAuthorization, form("authorize", { csrf: consent.csrf!, decision: "approve" }));
      assert.equal(repeated.status, 400); checks++;
      return { code: redirect.searchParams.get("code")!, verifier, client: selected };
    }
    function credentials(selected: Registered): Record<string, string> {
      return { client_id: selected.client_id, ...(selected.token_endpoint_auth_method === "client_secret_post" ? { client_secret: selected.client_secret! } : {}) };
    }
    function basic(selected: Registered) {
      return selected.token_endpoint_auth_method === "client_secret_basic" ? `Basic ${Buffer.from(`${selected.client_id}:${selected.client_secret}`).toString("base64")}` : undefined;
    }
    async function exchange(grant: Awaited<ReturnType<typeof authorize>>, overrides: Record<string, string> = {}) {
      return api.nutritionOAuthHandler(api.exchangeNutritionToken, form("token", { grant_type: "authorization_code", resource, code: grant.code, code_verifier: grant.verifier, redirect_uri: "https://claude.ai/api/mcp/auth_callback", ...credentials(grant.client), ...overrides }, basic(grant.client)));
    }
    async function newTokens(selected = client) {
      const response = await exchange(await authorize(selected));
      assert.equal(response.status, 200); checks++;
      return await response.json() as Tokens;
    }
    function protectedRequest(token: string) { return new Request(resource, { headers: { Authorization: `Bearer ${token}` } }); }
    async function identityFails(token: string, code = "invalid_token") {
      await assert.rejects(() => api.getNutritionIdentity(protectedRequest(token), "nutrition:read"), error => error instanceof Error && error.message === code); checks++;
    }

    const grant = await authorize();
    assert.equal((await exchange(grant, { resource: "https://wrong.test/mcp" })).status, 400); checks++;
    assert.equal((await exchange(grant, { code_verifier: randomNutritionToken() })).status, 400); checks++;
    assert.equal((await exchange(grant, { client_id: otherClient.client_id })).status, 400); checks++;
    assert.deepEqual(await totals(), { chatgpt: 0, claude: 0 }); checks++;
    const response = await exchange(grant);
    assert.equal(response.status, 200); checks++;
    const issued = await response.json() as Tokens;
    assert.deepEqual(await totals(), { chatgpt: 0, claude: 1 }); checks++;
    assert.equal((await api.fixtureQuery<{ contactName: string }>('SELECT "contactName" FROM "site_settings" WHERE "id" = \'public\''))[0].contactName, "Existing fixture contact"); checks++;
    assert.equal(issued.resource, resource); checks++;
    assert.equal(issued.token_type, "Bearer"); checks++;
    assert.ok(issued.expires_in > 0 && issued.expires_in <= 900); checks++;
    assert.equal((await api.getNutritionIdentity(protectedRequest(issued.access_token), "nutrition:write")).userId, "user-a"); checks++;
    const stored = await api.fixtureQuery<{ accessHash: string; refreshHash: string }>('SELECT "accessHash", "refreshHash" FROM "nutrition_oauth_tokens" WHERE "accessHash" = $1', [hashNutritionToken(issued.access_token)]);
    assert.equal(stored[0].refreshHash, hashNutritionToken(issued.refresh_token)); checks++;
    assert.notEqual(stored[0].accessHash, issued.access_token); checks++;
    await api.fixtureQuery('UPDATE "nutrition_oauth_tokens" SET "audience" = $1 WHERE "accessHash" = $2', ["https://evil.test", hashNutritionToken(issued.access_token)]);
    await identityFails(issued.access_token);
    await api.fixtureQuery('UPDATE "nutrition_oauth_tokens" SET "audience" = $1 WHERE "accessHash" = $2', [resource, hashNutritionToken(issued.access_token)]);
    assert.equal((await exchange(grant)).status, 400); checks++;
    assert.deepEqual(await totals(), { chatgpt: 0, claude: 1 }); checks++;
    await identityFails(issued.access_token); // Code replay revoked its token family.

    const initial = await newTokens();
    async function refresh(token: string, scope?: string) {
      return api.nutritionOAuthHandler(api.exchangeNutritionToken, form("token", { grant_type: "refresh_token", resource, client_id: client.client_id, refresh_token: token, ...(scope ? { scope } : {}) }));
    }
    assert.equal((await refresh(initial.refresh_token, "admin")).status, 400); checks++;
    const rotatedResponse = await refresh(initial.refresh_token, "nutrition:read");
    assert.equal(rotatedResponse.status, 200); checks++;
    const rotated = await rotatedResponse.json() as Tokens;
    assert.deepEqual(await totals(), { chatgpt: 0, claude: 2 }); checks++;
    assert.equal(rotated.scope, "nutrition:read"); checks++;
    await assert.rejects(() => api.getNutritionIdentity(protectedRequest(rotated.access_token), "nutrition:write"), error => error instanceof Error && error.message === "insufficient_scope"); checks++;
    assert.equal((await refresh(initial.refresh_token)).status, 400); checks++;
    await identityFails(rotated.access_token);

    const concurrent = await newTokens();
    const double = await Promise.all([refresh(concurrent.refresh_token), refresh(concurrent.refresh_token)]);
    assert.deepEqual(double.map(item => item.status).sort(), [200, 400]); checks++;
    const doubleIssued = await double.find(item => item.status === 200)!.json() as Tokens;
    await identityFails(doubleIssued.access_token);

    const basicIssued = await newTokens(basicClient);
    const basicBad = await api.nutritionOAuthHandler(api.exchangeNutritionToken, form("token", { grant_type: "refresh_token", resource, client_id: basicClient.client_id, refresh_token: basicIssued.refresh_token }, `Basic ${Buffer.from(`${basicClient.client_id}:wrong`).toString("base64")}`));
    assert.equal(basicBad.status, 401); checks++;
    assert.equal(basicBad.headers.get("www-authenticate"), 'Basic realm="nutrition-oauth"'); checks++;
    await newTokens(postClient);

    const revocable = await newTokens();
    const wrongRevoke = await api.nutritionOAuthHandler(api.revokeNutritionToken, form("revoke", { client_id: otherClient.client_id, token: revocable.refresh_token }));
    assert.equal(wrongRevoke.status, 200); checks++;
    assert.equal((await api.getNutritionIdentity(protectedRequest(revocable.access_token), "nutrition:read")).userId, "user-a"); checks++;
    const revoked = await api.nutritionOAuthHandler(api.revokeNutritionToken, form("revoke", { client_id: client.client_id, token: revocable.refresh_token }));
    assert.equal(revoked.status, 200); checks++;
    await identityFails(revocable.access_token);
    const beforeExtraStats = await totals();
    const statsTx = api.prisma as unknown as Parameters<(typeof ConnectionStats)["recordNutritionConnection"]>[0];
    await api.recordNutritionConnection(statsTx, "https://chatgpt.com/connector_platform_oauth_redirect");
    assert.deepEqual(await totals(), { ...beforeExtraStats, chatgpt: 1 }); checks++;
    await api.recordNutritionConnection(statsTx, "https://chatgpt.com/connector_platform_oauth_redirect?spoof=1");
    await api.recordNutritionConnection(statsTx, "https://example.test/claude-callback");
    assert.deepEqual(await totals(), { ...beforeExtraStats, chatgpt: 1 }); checks++;
    await assert.rejects(() => api.prisma.$transaction(async tx => {
      await api.recordNutritionConnection(tx as unknown as typeof statsTx, "https://claude.ai/api/mcp/auth_callback");
      throw new Error("fixture rollback");
    }), /fixture rollback/); checks++;
    assert.deepEqual(await totals(), { ...beforeExtraStats, chatgpt: 1 }); checks++;
    assert.equal((await api.nutritionOAuthHandler(api.revokeNutritionToken, form("revoke", { client_id: client.client_id, token: randomNutritionToken() }))).status, 200); checks++;

    const personal = await newTokens();
    const connections = await api.nutritionConnectionsPageData();
    const family = (await api.fixtureQuery<{ familyId: string }>('SELECT "familyId" FROM "nutrition_oauth_tokens" WHERE "accessHash"=$1', [hashNutritionToken(personal.access_token)]))[0].familyId;
    api.setFixtureUser({ id: "user-b", email: "fixture-b@example.test", displayName: "Người dùng B", role: "CLINICIAN" });
    const bConnections = await api.nutritionConnectionsPageData();
    assert.equal(bConnections.connections.length, 0); checks++;
    assert.equal((await api.nutritionOAuthHandler(api.revokeNutritionConnection, nativeForm("connections", { csrf: connections.csrf, family_id: family }))).status, 403); checks++;
    assert.equal((await api.nutritionOAuthHandler(api.revokeNutritionConnection, nativeForm("connections", { csrf: bConnections.csrf, family_id: family }))).status, 303); checks++;
    assert.equal((await api.getNutritionIdentity(protectedRequest(personal.access_token), "nutrition:read")).userId, "user-a"); checks++;
    api.setFixtureUser({ id: "user-a", email: "fixture-a@example.test", displayName: "Người dùng A", role: "CLINICIAN" });
    assert.equal((await api.nutritionOAuthHandler(api.revokeNutritionConnection, nativeForm("connections", { csrf: connections.csrf, family_id: family }))).status, 303); checks++;
    await identityFails(personal.access_token);
    api.setFixtureUser(null);
    assert.equal((await api.nutritionOAuthHandler(api.listNutritionConnections, form("connections", {}))).status, 401); checks++;

    const ratePolicy = { limit: 3, windowSeconds: 60 };
    const rates = await Promise.all(Array.from({ length: 12 }, () => api.consumeNutritionRateLimit("fixture-atomic", ratePolicy)));
    assert.equal(rates.filter(result => result.allowed).length, 3); checks++;
    assert.ok(rates.every(result => result.retryAfter >= 1 && result.retryAfter <= 60)); checks++;
    const rateKey = hashNutritionToken("fixture-atomic:3:60");
    const counters = await api.fixtureQuery<{ count: number }>('SELECT "count" FROM "nutrition_api_windows" WHERE "key" = $1', [rateKey]);
    assert.equal(counters[0].count, 4); checks++;
    await api.fixtureQuery('UPDATE "nutrition_api_windows" SET "expiresAt" = $1 WHERE "key" = $2', [new Date(Date.now() - 60_000), rateKey]);
    assert.equal((await api.consumeNutritionRateLimit("fixture-atomic", ratePolicy)).allowed, true); checks++;
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT "count" FROM "nutrition_api_windows" WHERE "key" = $1', [rateKey]))[0].count, 1); checks++;
    await api.fixtureQuery('UPDATE "nutrition_oauth_tokens" SET "refreshExpiresAt" = $1', [new Date(Date.now() - 1000)]);
    const removed = await api.cleanupNutritionOAuth(200);
    assert.ok(removed.tokens > 0); checks++;
    const afterCleanup = await totals();
    assert.equal(afterCleanup.chatgpt, 1); checks++;
    assert.ok(afterCleanup.claude > 2); checks++;
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT count(*) AS count FROM "app_users"'))[0].count, 2); checks++;
    console.log(`Nutrition OAuth disposable PostgreSQL: ${checks} checks passed. Migration, private ACL/RLS (${privateAccess.checks} checks), hashed tokens, code replay, refresh rotation/reuse, revocation/owner checks and atomic rate SQL verified.`);
    console.log("Fixture uses PGlite + substituted Prisma/session APIs. It does not prove live VPS, real ChatGPT/Claude, browser consent or multi-worker PostgreSQL locks.");
  } finally {
    if (runtime) await runtime.closeOAuthFixture();
    await removeNutritionFixtureDirectory(directory, "nutrition-oauth-fixture-");
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.stack : "Fixture failed"); process.exitCode = 1; });
