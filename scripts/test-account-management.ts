import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { removeNutritionFixtureDirectory } from "./fixtures/nutrition-oauth/safe-temp";
import type * as Account from "../src/lib/account-management";
import type * as Auth from "../src/lib/auth";
import type * as OAuth from "../src/lib/nutrition-chat/oauth";
import type * as Security from "../src/lib/nutrition-chat/security";
import type * as Db from "./fixtures/nutrition-oauth/database";
import {
  connectionCsrf,
  consentCsrf,
  hashNutritionToken,
  randomNutritionToken,
  getNutritionResourceUrl,
  NUTRITION_SCOPES,
} from "../src/lib/nutrition-chat/oauth-validation";
type Runtime = typeof Account &
  typeof Auth &
  typeof OAuth &
  typeof Security &
  typeof Db & { fixtureCookies: Map<string, string> };
let checks = 0;
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "nutrition-account-fixture-")),
    saved = { ...process.env };
  const require = createRequire(import.meta.url);
  let api: Runtime | undefined;
  try {
    process.env.NUTRITION_PUBLIC_URL = "https://dinhduong2598.food";
    process.env.APP_SECRET = "account-fixture-disposable-not-production";
    delete process.env.NUTRITION_TRUST_PROXY;
    const sources = [
      "src/lib/account-management.ts",
      "src/lib/auth.ts",
      "src/lib/nutrition-chat/oauth.ts",
      "src/lib/nutrition-chat/security.ts",
      "scripts/fixtures/nutrition-oauth/database.ts",
    ];
    const outfile = join(directory, "account.cjs");
    await build({
      stdin: {
        contents:
          sources
            .map((p) => `export * from ${JSON.stringify(resolve(p))};`)
            .join("\n") +
          `\nexport {fixtureCookies} from ${JSON.stringify(resolve("scripts/fixtures/nutrition-oauth/state.ts"))};`,
        resolveDir: process.cwd(),
        loader: "ts",
      },
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      logLevel: "silent",
      plugins: [
        {
          name: "account-fixture",
          setup(builder) {
            builder.onResolve({ filter: /^server-only$/ }, () => ({
              path: "empty",
              namespace: "empty",
            }));
            builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({
              contents: "export {}",
            }));
            builder.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({
              path: resolve("scripts/fixtures/nutrition-oauth/database.ts"),
            }));
            builder.onResolve({ filter: /^next\/headers$/ }, () => ({
              path: resolve("scripts/fixtures/nutrition-oauth/state.ts"),
            }));
            builder.onResolve({ filter: /^@electric-sql\/pglite$/ }, () => ({
              path: require.resolve("@electric-sql/pglite"),
              external: true,
            }));
          },
        },
      ],
    });
    api = require(outfile) as Runtime;
    const app = api;
    await app.initializeOAuthFixture(
      resolve(
        "prisma/migrations/20261014090000_nutrition_chat_oauth/migration.sql",
      ),
    );
    const password = "Disposable-fixture-pass-2598";
    for (const [id, role] of [
      ["user-a", "CLINICIAN"],
      ["user-b", "EDITOR"],
    ])
      await app.fixtureQuery(
        'UPDATE app_users SET email=$1,"passwordHash"=$2,role=$3 WHERE id=$4',
        [`${id}@example.invalid`, app.hashPassword(password), role, id],
      );
    await app.fixtureQuery(
      'INSERT INTO app_users(id,email,"displayName","passwordHash",role) VALUES ($1,$2,$3,$4,$5)',
      [
        "admin",
        "admin@example.invalid",
        "Fixture admin",
        app.hashPassword(password),
        "ADMIN",
      ],
    );
    const base = process.env.NUTRITION_PUBLIC_URL;
    const cookieValues = new Map<string, string>();
    async function login(id: string) {
      await app.createSession(
        id,
        new Request(base, {
          headers: { "user-agent": "Fixture Chrome/1 Windows" },
        }),
      );
      cookieValues.set(id, app.fixtureCookies.get(app.SESSION_COOKIE)!);
    }
    function select(id: string) {
      app.fixtureCookies.set(app.SESSION_COOKIE, cookieValues.get(id)!);
    }
    const request = (
      body: unknown,
      id = "user-a",
      headers: Record<string, string> = {},
    ) =>
      new Request(`${base}/api/auth/manage/test`, {
        method: "POST",
        headers: {
          Origin: base,
          "content-type": "application/json",
          "x-account-csrf": connectionCsrf(id),
          ...headers,
        },
        body: JSON.stringify(body),
      });
    async function checkStatus(
      action: () => Promise<Response>,
      expected: number,
    ) {
      const response = await app.accountHandler(action);
      assert.equal(response.status, expected, await response.clone().text());
      checks++;
      return await response.json();
    }
    const manage = (
      action: string,
      body: unknown,
      expected = 200,
      id = "user-a",
    ) =>
      checkStatus(() => app.manageAccount(request(body, id), action), expected);
    await login("user-a");
    await login("user-b");
    await login("admin");
    const profile = await app.accountSnapshot();
    assert.equal(profile.user.id, "admin");
    checks++;
    assert.equal(profile.sessions[0].current, true);
    checks++;
    assert.equal(JSON.stringify(profile).includes("tokenHash"), false);
    checks++;
    app.fixtureCookies.clear();
    await checkStatus(
      async () => app.nutritionJson(await app.accountSnapshot()),
      401,
    );
    select("user-a");
    await checkStatus(
      () => app.listAccountUsers(new Request(`${base}/api/admin/users`)),
      403,
    );
    await checkStatus(
      () =>
        app.updateAccountProfile(
          request({ displayName: "Changed", role: "ADMIN" }),
        ),
      400,
    );
    await checkStatus(
      () =>
        app.updateAccountProfile(
          request({ displayName: "Changed" }, "user-a", {
            Origin: "https://evil.invalid",
          }),
        ),
      403,
    );
    await checkStatus(
      () =>
        app.updateAccountProfile(
          request({ displayName: "Changed" }, "user-a", {
            "x-account-csrf": "wrong",
          }),
        ),
      403,
    );
    await checkStatus(
      () =>
        app.updateAccountProfile(request({ displayName: "Updated fixture" })),
      200,
    );
    const otherSessions = (
      await app.fixtureQuery<{ id: string }>(
        'SELECT id FROM app_sessions WHERE "userId"=$1',
        ["user-b"],
      )
    )[0];
    await manage("sessions", { sessionId: otherSessions.id }, 404);
    const currentSessions = (await app.accountSnapshot()).sessions;
    await manage("sessions", { sessionId: currentSessions[0].id }, 400);
    await login("user-a");
    await manage("sessions", { otherSessions: true });
    assert.equal((await app.accountSnapshot()).sessions.length, 1);
    checks++;
    await manage(
      "password",
      { currentPassword: "wrong", password: "Valid-fixture-password" },
      403,
    );
    await manage(
      "manual-create",
      {
        name: "Manual",
        platform: "chatgpt",
        currentPassword: "wrong",
        scopes: ["nutrition:read"],
      },
      403,
    );
    await manage(
      "manual-create",
      {
        name: "Manual",
        platform: "chatgpt",
        currentPassword: password,
        scopes: ["admin"],
      },
      400,
    );
    const issued = await manage("manual-create", {
      name: "Manual fixture",
      platform: "chatgpt",
      currentPassword: password,
      scopes: [...NUTRITION_SCOPES],
    });
    assert.equal(issued.clientSecret.length, 43);
    checks++;
    const client = (
      await app.fixtureQuery<{ ownerId: string; secretHash: string }>(
        'SELECT "ownerId","secretHash" FROM nutrition_oauth_clients WHERE id=$1',
        [issued.client.id],
      )
    )[0];
    assert.equal(client.ownerId, "user-a");
    checks++;
    assert.equal(client.secretHash, hashNutritionToken(issued.clientSecret));
    checks++;
    const snapshot = JSON.stringify(await app.accountSnapshot());
    assert.equal(snapshot.includes(issued.clientSecret), false);
    checks++;
    assert.equal(snapshot.includes("secretHash"), false);
    checks++;
    select("user-b");
    await manage(
      "manual-revoke",
      { clientId: issued.client.id },
      404,
      "user-b",
    );
    const verifier = randomNutritionToken(),
      challenge = createHash("sha256").update(verifier).digest("base64url");
    const params = new URLSearchParams({
      client_id: issued.client.id,
      redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
      state: randomNutritionToken(),
      response_type: "code",
      code_challenge: challenge,
      code_challenge_method: "S256",
      resource: getNutritionResourceUrl(),
      scope: NUTRITION_SCOPES.join(" "),
    });
    await app.beginNutritionAuthorization(
      new Request(`${base}/api/nutrition/v1/oauth/authorize?${params}`),
    );
    await assert.rejects(() => app.nutritionConsentPageData());
    checks++;
    select("user-a");
    const consent = await app.nutritionConsentPageData();
    const confirmation = new Request(
      `${base}/api/nutrition/v1/oauth/authorize`,
      {
        method: "POST",
        headers: {
          Origin: base,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          decision: "approve",
          csrf: consentCsrf(consent.interaction, "user-a"),
        }),
      },
    );
    const location = new URL(
      (await app.confirmNutritionAuthorization(confirmation)).headers.get(
        "location",
      )!,
    );
    const tokenBody = {
      grant_type: "authorization_code",
      code: location.searchParams.get("code")!,
      client_id: issued.client.id,
      client_secret: issued.clientSecret,
      redirect_uri: params.get("redirect_uri")!,
      code_verifier: verifier,
      resource: getNutritionResourceUrl(),
    };
    function tokenRequest(body: Record<string, string>) {
      return new Request(`${base}/api/nutrition/v1/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      });
    }
    const basicRequest = tokenRequest({ ...tokenBody, client_secret: "" });
    const basicForm = new URLSearchParams(tokenBody);
    basicForm.delete("client_secret");
    basicRequest.headers.set("Authorization", `Basic ${Buffer.from(`${issued.client.id}:${issued.clientSecret}`).toString("base64")}`);
    let tokens = await (await app.exchangeNutritionToken(new Request(basicRequest, { body: basicForm }))).json();
    assert.equal(tokens.access_token.length, 43);
    checks++;
    const refreshBody = { grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: issued.client.id, resource: getNutritionResourceUrl() };
    await assert.rejects(() => app.exchangeNutritionToken(tokenRequest(refreshBody))); checks++;
    tokens = await (await app.exchangeNutritionToken(tokenRequest({ ...refreshBody, client_secret: issued.clientSecret }))).json();
    assert.equal(tokens.access_token.length, 43); checks++;
    const identity = () =>
      app.getNutritionIdentity(
        new Request(getNutritionResourceUrl(), {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        }),
        "nutrition:read",
      );
    assert.equal((await identity()).userId, "user-a");
    checks++;
    await manage("manual-revoke", { clientId: issued.client.id });
    await assert.rejects(identity);
    checks++;
    await assert.rejects(() =>
      app.exchangeNutritionToken(
        tokenRequest({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
          client_id: issued.client.id,
          client_secret: issued.clientSecret,
          resource: getNutritionResourceUrl(),
        }),
      ),
    );
    checks++;
    for (let i = 0; i < 5; i++)
      await manage("manual-create", {
        name: `Config ${i}`,
        platform: "claude",
        currentPassword: password,
        scopes: ["nutrition:read"],
      });
    await manage(
      "manual-create",
      {
        name: "Sixth",
        platform: "claude",
        currentPassword: password,
        scopes: ["nutrition:read"],
      },
      409,
    );
    const allLogs = JSON.stringify(
      await app.fixtureQuery("SELECT * FROM data_change_logs"),
    );
    assert.equal(allLogs.includes(password), false);
    checks++;
    assert.equal(allLogs.includes(issued.clientSecret), false);
    checks++;
    select("admin");
    await checkStatus(
      () =>
        app.createAccountUser(
          request(
            {
              displayName: "Created",
              email: "created@example.invalid",
              password,
              role: "EDITOR",
              currentPassword: password,
              reason: "Fixture creation",
            },
            "admin",
          ),
        ),
      201,
    );
    const update = (id: string, body: object, expected = 200) =>
      checkStatus(
        () =>
          app.updateAccountUser(
            request(
              {
                currentPassword: password,
                reason: "Fixture admin verification",
                ...body,
              },
              "admin",
            ),
            id,
          ),
        expected,
      );
    await update("admin", { action: "disable" }, 400);
    await update(
      "admin",
      {
        action: "update",
        displayName: "Admin",
        email: "admin@example.invalid",
        role: "EDITOR",
      },
      400,
    );
    await update(
      "user-b",
      {
        action: "update",
        displayName: "Test",
        email: "user-b@example.invalid",
        role: "ADMIN",
        currentPassword: "wrong",
      },
      403,
    );
    await update("user-b", {
      action: "update",
      displayName: "Updated B",
      email: "user-b@example.invalid",
      role: "DIETITIAN",
    });
    select("user-b");
    assert.equal(await app.getSessionUser(), null);
    checks++;
    await login("user-b");
    select("admin");
    await update("user-b", { action: "disable" });
    select("user-b");
    assert.equal(await app.getSessionUser(), null);
    checks++;
    await assert.rejects(() => app.createSession("user-b"));
    checks++;
    select("admin");
    await update("user-b", { action: "enable" });
    await login("user-b");
    select("admin");
    await update("user-b", {
      action: "reset-password",
      password: "New-disposable-password-2598",
    });
    select("user-b");
    assert.equal(await app.getSessionUser(), null);
    checks++;
    const resetUser = (
      await app.fixtureQuery<{ passwordHash: string }>(
        'SELECT "passwordHash" FROM app_users WHERE id=$1',
        ["user-b"],
      )
    )[0];
    assert.equal(app.verifyPassword(password, resetUser.passwordHash), false);
    checks++;
    assert.equal(
      app.verifyPassword(
        "New-disposable-password-2598",
        resetUser.passwordHash,
      ),
      true,
    );
    checks++;
    select("admin");
    const listed = await (
      await app.listAccountUsers(
        new Request(
          `${base}/api/admin/users?q=Updated&role=DIETITIAN&selected=user-b`,
        ),
      )
    ).json();
    assert.equal(listed.total, 1);
    checks++;
    assert.ok(listed.activity.length >= 3);
    checks++;
    assert.equal(JSON.stringify(listed).includes("passwordHash"), false);
    checks++;
    select("user-a");
    await manage("password", {
      currentPassword: password,
      password: "Changed-fixture-password-2598",
    });
    assert.equal(await app.getSessionUser(), null);
    checks++;
    assert.equal(
      (
        await app.fixtureQuery<{ count: number }>(
          'SELECT count(*)::int AS count FROM nutrition_oauth_tokens WHERE "userId"=$1 AND "revokedAt" IS NULL',
          ["user-a"],
        )
      )[0].count,
      0,
    );
    checks++;
    for (const table of ["app_users", "app_sessions", "data_change_logs"]) {
      const privileges = (
        await app.fixtureQuery<{
          rls: boolean;
          anon: boolean;
          authenticated: boolean;
        }>(
          `SELECT relrowsecurity AS rls,has_table_privilege('anon',oid,'SELECT') AS anon,has_table_privilege('authenticated',oid,'SELECT') AS authenticated FROM pg_class WHERE oid=$1::regclass`,
          [table],
        )
      )[0];
      assert.deepEqual(privileges, {
        rls: true,
        anon: false,
        authenticated: false,
      });
      checks++;
    }
    console.log(
      `Account management: ${checks} checks passed. Real auth helpers + account/OAuth services + disposable PostgreSQL migrations; no production accounts touched.`,
    );
  } finally {
    await api?.closeOAuthFixture();
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    await removeNutritionFixtureDirectory(
      directory,
      "nutrition-account-fixture-",
    );
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "ACCOUNT_TEST_FAILED");
  process.exitCode = 1;
});
