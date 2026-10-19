import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { removeNutritionFixtureDirectory } from "./fixtures/nutrition-oauth/safe-temp";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import type * as Service from "../src/lib/nutrition-chat/service";
import type * as Database from "./fixtures/nutrition-oauth/database";
import type * as Repository from "./fixtures/nutrition-oauth/repository";
import type { MenuInput, MenuRowInput, NutritionIdentity } from "../src/lib/nutrition-chat/contracts";
type Runtime = typeof Service & typeof Database & typeof Repository;
let checks = 0;

async function main() {
  const saved = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "nutrition-storage-fixture-"));
  const require = createRequire(import.meta.url);
  let runtime: Runtime | undefined;
  try {
    process.env.APP_SECRET = "disposable-storage-fixture-no-live-secrets";
    const outfile = join(directory, "storage-fixture.cjs");
    const sources = ["src/lib/nutrition-chat/service.ts", "scripts/fixtures/nutrition-oauth/database.ts", "scripts/fixtures/nutrition-oauth/repository.ts"];
    await build({ stdin: { contents: sources.map(path => `export * from ${JSON.stringify(resolve(path))};`).join("\n"), resolveDir: process.cwd(), loader: "ts" }, outfile,
      bundle: true, platform: "node", format: "cjs", logLevel: "silent", plugins: [{ name: "disposable-storage", setup(builder) {
        builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only-stub", namespace: "empty" }));
        builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};", loader: "js" }));
        builder.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/database.ts") }));
        builder.onResolve({ filter: /^\.\/repository$/ }, args => args.importer.endsWith("nutrition-chat/service.ts") || args.importer.endsWith("nutrition-chat\\service.ts") ? { path: resolve("scripts/fixtures/nutrition-oauth/repository.ts") } : null);
        builder.onResolve({ filter: /^@electric-sql\/pglite$/ }, () => ({ path: require.resolve("@electric-sql/pglite"), external: true }));
      } }] });
    runtime = require(outfile) as Runtime;
    const api = runtime;
    await api.initializeOAuthFixture(resolve("prisma/migrations/20261014090000_nutrition_chat_oauth/migration.sql"));
    const userA: NutritionIdentity = { userId: "user-a", clientId: "fixture-client-a", scopes: ["nutrition:read", "nutrition:write", "nutrition:calculate"] };
    const userB: NutritionIdentity = { ...userA, userId: "user-b" };
    function input(quantity = 100): MenuInput {
      return { title: "Thực đơn fixture", mode: "menu", fields: ["energyKcal", "proteinG", "lipidG", "glucidG", "calciumMg"], comparison: { mode: "none" }, days: [
        { id: "day-1", label: "Ngày 1", date: "2026-10-14", rows: [{ id: "row-1", meal: "Trưa", dish: "Cơm", foodId: "fixture-rice", quantity, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Người dùng xác nhận" } }] },
        { id: "day-2", label: "Ngày 2 chưa nhập", date: "2026-10-15", rows: [] },
      ] };
    }
    async function prepare(menu = input(), identity = userA) { return api.prepareNutritionMenu(menu, identity); }
    async function argsFor(key: string, menu = input(), identity = userA) {
      const prepared = await prepare(menu, identity);
      return { input: menu, confirmationToken: prepared.confirmationToken, idempotencyKey: key };
    }
    async function fails(fn: () => Promise<unknown>, status: number) {
      await assert.rejects(fn, error => !!error && typeof error === "object" && "status" in error && error.status === status); checks++;
    }
    const firstPreview = await prepare();
    assert.equal(firstPreview.review.rowCount, 1); checks++;
    assert.ok(firstPreview.review.text.includes("Cơm")); checks++;
    const clinicalInput = input(); clinicalInput.clinicalContext = { conditions: ["Tình trạng giả lập"], targetGroup: "NguoiLon", dietCodeId: "fixture-diet", selection: "user_confirmed" };
    const clinicalPrepared = await prepare(clinicalInput);
    assert.equal(clinicalPrepared.preview.clinicalAssessment?.diet?.code, "TEST-01"); checks++;
    assert.ok(clinicalPrepared.review.text.includes("TEST-01")); checks++;
    api.setFixtureDietEnergyMax(190);
    await fails(() => api.confirmedNutritionMenu({ input: clinicalPrepared.input, confirmationToken: clinicalPrepared.confirmationToken }, userA), 409);
    api.setFixtureDietEnergyMax(200);
    const clinicalProposed = structuredClone(clinicalInput); clinicalProposed.clinicalContext!.selection = "proposed";
    const proposedPrepared = await prepare(clinicalProposed);
    await fails(() => api.confirmedNutritionMenu({ input: proposedPrepared.input, confirmationToken: proposedPrepared.confirmationToken }, userA), 422);
    await fails(() => prepare({ ...clinicalInput, clinicalContext: { ...clinicalInput.clinicalContext!, dietCodeId: "not-a-real-code" } }), 404);
    const vddInput = input(); vddInput.days[0].rows[0].recipeSource = { kind: "catalog", label: "Tên nguồn do client tự ghi" };
    await fails(() => prepare(vddInput), 422);
    api.setFixtureFoodSource("VDD", "MA");
    const vddPreview = await prepare(vddInput);
    assert.equal(vddPreview.input.days[0].rows[0].recipeSource.label, "VDD: Cơm (fixture)"); checks++;
    assert.equal(vddPreview.preview.totals.energyKcal.value, null); checks++;
    assert.ok(vddPreview.preview.missingInputs.some(item => item.field === "nutrientBasis")); checks++;
    await fails(() => api.confirmedNutritionMenu({ input: vddPreview.input, confirmationToken: vddPreview.confirmationToken }, userA), 422);
    api.setFixtureFoodSource("Nguồn giả lập kiểm thử", "CB");
    assert.equal(firstPreview.preview.totals.energyKcal.value, 130); checks++;
    assert.equal(firstPreview.preview.dayTotals[1].hasData, false); checks++;
    assert.equal(firstPreview.preview.dayTotals[1].totals.energyKcal.value, null); checks++;
    assert.equal(firstPreview.preview.totals.calciumMg.incomplete, true); checks++;
    assert.equal(firstPreview.preview.totals.calciumMg.value, null); checks++;
    assert.equal(firstPreview.preview.targets.length, 0); checks++;
    const firstArgs = await argsFor("create-one");
    const first = await api.saveNutritionMenu(firstArgs, userA);
    assert.equal(first.ration.revision, 1); checks++;
    assert.equal(first.replayed, false); checks++;
    const repeated = await api.saveNutritionMenu({ ...firstArgs, confirmationToken: "expired-token-not-needed-for-same-idempotent-reply" }, userA);
    assert.equal(repeated.ration.id, first.ration.id); checks++;
    assert.equal(repeated.replayed, true); checks++;
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT count(*) AS count FROM "rations"'))[0].count, 1); checks++;
    await fails(() => api.saveNutritionMenu({ ...firstArgs, input: input(200) }, userA), 409);
    await fails(() => api.saveNutritionMenu({ ...firstArgs, idempotencyKey: "unconfirmed-new", confirmationToken: "wrong" }, userA), 409);
    await fails(() => api.saveNutritionMenu(firstArgs, userB), 409);
    await fails(() => api.saveNutritionMenu({ ...firstArgs, idempotencyKey: "other-client-new" }, { ...userA, clientId: "other-client" }), 409);

    const concurrentArgs = await argsFor("create-concurrent");
    const concurrent = await Promise.all([api.saveNutritionMenu(concurrentArgs, userA), api.saveNutritionMenu(concurrentArgs, userA)]);
    assert.equal(concurrent[0].ration.id, concurrent[1].ration.id); checks++;
    assert.deepEqual(concurrent.map(value => value.replayed).sort(), [false, true]); checks++;
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT count(*) AS count FROM "rations"'))[0].count, 2); checks++;
    const updatedInput = input(250);
    updatedInput.days[0].rows[0].recipeSource = { kind: "user", label: "Công thức người dùng đã điều chỉnh", url: "https://example.test/recipe-revised" };
    const updateArgs = { ...await argsFor("update-first", updatedInput), rationId: first.ration.id, expectedRevision: 1 };
    const updated = await api.saveNutritionMenu(updateArgs, userA);
    assert.equal(updated.ration.id, first.ration.id); checks++;
    assert.equal(updated.ration.revision, 2); checks++;
    assert.equal(updated.preview.totals.energyKcal.value, 325); checks++;
    assert.equal((await api.saveNutritionMenu(updateArgs, userA)).replayed, true); checks++;
    const updatedHistory = await api.getSavedNutritionMenu(first.ration.id, userA);
    assert.equal(updatedHistory.history.length, 2); checks++;
    assert.equal(updatedHistory.historyTruncated, false); checks++;
    const quantityChange = updatedHistory.history[1].changes.find(change => change.rowId === "row-1")!;
    assert.equal((quantityChange.before as MenuRowInput).quantity, 100); checks++;
    assert.equal((quantityChange.after as MenuRowInput).quantity, 250); checks++;
    assert.equal((quantityChange.before as MenuRowInput).recipeSource.label, "Người dùng xác nhận"); checks++;
    assert.equal((quantityChange.after as MenuRowInput).recipeSource.url, "https://example.test/recipe-revised"); checks++;
    assert.equal(updatedHistory.history[1].clientId, userA.clientId); checks++;
    assert.equal(updatedHistory.history[1].dataVersion, updated.preview.dataVersion); checks++;
    assert.ok(Number.isFinite(Date.parse(updatedHistory.history[1].confirmedAt))); checks++;
    await fails(async () => api.saveNutritionMenu({ ...await argsFor("stale-revision", input(300)), rationId: first.ration.id, expectedRevision: 1 }, userA), 409);
    await fails(() => api.saveNutritionMenu({ ...updateArgs, idempotencyKey: "other-owner" }, userB), 404);
    await fails(() => api.getSavedNutritionMenu(first.ration.id, userB), 404);
    assert.equal((await api.listSavedNutritionMenus(0, userB)).items.length, 0); checks++;
    const listed = await api.listSavedNutritionMenus(0, userA);
    assert.equal(listed.items.length, 2); checks++;
    assert.ok(listed.items.some(item => item.id === first.ration.id && item.revision === 2)); checks++;
    await fails(() => api.listSavedNutritionMenus(-1, userA), 400);

    const stable = await prepare();
    const stableAgain = await prepare();
    assert.equal(stable.preview.digest, stableAgain.preview.digest); checks++;
    api.setFixtureFoodEnergy(140);
    const sourceChanged = await api.getSavedNutritionMenu(first.ration.id, userA);
    assert.equal(sourceChanged.sourceChanged, true); checks++;
    assert.equal(sourceChanged.preview.totals.energyKcal.value, 350); checks++;
    await fails(() => api.saveNutritionMenu({ input: input(), confirmationToken: stable.confirmationToken, idempotencyKey: "source-changed" }, userA), 409);
    api.setFixtureFoodEnergy(130);
    const unchanged = await api.getSavedNutritionMenu(first.ration.id, userA);
    assert.equal(unchanged.sourceChanged, false); checks++;

    const mlMenu = input();
    mlMenu.days[0].rows = [{ id: "milk-row", meal: "Sáng", dish: "Sữa", quantity: 250, unit: "ml", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Thành phần người dùng xác nhận" }, customFood: {
      id: "milk-custom", name: "Sữa nhãn sản phẩm (fixture)", basis: "100ml", source: { kind: "label", label: "Nhãn giả lập chỉ dùng kiểm thử", confirmed: true }, nutrients: { energyKcal: 60, proteinG: 3, lipidG: 3, glucidG: 5, calciumMg: null },
    } }];
    const mlSaved = await api.saveNutritionMenu(await argsFor("ml-preserved", mlMenu), userA);
    const mlOpened = await api.getSavedNutritionMenu(mlSaved.ration.id, userA);
    assert.equal(mlOpened.input.days[0].rows[0].unit, "ml"); checks++;
    assert.equal(mlOpened.preview.days[0].rows[0].edibleGrams, null); checks++;
    assert.equal(mlOpened.preview.totals.energyKcal.value, 150); checks++;
    assert.equal(mlOpened.preview.totals.calciumMg.value, null); checks++;
    assert.equal(mlOpened.input.days.length, 2); checks++;
    const sourceAdjusted = structuredClone(mlMenu);
    sourceAdjusted.days[0].rows[0].quantity = 300;
    sourceAdjusted.days[0].rows[0].replacedFromFoodId = "fixture-rice";
    sourceAdjusted.days[0].rows[0].customFood!.source = { kind: "document", label: "Tài liệu người dùng đã xác nhận", url: "https://example.test/milk-nutrients", confirmed: true };
    const sourceUpdatedArgs = { ...await argsFor("history-source-change", sourceAdjusted), rationId: mlSaved.ration.id, expectedRevision: 1 };
    const sourceUpdated = await api.saveNutritionMenu(sourceUpdatedArgs, userA);
    assert.equal(sourceUpdated.ration.revision, 2); checks++;
    const sourceHistory = await api.getSavedNutritionMenu(mlSaved.ration.id, userA);
    const sourceChange = sourceHistory.history[1].changes.find(change => change.rowId === "milk-row")!;
    assert.equal((sourceChange.before as MenuRowInput).customFood!.source.kind, "label"); checks++;
    assert.equal((sourceChange.after as MenuRowInput).customFood!.source.kind, "document"); checks++;
    assert.equal((sourceChange.after as MenuRowInput).customFood!.source.url, "https://example.test/milk-nutrients"); checks++;
    assert.equal((sourceChange.after as MenuRowInput).replacedFromFoodId, "fixture-rice"); checks++;
    assert.equal((sourceChange.before as MenuRowInput).quantity, 250); checks++;
    assert.equal((sourceChange.after as MenuRowInput).quantity, 300); checks++;
    for (let i = 0; i < 21; i++) {
      const revisionInput = structuredClone(sourceAdjusted);
      revisionInput.days[0].rows[0].quantity = 301 + i;
      await api.saveNutritionMenu({ ...await argsFor(`history-retention-${i}`, revisionInput), rationId: mlSaved.ration.id, expectedRevision: 2 + i }, userA);
    }
    const retainedHistory = await api.getSavedNutritionMenu(mlSaved.ration.id, userA);
    assert.equal(retainedHistory.ration.revision, 23); checks++;
    assert.equal(retainedHistory.history.length, 20); checks++;
    assert.equal(retainedHistory.historyTruncated, true); checks++;
    assert.equal(retainedHistory.history[0].revision, 4); checks++;
    assert.equal(retainedHistory.history[19].revision, 23); checks++;
    assert.equal((retainedHistory.history[0].changes[0].before as MenuRowInput).quantity, 301); checks++;
    assert.equal((retainedHistory.history[19].changes[0].after as MenuRowInput).quantity, 321); checks++;
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT count(*) AS count FROM "app_users"'))[0].count, 2); checks++;

    const previousCount = (await api.fixtureQuery<{ count: number }>('SELECT count(*) AS count FROM "rations" WHERE "ownerId"=$1', [userA.userId]))[0].count;
    await api.fixtureQuery(`INSERT INTO "rations" ("id","ownerId","title","conversationRevision","conversationRequestKey","conversationJson")
      SELECT 'quota-' || g::text, $1, 'Quota fixture', 1, 'quota-key-' || g::text, '{}'::jsonb FROM generate_series(1, $2) g`, [userA.userId, 200 - previousCount]);
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT count(*) AS count FROM "rations" WHERE "ownerId"=$1', [userA.userId]))[0].count, 200); checks++;
    await fails(async () => api.saveNutritionMenu(await argsFor("quota-excess"), userA), 409);
    const updateAtQuota = await api.saveNutritionMenu({ ...await argsFor("update-at-quota", input(150)), rationId: first.ration.id, expectedRevision: 2 }, userA);
    assert.equal(updateAtQuota.ration.revision, 3); checks++;
    const page = await api.listSavedNutritionMenus(0, userA);
    assert.equal(page.items.length, 20); checks++;
    assert.equal(page.nextOffset, 20); checks++;
    await fails(() => api.deleteSavedNutritionMenu(first.ration.id, 3, userB), 409);
    await fails(() => api.deleteSavedNutritionMenu(first.ration.id, 2, userA), 409);
    await fails(() => api.deleteSavedNutritionMenu(first.ration.id, 0, userA), 409);
    assert.equal((await api.deleteSavedNutritionMenu(first.ration.id, 3, userA)).deleted, true); checks++;
    await fails(() => api.getSavedNutritionMenu(first.ration.id, userA), 404);
    await fails(() => api.deleteSavedNutritionMenu(first.ration.id, 3, userA), 409);
    await api.fixtureQuery('INSERT INTO "rations"("id","ownerId","title") VALUES ($1,$2,$3)', ["legacy-row", userA.userId, "Legacy fixture"]);
    await fails(() => api.deleteSavedNutritionMenu("legacy-row", 1, userA), 409);
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT count(*) AS count FROM "rations" WHERE "id"=$1', ["legacy-row"]))[0].count, 1); checks++;
    // Simulate an existing large account using uncompressed external JSONB storage in
    // the disposable DB. Verify the real pg_column_size account quota query, not a mock.
    await api.fixtureQuery('ALTER TABLE "rations" ALTER COLUMN "conversationJson" SET STORAGE EXTERNAL');
    const nearQuotaInput = input(); nearQuotaInput.aiComment = "q".repeat(7000);
    const sizeProbe = await api.saveNutritionMenu(await argsFor("size-probe", nearQuotaInput, userB), userB);
    const storedProbe = (await api.fixtureQuery<{ conversationJson: unknown }>('SELECT "conversationJson" FROM "rations" WHERE "id"=$1', [sizeProbe.ration.id]))[0].conversationJson;
    const exactProbeBytes = Buffer.byteLength(JSON.stringify(storedProbe));
    await api.fixtureQuery('DELETE FROM "rations" WHERE "id"=$1', [sizeProbe.ration.id]);
    const reserve = Math.ceil(exactProbeBytes * 1.25) + 100;
    await api.fixtureQuery('INSERT INTO "rations"("id","ownerId","title","conversationJson") VALUES ($1,$2,$3,$4::jsonb)',
      ["near-quota-filler", userB.userId, "Fixture filler", JSON.stringify({ padding: "x".repeat(25 * 1024 * 1024 - reserve) })]);
    const nearQuotaArgs = await argsFor("near-quota-race", nearQuotaInput, userB);
    const nearQuota = await Promise.all([api.saveNutritionMenu(nearQuotaArgs, userB), api.saveNutritionMenu(nearQuotaArgs, userB)]);
    assert.equal(nearQuota[0].ration.id, nearQuota[1].ration.id); checks++;
    assert.deepEqual(nearQuota.map(result => result.replayed).sort(), [false, true]); checks++;
    const nearUsage = (await api.fixtureQuery<{ bytes: number }>('SELECT SUM(pg_column_size("conversationJson"))::double precision AS bytes FROM "rations" WHERE "ownerId"=$1', [userB.userId]))[0].bytes;
    assert.ok(nearUsage > 24 * 1024 * 1024); checks++;
    assert.ok(nearUsage + exactProbeBytes > 25 * 1024 * 1024); checks++;
    // The second concurrent retry must reuse the first save before checking quota;
    // adding its same snapshot again would be over quota and incorrectly reject retry.
    await api.fixtureQuery('DELETE FROM "rations" WHERE "ownerId"=$1', [userB.userId]);
    await api.fixtureQuery('INSERT INTO "rations"("id","ownerId","title","conversationRevision","conversationRequestKey","conversationJson") VALUES ($1,$2,$3,1,$4,$5::jsonb)',
      ["large-account", userB.userId, "Large fixture", "large-existing", JSON.stringify({ padding: "x".repeat(26 * 1024 * 1024) })]);
    const usage = await api.fixtureQuery<{ bytes: number }>('SELECT SUM(pg_column_size("conversationJson"))::double precision AS bytes FROM "rations" WHERE "ownerId"=$1', [userB.userId]);
    assert.ok(usage[0].bytes > 25 * 1024 * 1024); checks++;
    await fails(async () => api.saveNutritionMenu(await argsFor("bytes-quota-excess", input(), userB), userB), 409);
    await api.fixtureQuery('DELETE FROM "rations" WHERE "ownerId"=$1', [userB.userId]);
    const clinicalSaved = await api.saveNutritionMenu(await argsFor("clinical-save", clinicalInput, userB), userB);
    const clinicalOpened = await api.getSavedNutritionMenu(clinicalSaved.ration.id, userB);
    assert.deepEqual(clinicalOpened.input.clinicalContext, clinicalInput.clinicalContext); checks++;
    assert.equal(clinicalOpened.preview.clinicalAssessment?.diet?.code, "TEST-01"); checks++;
    await fails(() => api.getSavedNutritionMenu(clinicalSaved.ration.id, userA), 404);
    const revisedClinical = structuredClone(clinicalInput); revisedClinical.clinicalContext!.notes = "Thông tin giả lập đã điều chỉnh";
    const revisedArgs = { ...await argsFor("clinical-update", revisedClinical, userB), rationId: clinicalSaved.ration.id, expectedRevision: 1 };
    await api.saveNutritionMenu(revisedArgs, userB);
    const clinicalHistory = await api.getSavedNutritionMenu(clinicalSaved.ration.id, userB);
    assert.equal(clinicalHistory.history[1].clinicalChange?.before.context?.notes, undefined); checks++;
    assert.equal(clinicalHistory.history[1].clinicalChange?.after.context?.notes, revisedClinical.clinicalContext!.notes); checks++;
    assert.equal(clinicalHistory.history[1].clinicalChange?.after.diet?.code, "TEST-01"); checks++;
    console.log(`Nutrition storage disposable PostgreSQL: ${checks} checks passed. Actual service save/open/list + JSONB migration, idempotency, fixture concurrency, revisions, ownership, quota and source-digest changes verified.`);
    console.log("PGlite + repository/Prisma fixtures only; no live data queries/writes or multi-worker VPS verification.");
  } finally {
    if (runtime) await runtime.closeOAuthFixture();
    await removeNutritionFixtureDirectory(directory, "nutrition-storage-fixture-");
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.stack : "Storage fixture failed"); process.exitCode = 1; });
