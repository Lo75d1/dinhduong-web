import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { removeNutritionFixtureDirectory } from "./fixtures/nutrition-oauth/safe-temp";
import type * as Library from "../src/lib/personal-library";
import type * as Service from "../src/lib/nutrition-chat/service";
import type * as Route from "../src/app/api/personal-library/[kind]/route";
import type * as State from "./fixtures/nutrition-oauth/state";
import type * as Db from "./fixtures/nutrition-oauth/database";
import type * as Operations from "../src/lib/nutrition-chat/operations";
import type { CustomFoodInput, MenuInput, NutritionIdentity } from "../src/lib/nutrition-chat/contracts";

type Api = typeof Library & typeof Service & typeof Db & typeof State & typeof Operations & { route: typeof Route };
export async function buildPersonalLibraryFixture(directory: string): Promise<Api> {
  const require = createRequire(import.meta.url), outfile = join(directory, "personal-library.cjs");
  const sources = ["src/lib/personal-library.ts", "src/lib/nutrition-chat/service.ts", "src/lib/nutrition-chat/operations.ts", "scripts/fixtures/nutrition-oauth/database.ts", "scripts/fixtures/nutrition-oauth/state.ts"];
  await build({ stdin: { contents: sources.map(path => `export * from ${JSON.stringify(resolve(path))};`).join("\n") + `\nimport * as route from ${JSON.stringify(resolve("src/app/api/personal-library/[kind]/route.ts"))};export {route};`, resolveDir: process.cwd(), loader: "ts" }, outfile, bundle: true, platform: "node", format: "cjs", logLevel: "silent", plugins: [{ name: "personal-library-fixture", setup(builder) {
    builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "empty", namespace: "empty" }));
    builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};" }));
    builder.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/database.ts") }));
    builder.onResolve({ filter: /^(next\/headers|@\/lib\/auth)$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/state.ts") }));
    builder.onResolve({ filter: /^(\.\/repository|@\/lib\/nutrition-chat\/repository)$/ }, args => /nutrition-chat[\\/]/.test(args.importer) || args.path.startsWith("@/") ? { path: resolve("scripts/fixtures/nutrition-oauth/repository.ts") } : null);
    builder.onResolve({ filter: /^(\.\/downloads|@\/lib\/nutrition-chat\/downloads)$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/downloads.ts") }));
    builder.onResolve({ filter: /^@electric-sql\/pglite$/ }, () => ({ path: require.resolve("@electric-sql/pglite"), external: true }));
  } }] });
  return require(outfile) as Api;
}
async function main() {
  const saved = { ...process.env }, directory = await mkdtemp(join(tmpdir(), "nutrition-personal-library-fixture-"));
  let api: Api | undefined, checks = 0;
  try {
    process.env.APP_SECRET = "disposable-personal-library-fixture-only"; process.env.NUTRITION_PUBLIC_URL = "https://dinhduong2598.food";
    api = await buildPersonalLibraryFixture(directory);
    await api.initializeOAuthFixture(resolve("prisma/migrations/20261014090000_nutrition_chat_oauth/migration.sql"));
    await api.applyFixtureMigration(resolve("prisma/migrations/20261015140000_personal_nutrition_library/migration.sql"));
    const runtime = api, a: NutritionIdentity = { userId: "user-a", clientId: "fixture", scopes: ["nutrition:read", "nutrition:write", "nutrition:calculate"] }, b = { ...a, userId: "user-b" };
    async function fails(fn: () => Promise<unknown>, status: number) { await assert.rejects(fn, error => !!error && typeof error === "object" && "status" in error && error.status === status); checks++; }
    const food: CustomFoodInput = { id: "draft", name: "Sữa nhãn thử", basis: "100ml", source: { kind: "label", label: "Nhãn thử 50 kcal / 100 ml", url: "https://example.test/label", confirmed: true }, nutrients: { energyKcal: 50, proteinG: 3, lipidG: 0, calciumMg: 120, vitDMcg: null, copperMgVdd: 0.1, copperMcgRni: null } };
    const args = { content: food, requestKey: "create-one", reason: "Lưu nhãn đã đối chiếu", confirmed: true };
    const first = await api.savePersonalLibraryItem("food", args, a);
    assert.equal(first.revision, 1); checks++;
    assert.equal(first.replayed, false); checks++;
    assert.equal((await api.savePersonalLibraryItem("food", args, a)).id, first.id); checks++;
    assert.equal((await api.fixtureQuery<{ count: number }>('SELECT count(*)::int AS count FROM personal_foods'))[0].count, 1); checks++;
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, content: { ...food, name: "Khác" } }, a), 409);
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, confirmed: false }, a), 400);
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, ownerId: "user-b" }, a), 400);
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, content: { ...food, nutrients: { inventedVitamin: 10 } } }, a), 400);
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, content: { ...food, source: { ...food.source, kind: "catalog" } } }, a), 400);
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, content: { ...food, source: { kind: "unknown", label: "", confirmed: false } } }, a), 400);
    const opened = await api.getPersonalLibraryItem("food", first.id, a), captured = opened.content as unknown as CustomFoodInput;
    assert.equal(captured.id, `${first.id}_v1`); checks++;
    assert.equal(captured.nutrients.lipidG, 0); checks++;
    assert.equal(captured.nutrients.vitDMcg, null); checks++;
    assert.equal(captured.nutrients.calciumMg, 120); checks++;
    assert.equal(captured.nutrients.copperMgVdd, 0.1); checks++;
    assert.equal(captured.nutrients.copperMcgRni, null); checks++;
    assert.equal((await api.listPersonalLibrary("food", "Sữa", 0, a)).items.length, 1); checks++;
    assert.equal((await api.listPersonalLibrary("food", "' OR 1=1 --", 0, a)).items.length, 0); checks++;
    assert.equal((await api.listPersonalLibrary("food", "", 0, b)).items.length, 0); checks++;
    await fails(() => runtime.getPersonalLibraryItem("food", first.id, b), 404);
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, id: first.id, expectedRevision: 1, requestKey: "other-update" }, b), 404);
    await fails(() => runtime.deletePersonalLibraryItem("food", { id: first.id, expectedRevision: 1, reason: "Thử mục khác" }, b), 404);
    const input: MenuInput = { title: "Công thức sữa cơm", mode: "menu", comparison: { mode: "none" }, days: [{ id: "recipe", date: "", label: "Công thức", rows: [
      { id: "milk", meal: "Công thức", dish: "Công thức sữa cơm", customFood: captured, quantity: 200, unit: "ml", basis: "edible", servings: 1, recipeSource: { kind: "user", label: "Công thức tự nhập" } },
      { id: "rice", meal: "Công thức", dish: "Công thức sữa cơm", foodId: "fixture-rice", quantity: 100, unit: "g", basis: "edible", servings: 1, recipeSource: { kind: "user", label: "Công thức tự nhập" } },
    ] }] };
    const recipe = await api.savePersonalLibraryItem("dish", { ...args, content: input, requestKey: "recipe-one" }, a);
    const recipeBefore = await api.getPersonalLibraryItem("dish", recipe.id, a);
    assert.equal(recipeBefore.preview?.totals.energyKcal.value, 230); checks++;
    assert.equal(recipeBefore.preview?.days[0].rows[0].unit, "ml"); checks++;
    assert.equal(recipeBefore.preview?.days[0].rows[0].edibleGrams, null); checks++;
    assert.equal(recipeBefore.preview?.totals.calciumMg.incomplete, true); checks++;
    const p = await api.prepareNutritionMenu(input, a);
    const menu = await api.saveNutritionMenu({ input: p.input, confirmationToken: p.confirmationToken, idempotencyKey: "library-menu" }, a);
    const importedFood = await api.personalLibraryDraftFromMenu("food", menu.ration.id, "milk", a);
    assert.equal((importedFood.content as CustomFoodInput).source.url, food.source.url); checks++;
    const importedDish = await api.personalLibraryDraftFromMenu("dish", menu.ration.id, "milk", a);
    assert.equal((importedDish.content as MenuInput).days[0].rows.length, 2); checks++;
    await fails(() => runtime.personalLibraryDraftFromMenu("dish", menu.ration.id, "milk", b), 404);
    await fails(() => runtime.personalLibraryDraftFromMenu("food", menu.ration.id, "rice", a), 422);
    await fails(() => runtime.personalLibraryDraftFromMenu("food", menu.ration.id, "missing-row", a), 404);
    const changed = await api.savePersonalLibraryItem("food", { ...args, id: first.id, expectedRevision: 1, requestKey: "update-two", content: { ...food, nutrients: { ...food.nutrients, energyKcal: 90 } } }, a);
    assert.equal(changed.revision, 2); checks++;
    await fails(() => runtime.savePersonalLibraryItem("food", { ...args, id: first.id, expectedRevision: 1, requestKey: "stale-update" }, a), 409);
    assert.equal((await api.getPersonalLibraryItem("dish", recipe.id, a)).preview?.totals.energyKcal.value, 230); checks++;
    assert.equal((await api.getSavedNutritionMenu(menu.ration.id, a)).preview.totals.energyKcal.value, 230); checks++;
    assert.equal(((await api.getPersonalLibraryItem("food", first.id, a)).content as unknown as CustomFoodInput).nutrients.energyKcal, 90); checks++;
    const mixedVersions = structuredClone(input), newestFood = (await api.getPersonalLibraryItem("food", first.id, a)).content as unknown as CustomFoodInput;
    assert.equal(newestFood.id, `${first.id}_v2`); checks++;
    mixedVersions.days.push({ id: "day-two", date: "", label: "Ngày 2", rows: [{ ...mixedVersions.days[0].rows[0], id: "new-milk", quantity: 100, customFood: newestFood }] });
    assert.equal((await api.prepareNutritionMenu(mixedVersions, a)).preview.totals.energyKcal.value, 320); checks++;
    const copied = structuredClone(input); copied.title = "Thực đơn khác"; copied.days[0].rows[0].quantity = 400;
    const copyPreview = await api.prepareNutritionMenu(copied, a);
    assert.equal(copyPreview.preview.totals.energyKcal.value, 330); checks++;
    await fails(() => runtime.getPersonalLibraryItem("dish", recipe.id, b), 404);
    const toolsList = await api.executeNutritionTool("list_personal_library", { kind: "food" }, a);
    assert.equal("items" in toolsList && toolsList.items.length, 1); checks++;
    const toolGet = await api.executeNutritionTool("get_personal_library_item", { kind: "dish", id: recipe.id }, a);
    assert.equal("content" in toolGet, true); checks++;
    await fails(() => runtime.executeNutritionTool("get_personal_library_item", { kind: "dish", id: recipe.id }, b), 404);
    await fails(() => runtime.executeNutritionTool("list_personal_library", { kind: "food" }, { ...a, scopes: [] }), 403);
    function request(method: string, body?: unknown, extra: Record<string, string> = {}) { return new Request("https://dinhduong2598.food/api/personal-library/food", { method, headers: { ...(method !== "GET" ? { Origin: "https://dinhduong2598.food", "Content-Type": "application/json" } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    const context = { params: Promise.resolve({ kind: "food" }) };
    assert.equal((await api.route.GET(request("GET"), context)).status, 401); checks++;
    api.setFixtureUser({ id: "user-a", email: "fixture@example.test", displayName: "Fixture", role: "CLINICIAN" });
    const listed = await api.route.GET(request("GET"), context);
    assert.equal(listed.status, 200); checks++;
    assert.equal(listed.headers.get("cache-control"), "no-store"); checks++;
    assert.equal((await api.route.POST(request("POST", args, { Origin: "https://evil.test" }), context)).status, 403); checks++;
    assert.equal((await api.route.POST(request("POST", args, { Authorization: "Bearer invalid" }), context)).status, 401); checks++;
    assert.equal((await api.route.POST(request("POST", args, { "Content-Length": "9999999" }), context)).status, 413); checks++;
    for (const role of ["anon", "authenticated", "nutrition_fixture_public_probe", "nutrition_fixture_rls_probe"]) {
      const grants: { allowed: boolean }[] = await api.fixtureQuery<{ allowed: boolean }>("SELECT has_table_privilege($1, 'personal_foods', 'SELECT') OR has_table_privilege($1, 'personal_dishes', 'SELECT') AS allowed", [role]);
      assert.equal(grants[0].allowed, false); checks++;
    }
    assert.equal((await api.fixtureQuery<{ enabled: boolean }>("SELECT bool_and(relrowsecurity) AS enabled FROM pg_class WHERE relname IN ('personal_foods','personal_dishes')"))[0].enabled, true); checks++;
    await api.deletePersonalLibraryItem("food", { id: first.id, expectedRevision: 2, reason: "Xóa nhãn thử nghiệm" }, a);
    assert.equal((await api.listPersonalLibrary("food", "", 0, a)).items.length, 0); checks++;
    assert.equal((await api.getPersonalLibraryItem("dish", recipe.id, a)).preview?.totals.energyKcal.value, 230); checks++;
    assert.equal((await api.getSavedNutritionMenu(menu.ration.id, a)).preview.totals.energyKcal.value, 230); checks++;
    const audits = await api.fixtureQuery<{ beforeJson: unknown; afterJson: unknown }>("SELECT \"beforeJson\",\"afterJson\" FROM data_change_logs WHERE \"entityType\" IN ('PersonalFood','PersonalDish')");
    assert.equal(audits.length, 4); checks++;
    assert.equal(JSON.stringify(audits).includes("nutrients"), false); checks++;
    console.log(`Personal library: ${checks} checks passed (disposable PostgreSQL; no live migration).`);
  } finally {
    if (api) await api.closeOAuthFixture();
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved); await removeNutritionFixtureDirectory(directory, "nutrition-personal-library-fixture-");
  }
}
if (process.argv[1]?.endsWith("test-personal-library.ts")) void main().catch(error => { console.error(error); process.exitCode = 1; });
