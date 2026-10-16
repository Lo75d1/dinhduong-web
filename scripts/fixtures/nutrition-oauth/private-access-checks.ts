import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type * as Database from "./database";

type TableSecurity = { table: string; rls: boolean; force: boolean; owner: string; policies: number };
const denied = (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === "42501";

// Actual PostgreSQL role/ACL/RLS checks, independent of the Prisma adapter. All
// roles and rows exist only inside the disposable PGlite database.
export async function verifyFixturePrivateAccess(api: typeof Database, migrationPath: string) {
  let checks = 0;
  const before = api.fixturePrivilegesBeforePrivateAccess();
  const after = await api.fixturePrivateTablePrivileges();
  assert.equal(before.length, 15); checks++;
  assert.equal(after.length, 15); checks++;
  for (const row of before) {
    assert.ok(Object.entries(row).filter(([key]) => key !== "role" && key !== "table").every(([, value]) => value === true)); checks++;
  }
  for (const row of after) {
    assert.ok(Object.entries(row).filter(([key]) => key !== "role" && key !== "table").every(([, value]) => value === false)); checks++;
  }
  const security = await api.fixtureQuery<TableSecurity>(`SELECT c.relname AS table, c.relrowsecurity AS rls,
    c.relforcerowsecurity AS force, r.rolname AS owner, (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_roles r ON r.oid = c.relowner
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) ORDER BY c.relname`, [api.fixturePrivateTables]);
  assert.equal(security.length, 5); checks++;
  for (const row of security) {
    assert.deepEqual(row, { table: row.table, rls: true, force: false, owner: api.fixtureApplicationRole, policies: 0 }); checks++;
  }
  const [application] = await api.fixtureQuery<{ role: string; superuser: boolean; bypass: boolean }>(`SELECT rolname AS role,
    rolsuper AS superuser, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`);
  assert.deepEqual(application, { role: api.fixtureApplicationRole, superuser: false, bypass: true }); checks++;

  const rows = [
    { table: "rations", key: "id", id: "acl-ration", insert: 'INSERT INTO "rations" ("id","ownerId","title") VALUES ($1,\'user-a\',\'Private fixture\')', values: [] as unknown[], update: '"title" = \'Private updated\'' },
    { table: "nutrition_oauth_clients", key: "id", id: "acl-client", insert: 'INSERT INTO "nutrition_oauth_clients" ("id","name","redirectUris","scopes","expiresAt") VALUES ($1,\'Private fixture\',ARRAY[\'https://claude.ai/api/mcp/auth_callback\'],ARRAY[\'nutrition:read\'],CURRENT_TIMESTAMP + INTERVAL \'1 day\')', values: [] as unknown[], update: '"name" = \'Private updated\'' },
    { table: "nutrition_oauth_codes", key: "id", id: "acl-code", insert: 'INSERT INTO "nutrition_oauth_codes" ("id","codeHash","interactionId","userId","clientId","redirectUri","codeChallenge","scopes","issuer","audience","expiresAt") VALUES ($1,$1,$1,\'user-a\',\'acl-client\',\'https://claude.ai/api/mcp/auth_callback\',\'disposable-challenge\',ARRAY[\'nutrition:read\'],\'https://dinhduong2598.food\',\'https://dinhduong2598.food/api/nutrition/v1/mcp\',CURRENT_TIMESTAMP + INTERVAL \'2 minutes\')', values: [] as unknown[], update: '"usedAt" = CURRENT_TIMESTAMP' },
    { table: "nutrition_oauth_tokens", key: "id", id: "acl-token", insert: 'INSERT INTO "nutrition_oauth_tokens" ("id","familyId","userId","clientId","accessHash","refreshHash","scopes","issuer","audience","accessExpiresAt","refreshExpiresAt") VALUES ($1,$1,\'user-a\',\'acl-client\',$1,$1,ARRAY[\'nutrition:read\'],\'https://dinhduong2598.food\',\'https://dinhduong2598.food/api/nutrition/v1/mcp\',CURRENT_TIMESTAMP + INTERVAL \'15 minutes\',CURRENT_TIMESTAMP + INTERVAL \'1 day\')', values: [] as unknown[], update: '"revokedAt" = CURRENT_TIMESTAMP' },
    { table: "nutrition_api_windows", key: "key", id: "acl-window", insert: 'INSERT INTO "nutrition_api_windows" ("key","count","windowStart","expiresAt") VALUES ($1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL \'1 minute\')', values: [] as unknown[], update: '"count" = "count" + 1' },
  ];
  for (const row of rows) {
    await api.fixtureQuery(row.insert, [row.id, ...row.values]); checks++;
    assert.equal((await api.fixtureQuery(`SELECT * FROM "${row.table}" WHERE "${row.key}" = $1`, [row.id])).length, 1); checks++;
    assert.equal((await api.fixtureQuery(`UPDATE "${row.table}" SET ${row.update} WHERE "${row.key}" = $1 RETURNING "${row.key}"`, [row.id])).length, 1); checks++;
  }
  async function role(name: string, action: () => Promise<void>) {
    assert.ok(/^[a-z_]+$/.test(name));
    await api.fixtureQuery(`SET ROLE "${name}"`);
    try { await action(); } finally { await api.fixtureQuery(`SET ROLE "${api.fixtureApplicationRole}"`); }
  }
  for (const name of ["anon", "authenticated", "nutrition_fixture_public_probe"]) {
    await role(name, async () => {
      for (const row of rows) {
        await assert.rejects(() => api.fixtureQuery(`SELECT * FROM "${row.table}" LIMIT 1`), denied); checks++;
        await assert.rejects(() => api.fixtureQuery(row.insert, [`${row.id}-blocked`, ...row.values]), denied); checks++;
        await assert.rejects(() => api.fixtureQuery(`UPDATE "${row.table}" SET ${row.update}`), denied); checks++;
        await assert.rejects(() => api.fixtureQuery(`DELETE FROM "${row.table}"`), denied); checks++;
      }
    });
  }
  // Distinguish ACL protection from RLS: even a separate ordinary role granted
  // SELECT/INSERT sees zero private rows and cannot insert without an RLS policy.
  await api.fixtureQuery(`GRANT SELECT, INSERT ON TABLE ${api.fixturePrivateTables.map(table => `"${table}"`).join(",")} TO nutrition_fixture_rls_probe`);
  await role("nutrition_fixture_rls_probe", async () => {
    for (const row of rows) {
      assert.equal((await api.fixtureQuery(`SELECT * FROM "${row.table}"`)).length, 0); checks++;
      await assert.rejects(() => api.fixtureQuery(row.insert, [`${row.id}-rls-blocked`, ...row.values]), error => denied(error) && error instanceof Error && /row-level security/.test(error.message)); checks++;
    }
  });
  await api.fixtureQuery(`REVOKE ALL PRIVILEGES ON TABLE ${api.fixturePrivateTables.map(table => `"${table}"`).join(",")} FROM nutrition_fixture_rls_probe`);
  for (const row of [...rows].reverse()) {
    assert.equal((await api.fixtureQuery(`DELETE FROM "${row.table}" WHERE "${row.key}" = $1 RETURNING "${row.key}"`, [row.id])).length, 1); checks++;
  }
  // The account-management migration now closes the separately recorded legacy exposure.
  const [users] = await api.fixtureQuery<{ rls: boolean; anon: boolean; authenticated: boolean }>(`SELECT relrowsecurity AS rls,
    has_table_privilege('anon', oid, 'SELECT') AS anon, has_table_privilege('authenticated', oid, 'SELECT') AS authenticated
    FROM pg_class WHERE oid = 'public.app_users'::regclass`);
  assert.deepEqual(users, { rls: true, anon: false, authenticated: false }); checks++;
  await api.fixtureQuery('CREATE TABLE "nutrition_fixture_default_acl_probe" ("id" TEXT)');
  const [defaults] = await api.fixtureQuery<{ anon: boolean; authenticated: boolean; public: boolean }>(`SELECT
    has_table_privilege('anon', 'public.nutrition_fixture_default_acl_probe', 'SELECT') AS anon,
    has_table_privilege('authenticated', 'public.nutrition_fixture_default_acl_probe', 'SELECT') AS authenticated,
    has_table_privilege('nutrition_fixture_public_probe', 'public.nutrition_fixture_default_acl_probe', 'SELECT') AS public`);
  assert.deepEqual(defaults, { anon: true, authenticated: true, public: true }); checks++;
  await api.fixtureQuery('DROP TABLE "nutrition_fixture_default_acl_probe"');

  const portable = new PGlite();
  try {
    await portable.exec('CREATE TABLE "app_users" ("id" TEXT PRIMARY KEY); CREATE TABLE "rations" ("id" TEXT PRIMARY KEY, "ownerId" TEXT);');
    await portable.exec(await readFile(migrationPath, "utf8"));
    const absent = (await portable.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_roles WHERE rolname IN ('anon','authenticated')")).rows[0].count;
    assert.equal(absent, 0); checks++;
    await portable.exec(await readFile(join(dirname(dirname(migrationPath)), "20261014213000_nutrition_chat_private_access", "migration.sql"), "utf8"));
    const protectedTables = (await portable.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_class WHERE relname = ANY($1::text[]) AND relrowsecurity AND NOT relforcerowsecurity", [api.fixturePrivateTables])).rows[0].count;
    assert.equal(protectedTables, 5); checks++;
  } finally { await portable.close(); }
  return { checks, before, after, security, application, plainPostgresWithoutSupabaseRoles: "passed", preexistingAppUsersExposure: "closed by account-management migration" };
}
