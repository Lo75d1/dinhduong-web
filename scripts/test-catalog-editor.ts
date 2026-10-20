import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type * as Service from "../src/lib/catalog-editor/service";
import type * as Auth from "../src/lib/catalog-editor/auth";
import type * as Db from "./fixtures/nutrition-oauth/database";
import type * as Session from "../src/lib/auth";
import type * as Routes from "../src/app/api/catalog-editor/[...path]/route";
import type {
  CatalogBatch,
  CatalogFood,
} from "../src/lib/catalog-editor/contracts";
type Runtime = typeof Service &
  typeof Auth &
  typeof Db &
  typeof Session & {
    fixtureCookies: Map<string, string>;
    routes: typeof Routes;
    legacy: Array<() => Promise<Response>>;
  };
let checks = 0,
  requests = 0;
const eq = (actual: unknown, expected: unknown, label?: string) => {
  assert.deepEqual(actual, expected, label);
  checks++;
};
const ok = (value: unknown, label?: string) => {
  assert.ok(value, label);
  checks++;
};
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "catalog-editor-test-")),
    require = createRequire(import.meta.url);
  const savedUrl = process.env.NUTRITION_PUBLIC_URL;
  let app: Runtime | undefined;
  try {
    process.env.NUTRITION_PUBLIC_URL = "https://dinhduong2598.food";
    const outfile = join(directory, "catalog.cjs");
    const source = (p: string) => JSON.stringify(resolve(p));
    await build({
      stdin: {
        contents: [
          "export * from " + source("src/lib/catalog-editor/service.ts") + ";",
          "export * from " + source("src/lib/catalog-editor/auth.ts") + ";",
          "export * from " + source("src/lib/auth.ts") + ";",
          "export * from " +
            source("scripts/fixtures/nutrition-oauth/database.ts") +
            ";",
          "export {fixtureCookies} from " +
            source("scripts/fixtures/nutrition-oauth/state.ts") +
            ";",
          "export * as routes from " +
            source("src/app/api/catalog-editor/[...path]/route.ts") +
            ";",
          "import {PATCH as legacyFood} from " +
            source("src/app/api/admin/data/foods/[id]/route.ts") +
            ";",
          "import {POST as legacyPrice} from " +
            source("src/app/api/admin/data/foods/[id]/prices/route.ts") +
            ";",
          "import {PATCH as legacyPriceUpdate,DELETE as legacyDelete} from " +
            source(
              "src/app/api/admin/data/foods/[id]/prices/[priceId]/route.ts",
            ) +
            ";",
          "import {POST as legacyClassify} from " +
            source("src/app/api/admin/data/bulk-classify/route.ts") +
            ";",
          "import {POST as legacyImage} from " +
            source("src/app/api/admin/data/images/commit/route.ts") +
            ";",
          "import {POST as legacyRni} from " +
            source("src/app/api/admin/data/images/rni-commit/route.ts") +
            ";",
          "export const legacy=[legacyFood,legacyPrice,legacyPriceUpdate,legacyDelete,legacyClassify,legacyImage,legacyRni];",
        ].join("\n"),
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
          name: "catalog-fixture",
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
    app = require(outfile) as Runtime;
    const api = app;
    await api.initializeOAuthFixture(
      resolve(
        "prisma/migrations/20261014090000_nutrition_chat_oauth/migration.sql",
      ),
    );
    await api.fixtureQuery(
      `UPDATE app_users SET role='EDITOR' WHERE id='user-a'`,
    );
    await api.fixtureQuery(
      `INSERT INTO app_users(id,role,email,"displayName") VALUES ('admin','ADMIN','admin@example.invalid','Admin fixture')`,
    );
    await api.fixtureQuery(
      `CREATE TABLE foods(id TEXT PRIMARY KEY,name TEXT NOT NULL,"nameNormalized" TEXT NOT NULL,source TEXT NOT NULL,"sourceCode" TEXT,unit TEXT NOT NULL,"updatedAt" TIMESTAMP(3) NOT NULL,"foodType" TEXT,"foodGroup" TEXT,"proteinOrigin" TEXT,"imageUrl" TEXT,"imageSourceUrl" TEXT,"energyKcal" DOUBLE PRECISION,"proteinG" DOUBLE PRECISION,"lipidG" DOUBLE PRECISION,"glucidG" DOUBLE PRECISION,"wastePercent" DOUBLE PRECISION,"giLevel" INTEGER,"purinLevel" INTEGER,"cholesterolLevel" INTEGER)`,
    );
    await api.fixtureQuery(
      `CREATE TABLE food_prices(id TEXT PRIMARY KEY,"foodId" TEXT NOT NULL REFERENCES foods(id),region TEXT,"amountVnd" DOUBLE PRECISION NOT NULL,basis TEXT NOT NULL,"packG" DOUBLE PRECISION,source TEXT,"sourceUrl" TEXT,note TEXT,"asOfDate" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL)`,
    );
    await api.fixtureQuery(
      `INSERT INTO foods(id,name,"nameNormalized",source,"sourceCode",unit,"updatedAt","energyKcal","proteinG","lipidG","glucidG","wastePercent","purinLevel") VALUES ('food-001','Gạo kỹ thuật','gao ky thuat','RNI','SOURCE-1','g','2026-01-01',123,NULL,0,70,5,1),('food-002','Rau kỹ thuật','rau ky thuat','VDD','SOURCE-2','g','2026-01-01',20,2,NULL,3,NULL,NULL)`,
    );
    await api.fixtureQuery(
      `INSERT INTO food_prices(id,"foodId","amountVnd",basis,source,"asOfDate","updatedAt") VALUES ('price-1','food-001',10000,'per_kg','Nguồn cũ','2000-01-01','2026-01-01')`,
    );
    const original = await api.fixtureQuery(`SELECT * FROM foods ORDER BY id`);
    await api.applyFixtureMigration(
      resolve("prisma/migrations/20261020010000_catalog_editor/migration.sql"),
    );
    const protectedColumns =
      'id,name,source,"sourceCode",unit,"energyKcal","proteinG","lipidG","glucidG","wastePercent","giLevel","purinLevel","cholesterolLevel"';
    const immutableBefore = await api.fixtureQuery(
      `SELECT ${protectedColumns} FROM foods ORDER BY id`,
    );
    eq(
      immutableBefore,
      original.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key]) =>
            [
              "id",
              "name",
              "source",
              "sourceCode",
              "unit",
              "energyKcal",
              "proteinG",
              "lipidG",
              "glucidG",
              "wastePercent",
              "giLevel",
              "purinLevel",
              "cholesterolLevel",
            ].includes(key),
          ),
        ),
      ),
      "migration preserves source values",
    );
    for (const table of ["catalog_editor_keys", "catalog_draft_batches"]) {
      const privileges = await api.fixtureQuery<{
        allowed: boolean;
        rls: boolean;
      }>(
        `SELECT has_table_privilege('anon',$1,'SELECT,INSERT,UPDATE,DELETE') AS allowed,(SELECT relrowsecurity FROM pg_class WHERE relname=$1) AS rls`,
        [table],
      );
      eq(
        privileges[0],
        { allowed: false, rls: true },
        "private table ACL and RLS",
      );
      for (const role of ["authenticated", "nutrition_fixture_public_probe"])
        eq(
          (
            await api.fixtureQuery<{ allowed: boolean }>(
              `SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed`,
              [role, table],
            )
          )[0].allowed,
          false,
        );
    }
    const cookies = new Map<string, string>();
    for (const user of ["admin", "user-a", "user-b"]) {
      await api.createSession(user);
      cookies.set(user, api.fixtureCookies.get(api.SESSION_COOKIE)!);
    }
    type Credentials = {
      user?: string | null;
      key?: string;
      origin?: string | null;
      raw?: string;
      contentType?: string;
    };
    async function call(
      method: "GET" | "POST" | "PATCH",
      path: string,
      body?: unknown,
      credentials: Credentials = {},
    ) {
      requests++;
      api.fixtureCookies.clear();
      const user = credentials.user === undefined ? "admin" : credentials.user;
      if (user) api.fixtureCookies.set(api.SESSION_COOKIE, cookies.get(user)!);
      const headers: Record<string, string> = {};
      if (credentials.key) headers.authorization = "Bearer " + credentials.key;
      const origin =
        credentials.origin === undefined
          ? process.env.NUTRITION_PUBLIC_URL
          : credentials.origin;
      if (origin) headers.origin = origin;
      if (body !== undefined || credentials.raw !== undefined)
        headers["content-type"] = credentials.contentType ?? "application/json";
      const request = new Request(
        process.env.NUTRITION_PUBLIC_URL + "/api/catalog-editor/" + path,
        {
          method,
          headers,
          ...(method === "GET"
            ? {}
            : { body: credentials.raw ?? JSON.stringify(body) }),
        },
      );
      const response = await api.routes[method](request, {
        params: Promise.resolve({ path: path.split("?")[0].split("/") }),
      });
      eq(response.headers.get("cache-control"), "no-store");
      return { status: response.status, data: await response.json(), request };
    }
    async function expect(
      status: number,
      method: "GET" | "POST" | "PATCH",
      path: string,
      body?: unknown,
      credentials?: Credentials,
    ) {
      const result = await call(method, path, body, credentials);
      eq(result.status, status, JSON.stringify({ path, result: result.data }));
      return result.data;
    }
    await expect(401, "GET", "foods", undefined, { user: null });
    await expect(403, "GET", "foods", undefined, { user: "user-b" });
    await expect(
      403,
      "POST",
      "batches",
      { title: "CSRF", requestKey: "csrf" },
      { origin: "https://other.example" },
    );
    await expect(
      403,
      "POST",
      "batches",
      { title: "CSRF", requestKey: "csrf" },
      { origin: null },
    );
    const workflow = await expect(200, "GET", "workflow", undefined, {
      user: "user-a",
    });
    ok(workflow.locked.includes("nutrients"));
    ok(workflow.locked.includes("delete"));
    eq(workflow.classification.version, "food-groups-2598-v1");
    await expect(
      403,
      "POST",
      "keys",
      { label: "Forbidden", validDays: 7 },
      { user: "user-a" },
    );
    await expect(400, "POST", "keys", {
      label: "Bad scope",
      validDays: 7,
      scope: "publish",
    });
    await expect(400, "POST", "keys", { label: "Too long", validDays: 31 });
    const mint = await expect(201, "POST", "keys", {
      label: "AI fixture 1",
      validDays: 7,
    });
    ok(/^ce1_[A-Za-z0-9_-]{43}$/.test(mint.token));
    const mint2 = await expect(201, "POST", "keys", {
      label: "AI fixture 2",
      validDays: 7,
    });
    const key = { user: null, key: mint.token, origin: null };
    const key2 = { user: null, key: mint2.token, origin: null };
    const stored = (
      await api.fixtureQuery<{ tokenHash: string }>(
        'SELECT "tokenHash" FROM catalog_editor_keys WHERE id=$1',
        [mint.key.id],
      )
    )[0];
    ok(stored.tokenHash !== mint.token);
    eq(stored.tokenHash, api.keyHash(mint.token));
    const listed = await expect(200, "GET", "keys");
    ok(!JSON.stringify(listed).includes("tokenHash"));
    ok(!JSON.stringify(listed).includes(mint.token));
    await expect(401, "GET", "keys", undefined, key);
    await expect(401, "GET", "foods", undefined, { key: "wrong" });
    await expect(403, "GET", "foods", undefined, {
      ...key,
      origin: "https://other.example",
    });
    const foods = (await expect(200, "GET", "foods", undefined, key))
      .items as CatalogFood[];
    eq(foods.length, 2);
    eq(
      (await expect(200, "GET", "foods?missing=image", undefined, key)).items
        .length,
      2,
    );
    eq(
      (await expect(200, "GET", "foods?missing=price", undefined, key)).items
        .length,
      1,
    );
    eq(
      (await expect(200, "GET", "foods?q=gao", undefined, key)).items[0].id,
      "food-001",
    );
    await expect(400, "GET", "foods?missing=nutrient", undefined, key);
    const created = await expect(
      201,
      "POST",
      "batches",
      { title: "Đợt AI kiểm thử", requestKey: "batch-one" },
      key,
    );
    let b = created.batch as CatalogBatch;
    eq(
      (
        await expect(
          201,
          "POST",
          "batches",
          { title: b.title, requestKey: "batch-one" },
          key,
        )
      ).batch.id,
      b.id,
    );
    await expect(
      409,
      "POST",
      "batches",
      { title: "Khác", requestKey: "batch-one" },
      key,
    );
    await expect(404, "GET", `batches/${b.id}`, undefined, key2);
    eq((await expect(200, "GET", "batches", undefined, key2)).items.length, 0);
    eq(
      (
        await expect(200, "GET", `batches/${b.id}`, undefined, {
          user: "user-a",
        })
      ).canPublish,
      false,
      "staff can open the common draft queue",
    );
    const proposal = {
      foodId: foods[0].id,
      expectedUpdatedAt: foods[0].updatedAt,
      reason: "Kiểm thử nguồn, phân loại và quyền ảnh",
      classification: { foodGroup: "Nhóm lương thực" },
      prices: [
        {
          region: "Trung",
          amountVnd: 22000,
          basis: "per_kg",
          packG: null,
          source: "Nguồn kiểm thử",
          sourceUrl: "https://example.org/price",
          asOfDate: "2000-01-01",
          note: "Dữ liệu giả để kiểm thử",
        },
      ],
      image: {
        url: "https://example.org/image.jpg",
        sourceUrl: "https://example.org/source",
        credit: "Tác giả giả lập",
        license: "PERMISSION",
        licenseNote: "Căn cứ giả lập, không đưa lên website",
      },
    };
    const save = (entries: unknown, rev = b.revision) => ({
      title: b.title,
      expectedRevision: rev,
      entries,
    });
    for (const field of [
      "energyKcal",
      "proteinG",
      "lipidG",
      "glucidG",
      "wastePercent",
      "unit",
      "sourceCode",
      "name",
      "giLevel",
      "purinLevel",
      "cholesterolLevel",
      "before",
      "delete",
      "sql",
      "imageCredit",
    ])
      await expect(
        400,
        "PATCH",
        `batches/${b.id}`,
        save([{ ...proposal, [field]: 0 }]),
        key,
      );
    for (const classification of [
      { foodGroup: null },
      { foodGroup: "Bịa nhóm" },
      { giLevel: 0 },
      { foodGroup: "" },
    ])
      await expect(
        400,
        "PATCH",
        `batches/${b.id}`,
        save([{ ...proposal, classification }]),
        key,
      );
    for (const url of [
      "http://example.org/a",
      "https://127.0.0.1/a",
      "https://[::1]/a",
      "https://localhost/a",
      "https://private.internal/a",
      "https://name:pass@example.org/a",
    ])
      await expect(
        400,
        "PATCH",
        `batches/${b.id}`,
        save([{ ...proposal, image: { ...proposal.image, url } }]),
        key,
      );
    for (const p of [
      { ...proposal.prices[0], basis: "per_piece", packG: null },
      { ...proposal.prices[0], asOfDate: "2000-02-30" },
      { ...proposal.prices[0], asOfDate: "2999-01-01" },
      { ...proposal.prices[0], source: "" },
      { ...proposal.prices[0], amountVnd: null },
      { ...proposal.prices[0], id: "foreign-price" },
    ])
      await expect(
        400,
        "PATCH",
        `batches/${b.id}`,
        save([{ ...proposal, prices: [p] }]),
        key,
      );
    await expect(
      400,
      "PATCH",
      `batches/${b.id}`,
      save([proposal, proposal]),
      key,
    );
    await expect(
      400,
      "PATCH",
      `batches/${b.id}`,
      save(
        Array.from({ length: 26 }, (_, i) => ({
          ...proposal,
          foodId: `food-${i}`,
        })),
      ),
      key,
    );
    await expect(
      409,
      "PATCH",
      `batches/${b.id}`,
      save([{ ...proposal, expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }]),
      key,
    );
    await expect(413, "PATCH", `batches/${b.id}`, undefined, {
      ...key,
      raw: JSON.stringify({ padding: "x".repeat(262145) }),
    });
    await expect(415, "PATCH", `batches/${b.id}`, undefined, {
      ...key,
      raw: "{}",
      contentType: "text/plain",
    });
    b = (await expect(200, "PATCH", `batches/${b.id}`, save([proposal]), key))
      .batch;
    eq(b.revision, 2);
    eq(
      await api.fixtureQuery(
        `SELECT ${protectedColumns} FROM foods ORDER BY id`,
      ),
      immutableBefore,
    );
    eq(
      (
        await api.fixtureQuery<{ foodGroup: string | null }>(
          `SELECT "foodGroup" FROM foods WHERE id='food-001'`,
        )
      )[0].foodGroup,
      null,
      "draft does not modify canonical data",
    );
    await expect(409, "PATCH", `batches/${b.id}`, save([proposal], 1), key);
    // A human editor can continue an AI draft without copying data into another queue.
    b = (
      await expect(200, "PATCH", `batches/${b.id}`, save([proposal]), {
        user: "user-a",
      })
    ).batch;
    b = (
      await expect(
        200,
        "POST",
        `batches/${b.id}/submit`,
        { expectedRevision: b.revision },
        key,
      )
    ).batch;
    await expect(409, "PATCH", `batches/${b.id}`, save([proposal]), key);
    const publish = {
      expectedRevision: b.revision,
      reviewNote: "Đã xem dữ liệu giả lập",
      confirmation: "APPLY_REVIEWED_BATCH",
    };
    await expect(403, "POST", `batches/${b.id}/publish`, publish, key);
    await expect(
      403,
      "POST",
      `batches/${b.id}/return`,
      { expectedRevision: b.revision, reviewNote: "No" },
      key,
    );
    await expect(403, "POST", `batches/${b.id}/publish`, publish, {
      user: "user-a",
    });
    await expect(409, "POST", `batches/${b.id}/publish`, {
      ...publish,
      expectedRevision: 1,
    });
    await expect(400, "POST", `batches/${b.id}/publish`, {
      expectedRevision: b.revision,
      reviewNote: "Missing confirmation",
    });
    b = (await expect(200, "POST", `batches/${b.id}/publish`, publish)).batch;
    eq(b.state, "PUBLISHED");
    eq(
      await api.fixtureQuery(
        `SELECT ${protectedColumns} FROM foods ORDER BY id`,
      ),
      immutableBefore,
      "publish keeps every tested source/measurement field including null/zero",
    );
    const after = (
      await api.fixtureQuery<{ foodGroup: string; imageCredit: string }>(
        `SELECT "foodGroup","imageCredit" FROM foods WHERE id='food-001'`,
      )
    )[0];
    eq(after, { foodGroup: "Nhóm lương thực", imageCredit: "Tác giả giả lập" });
    eq(
      (
        await api.fixtureQuery<{ n: number }>(
          `SELECT count(*)::int AS n FROM food_prices WHERE "foodId"='food-001'`,
        )
      )[0].n,
      2,
    );
    await expect(409, "POST", `batches/${b.id}/publish`, {
      ...publish,
      expectedRevision: b.revision,
    });
    eq(
      (
        await api.fixtureQuery<{ n: number }>(
          `SELECT count(*)::int AS n FROM food_prices WHERE "foodId"='food-001'`,
        )
      )[0].n,
      2,
      "retry never duplicates prices",
    );
    // Conflict in the second food must roll back writes and audit rows for the first.
    const fresh = (await expect(200, "GET", "foods", undefined, key2))
      .items as CatalogFood[];
    let conflict = (
      await expect(
        201,
        "POST",
        "batches",
        { title: "Xung đột nguyên đợt", requestKey: "conflict" },
        key2,
      )
    ).batch as CatalogBatch;
    const entries = fresh.map((f) => ({
      foodId: f.id,
      expectedUpdatedAt: f.updatedAt,
      reason: "Kiểm thử giao dịch",
      classification: { foodType: "TS" },
    }));
    conflict = (
      await expect(
        200,
        "PATCH",
        `batches/${conflict.id}`,
        { title: conflict.title, expectedRevision: conflict.revision, entries },
        key2,
      )
    ).batch;
    conflict = (
      await expect(
        200,
        "POST",
        `batches/${conflict.id}/submit`,
        { expectedRevision: conflict.revision },
        key2,
      )
    ).batch;
    await api.fixtureQuery(
      `UPDATE foods SET "foodGroup"='Gia vị',"updatedAt"='2026-01-02' WHERE id='food-002'`,
    );
    const beforeConflict = await api.fixtureQuery(
        `SELECT * FROM foods ORDER BY id`,
      ),
      logCount = (
        await api.fixtureQuery<{ n: number }>(
          `SELECT count(*)::int AS n FROM data_change_logs`,
        )
      )[0].n;
    await expect(409, "POST", `batches/${conflict.id}/publish`, {
      expectedRevision: conflict.revision,
      reviewNote: "Duyệt thử",
      confirmation: "APPLY_REVIEWED_BATCH",
    });
    eq(
      await api.fixtureQuery(`SELECT * FROM foods ORDER BY id`),
      beforeConflict,
      "atomic rollback across the batch",
    );
    eq(
      (
        await api.fixtureQuery<{ n: number }>(
          `SELECT count(*)::int AS n FROM data_change_logs`,
        )
      )[0].n,
      logCount,
    );
    conflict = (
      await expect(200, "POST", `batches/${conflict.id}/return`, {
        expectedRevision: conflict.revision,
        reviewNote: "Đọc lại nguồn bị đổi",
      })
    ).batch;
    conflict = (
      await expect(
        200,
        "POST",
        `batches/${conflict.id}/rebase`,
        { expectedRevision: conflict.revision },
        key2,
      )
    ).batch;
    eq(conflict.state, "DRAFT");
    eq(conflict.entriesJson[1].before.foodGroup, "Gia vị");
    conflict = (
      await expect(
        200,
        "POST",
        `batches/${conflict.id}/submit`,
        { expectedRevision: conflict.revision },
        key2,
      )
    ).batch;
    conflict = (
      await expect(200, "POST", `batches/${conflict.id}/publish`, {
        expectedRevision: conflict.revision,
        reviewNote: "Đã kiểm lại nguồn",
        confirmation: "APPLY_REVIEWED_BATCH",
      })
    ).batch;
    eq(conflict.state, "PUBLISHED");
    let unused = (
      await expect(
        201,
        "POST",
        "batches",
        { title: "Bản nháp không dùng", requestKey: "unused" },
        key2,
      )
    ).batch as CatalogBatch;
    unused = (
      await expect(
        200,
        "POST",
        `batches/${unused.id}/archive`,
        { expectedRevision: unused.revision },
        key2,
      )
    ).batch;
    eq(unused.state, "ARCHIVED");
    await expect(
      409,
      "PATCH",
      `batches/${unused.id}`,
      { title: unused.title, expectedRevision: unused.revision, entries: [] },
      key2,
    );
    eq(
      (await expect(200, "GET", `batches/${unused.id}`)).batch.entriesJson,
      [],
      "archiving keeps a retrievable batch",
    );
    // Existing price modifications preserve old provenance in audit; no deletes.
    const foodWithPrices = (
      await expect(200, "GET", "foods?q=gao", undefined, key2)
    ).items[0] as CatalogFood;
    let priceBatch = (
      await expect(
        201,
        "POST",
        "batches",
        { title: "Sửa ghi nhận giá", requestKey: "price-update" },
        key2,
      )
    ).batch as CatalogBatch;
    const priceProposal = {
      ...proposal,
      foodId: foodWithPrices.id,
      expectedUpdatedAt: foodWithPrices.updatedAt,
      classification: undefined,
      image: undefined,
      prices: [{ ...proposal.prices[0], id: "price-1", amountVnd: 12000 }],
    };
    priceBatch = (
      await expect(
        200,
        "PATCH",
        `batches/${priceBatch.id}`,
        {
          title: priceBatch.title,
          expectedRevision: priceBatch.revision,
          entries: [priceProposal],
        },
        key2,
      )
    ).batch;
    priceBatch = (
      await expect(
        200,
        "POST",
        `batches/${priceBatch.id}/submit`,
        { expectedRevision: priceBatch.revision },
        key2,
      )
    ).batch;
    await expect(200, "POST", `batches/${priceBatch.id}/publish`, {
      expectedRevision: priceBatch.revision,
      reviewNote: "Sửa giá có nguồn",
      confirmation: "APPLY_REVIEWED_BATCH",
    });
    eq(
      (
        await api.fixtureQuery<{ amountVnd: number }>(
          `SELECT "amountVnd" FROM food_prices WHERE id='price-1'`,
        )
      )[0].amountVnd,
      12000,
    );
    const logs = await api.fixtureQuery<{
      beforeJson: { prices: Array<{ id: string; amountVnd: number }> };
      afterJson: { prices: Array<{ id: string; amountVnd: number }> };
    }>(
      `SELECT "beforeJson","afterJson" FROM data_change_logs WHERE action='CATALOG_PUBLISH' AND "entityId"='food-001' ORDER BY "createdAt" DESC LIMIT 1`,
    );
    eq(
      logs[0].beforeJson.prices.find((p) => p.id === "price-1")!.amountVnd,
      10000,
    );
    eq(
      logs[0].afterJson.prices.find((p) => p.id === "price-1")!.amountVnd,
      12000,
    );
    await expect(200, "POST", `keys/${mint.key.id}/revoke`, {});
    await expect(401, "GET", "foods", undefined, key);
    await api.fixtureQuery(
      `UPDATE catalog_editor_keys SET "expiresAt"='2000-01-01' WHERE id=$1`,
      [mint2.key.id],
    );
    await expect(401, "GET", "foods", undefined, key2);
    await api.fixtureQuery(
      `UPDATE catalog_editor_keys SET "expiresAt"='2999-01-01' WHERE id=$1`,
      [mint2.key.id],
    );
    await api.fixtureQuery(
      `UPDATE app_users SET role='CLINICIAN' WHERE id='admin'`,
    );
    await expect(401, "GET", "foods", undefined, key2);
    await api.fixtureQuery(
      `UPDATE app_users SET role='ADMIN' WHERE id='admin'`,
    );
    await api.fixtureQuery(
      `UPDATE app_users SET "disabledAt"=CURRENT_TIMESTAMP WHERE id='admin'`,
    );
    await expect(401, "GET", "foods", undefined, key2);
    await api.fixtureQuery(
      `UPDATE app_users SET "disabledAt"=NULL WHERE id='admin'`,
    );
    // Fresh role check inside transactions prevents use of a previously resolved ADMIN actor.
    const staleActor = {
      id: "user-a",
      displayName: "Editor",
      role: "ADMIN",
      keyId: null,
      principal: "user:user-a",
    };
    await assert.rejects(
      () => api.catalogKeys(staleActor),
      /Chỉ quản trị viên/,
    );
    checks++;
    const unchanged = await api.fixtureQuery(`SELECT * FROM foods ORDER BY id`);
    api.fixtureCookies.clear();
    api.fixtureCookies.set(api.SESSION_COOKIE, cookies.get("user-a")!);
    for (const legacy of api.legacy)
      eq((await legacy()).status, 409, "old canonical write path retired");
    eq(await api.fixtureQuery(`SELECT * FROM foods ORDER BY id`), unchanged);
    ok(!("DELETE" in api.routes));
    ok(!("PUT" in api.routes));
    const allLogs = JSON.stringify(
      await api.fixtureQuery(`SELECT * FROM data_change_logs`),
    );
    ok(!allLogs.includes(mint.token));
    ok(!allLogs.includes(mint2.token));
    eq(
      await api.fixtureQuery(
        `SELECT ${protectedColumns} FROM foods ORDER BY id`,
      ),
      immutableBefore,
    );
    const ui = await readFile(
      resolve("src/app/quan-tri/bien-tap/CatalogWorkspace.tsx"),
      "utf8",
    );
    ok(
      !ui.includes("localStorage"),
      "editor keys never persisted to localStorage",
    );
    console.log(
      `Catalog editor: ${checks} checks, ${requests} real-handler requests passed on disposable PostgreSQL. Drafts/shared editing, role/key limits, exact approval, null/zero and immutable nutrients, atomic conflict rollback, provenance, revocation/expiry and private ACL verified. No live data or deployment; multi-worker locks/browser QA are separate.`,
    );
  } finally {
    if (app) await app.closeOAuthFixture();
    if (savedUrl === undefined) delete process.env.NUTRITION_PUBLIC_URL;
    else process.env.NUTRITION_PUBLIC_URL = savedUrl;
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
