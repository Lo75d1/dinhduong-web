// Disposable WASM PostgreSQL fixture: exercises real migration and SQL, while replacing
// Prisma and browser sessions. It cannot prove multi-process advisory lock behavior.
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;
type Args = { where?: Where; data?: Row; select?: Row; include?: Row; orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[]; take?: number; skip?: number };
type Executor = { query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> };
type FixtureModel = {
  findMany(args?: Args): Promise<Row[]>; findUnique(args: Args): Promise<Row | null>; findUniqueOrThrow(args: Args): Promise<Row>; findFirst(args: Args): Promise<Row | null>;
  count(args: Args): Promise<number>; create(args: Args): Promise<Row | null>; update(args: Args): Promise<Row | null>;
  updateMany(args: Args): Promise<{ count: number }>; deleteMany(args: Args): Promise<{ count: number }>;
};
type FixturePrisma = {
  user: FixtureModel; session: FixtureModel; patient: FixtureModel; dataChangeLog: FixtureModel;
  personalFood: FixtureModel; personalDish: FixtureModel;
  menuLibraryTemplate: FixtureModel; menuLibraryVersion: FixtureModel; menuLibraryGrant: FixtureModel; menuLibraryReview: FixtureModel;
  food: FixtureModel; dish: FixtureModel; dietCode: FixtureModel;
  nutritionOAuthClient: FixtureModel; nutritionOAuthCode: FixtureModel; nutritionOAuthToken: FixtureModel; nutritionApiWindow: FixtureModel; ration: FixtureModel;
  $queryRaw<T>(parts: TemplateStringsArray | { text: string; values: unknown[] }, ...values: unknown[]): Promise<T[]>;
  $transaction<T>(callback: (tx: FixturePrisma) => Promise<T>): Promise<T>;
};
let database: PGlite;
let workbookBusy = false;
export const fixtureApplicationRole = "nutrition_fixture_application";
export const fixturePrivateTables = ["rations", "nutrition_oauth_clients", "nutrition_oauth_codes", "nutrition_oauth_tokens", "nutrition_api_windows"];
export type FixtureTablePrivileges = { role: string; table: string; select: boolean; insert: boolean; update: boolean; delete: boolean; truncate: boolean; references: boolean; trigger: boolean; maintain: boolean };
let beforePrivateAccess: FixtureTablePrivileges[] = [];
export function fixturePrivilegesBeforePrivateAccess() { return beforePrivateAccess; }
export async function fixturePrivateTablePrivileges() {
  return (await database.query<FixtureTablePrivileges>(`SELECT r.rolname AS role, c.relname AS table,
    has_table_privilege(r.oid, c.oid, 'SELECT') AS select, has_table_privilege(r.oid, c.oid, 'INSERT') AS insert,
    has_table_privilege(r.oid, c.oid, 'UPDATE') AS update, has_table_privilege(r.oid, c.oid, 'DELETE') AS delete,
    has_table_privilege(r.oid, c.oid, 'TRUNCATE') AS truncate, has_table_privilege(r.oid, c.oid, 'REFERENCES') AS references,
    has_table_privilege(r.oid, c.oid, 'TRIGGER') AS trigger, has_table_privilege(r.oid, c.oid, 'MAINTAIN') AS maintain
    FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
      AND r.rolname IN ('anon', 'authenticated', 'nutrition_fixture_public_probe')
    ORDER BY r.rolname, c.relname`, [fixturePrivateTables])).rows;
}
export function setFixtureWorkbookBusy(value: boolean) { workbookBusy = value; }
const base: Executor = { query: <T>(sql: string, params?: unknown[]) => database.query<T>(sql, params) };

function name(value: string) {
  if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(value)) throw new Error("Invalid fixture SQL identifier");
  return `"${value}"`;
}
function whereSql(where: Where | undefined, parameters: unknown[]): string {
  if (!where || !Object.keys(where).length) return "TRUE";
  const bind = (value: unknown) => { parameters.push(value); return `$${parameters.length}`; };
  return Object.entries(where).map(([key, value]) => {
    if (key === "OR" || key === "AND") return `(${(value as Where[]).map(part => whereSql(part, parameters)).join(key === "OR" ? " OR " : " AND ")})`;
    if (key === "ownerId_conversationRequestKey") return `(${whereSql(value as Where, parameters)})`;
    const column = name(key);
    if (key === "client") return `EXISTS (SELECT 1 FROM nutrition_oauth_clients WHERE id = "clientId" AND ${whereSql(value as Where, parameters)})`;
    if (key === "tokens") return `EXISTS (SELECT 1 FROM nutrition_oauth_tokens WHERE "clientId" = nutrition_oauth_clients.id AND ${whereSql((value as {some:Where}).some, parameters)})`;
    if (value === null) return `${column} IS NULL`;
    if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      const filter = value as Row;
      if (Array.isArray(filter.path) && Object.hasOwn(filter, "equals")) {
        return `(${column} #> ${bind(filter.path)}::text[]) = ${bind(JSON.stringify(filter.equals))}::jsonb`;
      }
      if (Array.isArray(filter.path) && typeof filter.string_contains === "string") {
        const jsonText = `(${column} #>> ${bind(filter.path)}::text[])`;
        const pattern = '%' + filter.string_contains.replace(/[\\%_]/g, '\\$&') + '%';
        return `${jsonText} ${filter.mode === "insensitive" ? "ILIKE" : "LIKE"} ${bind(pattern)}`;
      }
      return Object.entries(value as Row).map(([operator, operand]) => {
        if (operator === "mode") return "TRUE";
        if (operator === "contains") return `${column} ILIKE ${bind('%' + String(operand).replace(/[\\%_]/g, '\\$&') + '%')}`;
        if (operator === "not" && operand === null) return `${column} IS NOT NULL`;
        if (operator === "in") return (operand as unknown[]).length ? `${column} = ANY(${bind(operand)})` : "FALSE";
        const symbol = { gt: ">", lt: "<", gte: ">=", lte: "<=", not: "<>" }[operator];
        if (!symbol) throw new Error(`Unsupported fixture operator ${operator}`);
        return `${column} ${symbol} ${bind(operand)}`;
      }).join(" AND ");
    }
    return `${column} = ${bind(value)}`;
  }).join(" AND ");
}

function fixture(executor: Executor): FixturePrisma {
  const source = executor;
  // Match Prisma's UTC datetime encoding. PGlite otherwise formats JS Date parameters
  // using the Windows local timezone while our schema uses timestamp without timezone.
  executor = { query: <T>(sql: string, params?: unknown[]) => source.query<T>(sql, params?.map(value => value instanceof Date ? value.toISOString() : value)) };
  function model(table: string): FixtureModel {
    function updateValues(data: Row) {
      return Object.entries(data).map(([key, value]) => {
        if (value && typeof value === "object" && "increment" in value) return value.increment;
        if (["conversationJson", "profileJson", "beforeJson", "afterJson", "content", "document", "analysis"].includes(key) && value !== null) return JSON.stringify(value);
        return value;
      });
    }
    function updateSets(data: Row) {
      return Object.entries(data).map(([key, value], i) => `${name(key)} = ${value && typeof value === "object" && "increment" in value ? name(key) + " + " : ""}$${i + 1}`).join(",");
    }
    async function project(row: Row | undefined, args: Args): Promise<Row | null> {
      if (!row) return null;
      const result = { ...row };
      if (args.include?.client || (args.select?.client && typeof args.select.client === "object")) {
        result.client = (await executor.query<Row>('SELECT * FROM "nutrition_oauth_clients" WHERE "id" = $1', [row.clientId])).rows[0];
      }
      if (args.include?.user || args.select?.user) result.user = (await executor.query<Row>('SELECT * FROM "app_users" WHERE "id" = $1', [row.userId])).rows[0];
      if (!args.select) return result;
      if (args.select?._count) {
        result._count = {};
        const relations = { rations: ["rations", "ownerId"], patients: ["patients", "ownerId"], sessions: ["app_sessions", "userId"], nutritionOAuthTokens: ["nutrition_oauth_tokens", "userId"] };
        for (const [relation, config] of Object.entries((args.select._count as { select: Row }).select)) {
          const [relatedTable, foreignKey] = relations[relation as keyof typeof relations];
          const values: unknown[] = [];
          const where = { [foreignKey]: row.id, ...(typeof config === "object" && config ? (config as { where?: Where }).where : {}) };
          (result._count as Row)[relation] = Number((await executor.query<{ count: number }>(`SELECT count(*) AS count FROM ${name(relatedTable)} WHERE ${whereSql(where, values)}`, values)).rows[0].count);
        }
      }
      return Object.fromEntries(Object.entries(args.select).filter(([, value]) => !!value).map(([key]) => [key, result[key]]));
    }
    async function findMany(args: Args = {}): Promise<Row[]> {
      const values: unknown[] = [];
      const orders = args.orderBy ? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]) : [];
      const order = orders.length ? " ORDER BY " + orders.flatMap(part => Object.entries(part).map(([key, direction]) => `${name(key)} ${direction.toUpperCase()}`)).join(", ") : "";
      const limit = args.take ? ` LIMIT ${Math.min(1000, args.take)}` : "";
      const offset = args.skip ? ` OFFSET ${Math.min(1000, args.skip)}` : "";
      const rows = (await executor.query<Row>(`SELECT * FROM ${name(table)} WHERE ${whereSql(args.where, values)}${order}${limit}${offset}`, values)).rows;
      return Promise.all(rows.map(async row => (await project(row, args))!));
    }
    return {
      findMany,
      findUnique: async (args: Args) => (await findMany({ ...args, take: 1 }))[0] ?? null,
      findUniqueOrThrow: async (args: Args) => {
        const row = (await findMany({ ...args, take: 1 }))[0];
        if (!row) throw Object.assign(new Error("Fixture missing record"), { code: "P2025" });
        return row;
      },
      findFirst: async (args: Args) => (await findMany({ ...args, take: 1 }))[0] ?? null,
      count: async (args: Args) => {
        const values: unknown[] = [];
        return Number((await executor.query<{ count: number }>(`SELECT count(*) AS count FROM ${name(table)} WHERE ${whereSql(args.where, values)}`, values)).rows[0].count);
      },
      create: async (args: Args) => {
        const data = { id: randomUUID(), ...(["personal_foods", "personal_dishes", "menu_library_templates"].includes(table) ? { updatedAt: new Date() } : {}), ...args.data };
        const columns = Object.keys(data);
        try {
          const row = (await executor.query<Row>(`INSERT INTO ${name(table)} (${columns.map(name).join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`, updateValues(data))).rows[0];
          return project(row, args);
        } catch (error) {
          if (error && typeof error === "object" && "code" in error && error.code === "23505") throw Object.assign(new Error("Fixture duplicate key"), { code: "P2002" });
          throw error;
        }
      },
      update: async (args: Args) => {
        const values = updateValues(args.data ?? {});
        const sets = updateSets(args.data ?? {});
        const row = (await executor.query<Row>(`UPDATE ${name(table)} SET ${sets} WHERE ${whereSql(args.where, values)} RETURNING *`, values)).rows[0];
        return project(row, args);
      },
      updateMany: async (args: Args) => {
        const values = updateValues(args.data ?? {});
        const sets = updateSets(args.data ?? {});
        return { count: (await executor.query<Row>(`UPDATE ${name(table)} SET ${sets} WHERE ${whereSql(args.where, values)} RETURNING *`, values)).rows.length };
      },
      deleteMany: async (args: Args) => {
        const values: unknown[] = [];
        return { count: (await executor.query<Row>(`DELETE FROM ${name(table)} WHERE ${whereSql(args.where, values)} RETURNING *`, values)).rows.length };
      },
    };
  }
  function raw<T>(parts: TemplateStringsArray | { text: string; values: unknown[] }, ...values: unknown[]) {
    if ("text" in parts) return executor.query<T>(parts.text, parts.values).then(result => result.rows);
    const sql = parts.reduce((text, part, i) => text + part + (i < values.length ? `$${i + 1}` : ""), "");
    // Explicitly substituted contention response: single-backend PGlite cannot hold a
    // conflicting advisory lock from an independent PostgreSQL worker.
    if (workbookBusy && sql.includes("pg_try_advisory_xact_lock") && sql.includes("nutrition-chat-workbook-v1")) {
      return Promise.resolve([{ acquired: false }] as unknown as T[]);
    }
    return executor.query<T>(sql, values).then(result => result.rows);
  }
  return {
    user: model("app_users"), session: model("app_sessions"), patient: model("patients"), dataChangeLog: model("data_change_logs"),
    personalFood: model("personal_foods"), personalDish: model("personal_dishes"),
    menuLibraryTemplate: model("menu_library_templates"), menuLibraryVersion: model("menu_library_versions"), menuLibraryGrant: model("menu_library_grants"),
    menuLibraryReview: model("menu_library_reviews"),
    food: model("foods"), dish: model("dishes"), dietCode: model("diet_codes"),
    nutritionOAuthClient: model("nutrition_oauth_clients"), nutritionOAuthCode: model("nutrition_oauth_codes"),
    nutritionOAuthToken: model("nutrition_oauth_tokens"), nutritionApiWindow: model("nutrition_api_windows"),
    ration: model("rations"),
    $queryRaw: raw,
    $transaction: <T>(callback: (tx: FixturePrisma) => Promise<T>) => database.transaction(tx => callback(fixture(tx))),
  };
}
export const prisma = fixture(base);
export async function initializeOAuthFixture(migrationPath: string) {
  database = new PGlite({ parsers: { 1114: (value: string) => new Date(value.replace(" ", "T") + "Z") } });
  await database.exec("SET TIME ZONE 'UTC'");
  // Reproduce Supabase's permissive table defaults before applying the private
  // migration. All subsequent application tests use a non-superuser table owner
  // with BYPASSRLS, matching the separately verified production application role.
  await database.exec(`CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE nutrition_fixture_public_probe NOLOGIN;
    CREATE ROLE nutrition_fixture_rls_probe NOLOGIN;
    CREATE ROLE nutrition_fixture_application NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO PUBLIC;
    GRANT CREATE ON SCHEMA public TO nutrition_fixture_application;
    SET ROLE nutrition_fixture_application;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO PUBLIC, anon, authenticated;`);
  await database.exec(`CREATE TABLE "app_users" ("id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL DEFAULT md5(random()::text), "displayName" TEXT NOT NULL DEFAULT 'Fixture', "passwordHash" TEXT NOT NULL DEFAULT 'fixture', "role" TEXT NOT NULL DEFAULT 'CLINICIAN', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "app_sessions" ("id" TEXT PRIMARY KEY, "tokenHash" TEXT UNIQUE NOT NULL, "userId" TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "patients" ("id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL);
    CREATE TABLE "data_change_logs" ("id" TEXT PRIMARY KEY, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "beforeJson" JSONB, "afterJson" JSONB, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "rations" ("id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "title" TEXT NOT NULL DEFAULT 'Fixture', "patientId" TEXT,
      "profileJson" JSONB, "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO "app_users"("id") VALUES ('user-a'), ('user-b');
    CREATE TABLE "site_settings" ("id" TEXT PRIMARY KEY, "contactName" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO "site_settings"("id", "contactName") VALUES ('public', 'Existing fixture contact');`);
  await database.exec(await readFile(migrationPath, "utf8"));
  beforePrivateAccess = await fixturePrivateTablePrivileges();
  await database.exec(await readFile(join(dirname(dirname(migrationPath)), "20261014213000_nutrition_chat_private_access", "migration.sql"), "utf8"));
  await database.exec(await readFile(join(dirname(dirname(migrationPath)), "20261014230000_nutrition_connection_counts", "migration.sql"), "utf8"));
  await database.exec(await readFile(join(dirname(dirname(migrationPath)), "20261015100000_account_management", "migration.sql"), "utf8"));
}
export async function fixtureQuery<T = Row>(sql: string, parameters?: unknown[]) { return (await database.query<T>(sql, parameters?.map(value => value instanceof Date ? value.toISOString() : value))).rows; }
export async function applyFixtureMigration(path: string) { await database.exec(await readFile(path, "utf8")); }
export async function closeOAuthFixture() { if (database) await database.close(); }
