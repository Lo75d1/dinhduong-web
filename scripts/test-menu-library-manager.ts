import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { PRIMARY_SCHOOL_DRAFT } from "../src/lib/menu-library/contracts";
import { connectionCsrf } from "../src/lib/nutrition-chat/oauth-validation";
import type * as Store from "../src/lib/menu-library/store";
import type * as Batch from "../src/lib/menu-library/batch-store";
import type * as Db from "./fixtures/nutrition-oauth/database";
import type * as State from "./fixtures/nutrition-oauth/state";
import type * as BatchRoute from "../src/app/api/admin/menu-library/batch/route";
import type * as CatalogRoute from "../src/app/api/admin/menu-library/catalog/route";
import type { BatchOperation, MealRef, BatchRequest } from "../src/lib/menu-library/manager-contracts";
async function main() {
  const dir = await mkdtemp(join(tmpdir(), "menu-manager-")),
    require = createRequire(import.meta.url),
    saved = {
      ...process.env
    };
  let app: (typeof Store & typeof Batch & typeof Db & typeof State & {
    batchRoute: typeof BatchRoute;
    catalogRoute: typeof CatalogRoute;
  }) | undefined;
  let checks = 0;
  const check = (condition: unknown, message: string) => {
    checks++;
    assert.ok(condition, message);
  };
  try {
    process.env.APP_SECRET = "disposable-menu-manager-fixture-secret-only";
    process.env.NUTRITION_PUBLIC_URL = "https://dinhduong2598.food";
    const paths = ["src/lib/menu-library/store.ts", "src/lib/menu-library/batch-store.ts", "scripts/fixtures/nutrition-oauth/database.ts", "scripts/fixtures/nutrition-oauth/state.ts"];
    const routes = {
      batchRoute: "src/app/api/admin/menu-library/batch/route.ts",
      catalogRoute: "src/app/api/admin/menu-library/catalog/route.ts"
    };
    const outfile = join(dir, "test.cjs");
    await build({
      stdin: {
        contents: paths.map(path => `export * from ${JSON.stringify(resolve(path))}`).join(";\n") + ";\n" + Object.entries(routes).map(([name, path]) => `import * as ${name} from ${JSON.stringify(resolve(path))};export {${name}};`).join("\n"),
        resolveDir: process.cwd(),
        loader: "ts"
      },
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      logLevel: "silent",
      plugins: [{
        name: "fixture",
        setup(builder) {
          builder.onResolve({
            filter: /^server-only$/
          }, () => ({
            path: "empty",
            namespace: "empty"
          }));
          builder.onLoad({
            filter: /.*/,
            namespace: "empty"
          }, () => ({
            contents: "export {}"
          }));
          builder.onResolve({
            filter: /^@\/lib\/prisma$/
          }, () => ({
            path: resolve("scripts/fixtures/nutrition-oauth/database.ts")
          }));
          builder.onResolve({
            filter: /^@\/generated\/prisma\/client$/
          }, () => ({
            path: "prisma-sql",
            namespace: "prisma-sql"
          }));
          builder.onLoad({
            filter: /.*/,
            namespace: "prisma-sql"
          }, () => ({
            contents: `import {sqltag} from ${JSON.stringify(require.resolve("@prisma/client/runtime/client"))};export const Prisma={sql:sqltag};`,
            resolveDir: process.cwd()
          }));
          builder.onResolve({
            filter: /^(next\/headers|@\/lib\/auth)$/
          }, () => ({
            path: resolve("scripts/fixtures/nutrition-oauth/state.ts")
          }));
          builder.onResolve({
            filter: /^(\.\/repository|@\/lib\/nutrition-chat\/repository)$/
          }, args => /nutrition-chat[\\/]/.test(args.importer) || args.path.startsWith("@/") ? {
            path: resolve("scripts/fixtures/nutrition-oauth/repository.ts")
          } : null);
          builder.onResolve({
            filter: /^(\.\/downloads|@\/lib\/nutrition-chat\/downloads)$/
          }, () => ({
            path: resolve("scripts/fixtures/nutrition-oauth/downloads.ts")
          }));
          builder.onResolve({
            filter: /^(@electric-sql\/pglite|exceljs)$/
          }, args => ({
            path: require.resolve(args.path),
            external: true
          }));
        }
      }]
    });
    app = require(outfile);
    const api = app!;
    await api.initializeOAuthFixture(resolve("prisma/migrations/20261014090000_nutrition_chat_oauth/migration.sql"));
    for (const migration of ["20261021090000_admin_menu_library", "20261022120000_menu_library_reviews"]) await api.applyFixtureMigration(resolve(`prisma/migrations/${migration}/migration.sql`));
    await api.fixtureQuery("UPDATE app_users SET role='ADMIN' WHERE id='user-a'");
    await api.fixtureQuery('CREATE TABLE foods(id text PRIMARY KEY,name text,unit text)');
    await api.fixtureQuery('CREATE TABLE dishes(id text PRIMARY KEY)');
    await api.fixtureQuery('CREATE TABLE diet_codes(id text PRIMARY KEY)');
    await api.fixtureQuery("INSERT INTO foods VALUES ('rice','Gạo','g'),('salt','Muối','g')");
    const admin = {
        id: "user-a",
        email: "admin@example.invalid",
        displayName: "Fixture",
        role: "ADMIN"
      },
      actor: Store.MenuActor = {
        userId: "user-a",
        clientId: null,
        familyId: null,
        via: "session"
      };
    const base = "https://dinhduong2598.food",
      web = {
        Origin: base,
        "x-menu-library-csrf": connectionCsrf(admin.id)
      };
    const request = (path: string, body?: unknown, headers: Record<string, string> = web) => new Request(`${base}/api/admin/menu-library/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...headers,
        ...(body ? {
          "Content-Type": "application/json"
        } : {})
      },
      ...(body ? {
        body: JSON.stringify(body)
      } : {})
    });
    async function status(response: Response, expected: number) {
      checks++;
      assert.equal(response.status, expected, response.status === expected ? undefined : await response.text());
      check(response.headers.get("cache-control")?.includes("no-store"), "No-store route");
    }
    const batch = (operation: BatchOperation, key = `test-${crypto.randomUUID()}`): BatchRequest => ({
      ...operation,
      requestKey: key,
      reason: "Admin fixture operation"
    });
    const trash = batch({
      action: "trash",
      items: [{
        id: "a",
        revision: 1
      }]
    });
    await status(await api.batchRoute.POST(request("batch", trash)), 401);
    api.setFixtureUser({
      ...admin,
      id: "user-b",
      role: "CLINICIAN"
    });
    await status(await api.batchRoute.POST(request("batch", trash)), 403);
    api.setFixtureUser(admin);
    await status(await api.batchRoute.POST(request("batch", trash, {
      Origin: base
    })), 403);
    await status(await api.batchRoute.POST(request("batch", trash, {
      ...web,
      Origin: "https://evil.invalid"
    })), 403);
    await status(await api.batchRoute.POST(request("batch", trash, {
      ...web,
      Authorization: "Bearer not-a-web-session"
    })), 403);
    for (const invalid of [{
      ...trash,
      action: "destroy"
    }, {
      ...trash,
      items: [{
        id: "a",
        revision: 0
      }]
    }, {
      ...trash,
      items: [{
        id: "a",
        revision: 1
      }, {
        id: "a",
        revision: 1
      }]
    }, {
      ...trash,
      content: {
        title: "injection"
      }
    }]) await status(await api.batchRoute.POST(request("batch", invalid)), 400);
    function draft(id: string) {
      const value = structuredClone(PRIMARY_SCHOOL_DRAFT);
      value.id = id;
      value.title = `Thực đơn ${id} · 7 ngày`;
      value.direction = "individual";
      value.librarySection = "individual";
      value.unit = null;
      value.description = `Mô tả ${id}`;
      value.tags = ["Nhãn thật"];
      value.eatingContext = id === "a" ? "restaurant" : "home";
      value.groups = [{
        ...value.groups[0],
        schoolLevel: null,
        label: "Người lớn",
        designEnergyKcal: 1900,
        lifeStage: "adult"
      }];
      value.days = [1, 2].map(index => ({
        id: `${id}-day-${index}`,
        dayIndex: index,
        date: null,
        meals: ["breakfast", "lunch"].map((code, i) => ({
          id: `${id}-meal-${index}-${i}`,
          code: code as "breakfast" | "lunch",
          label: i ? "Trưa" : "Sáng",
          groupPortions: [{
            groupId: value.groups[0].id,
            headcount: null,
            mealRuleIds: [],
            dishes: [{
              id: `${id}-dish-${index}-${i}`,
              label: `Món ${id} ${index} ${i}`,
              sourceKind: "manual",
              recipeId: null,
              ingredients: [{
                foodId: "rice",
                quantityPerPortion: 60,
                unit: "g",
                basis: "edible_raw",
                edibleFraction: null,
                cookingYield: null
              }]
            }]
          }]
        }))
      }));
      return value;
    }
    for (const id of ["a", "b", "c"]) await api.saveMenuTemplate(actor, {
      content: draft(id),
      requestKey: `new-${id}`,
      reason: "Create fixture"
    });
    const legacy = draft("a");
    legacy.days[0].meals[0].groupPortions[0].dishes[0].ingredients.push({
      foodId: "salt",
      quantityPerPortion: .25,
      unit: "g",
      basis: "edible_raw",
      edibleFraction: null,
      cookingYield: null
    });
    await api.fixtureQuery("UPDATE menu_library_templates SET document=$1 WHERE id='a'", [JSON.stringify(legacy)]);
    await api.fixtureQuery("UPDATE menu_library_versions SET document=$1 WHERE \"templateId\"='a'", [JSON.stringify(legacy)]);
    const catalog = await api.catalogRoute.GET(request("catalog"));
    await status(catalog, 200);
    const list = await catalog.json();
    check(list.total === 3 && list.items.length === 3, "Count templates, not six expanded days");
    check(list.csrf === web["x-menu-library-csrf"], "Catalog provides session CSRF");
    check(list.items.every((item: {
      days: unknown[];
    }) => item.days.length === 2), "Actual day count wins over title");
    check(!JSON.stringify(list).includes('quantityPerPortion'), "Catalog excludes ingredient documents");
    const searched = await (await api.catalogRoute.GET(request("catalog?q=Món%20a%202"))).json();
    check(searched.total === 1, "Search all stored days before paging");
    const tagged = await (await api.catalogRoute.GET(request("catalog?q=Nhãn%20thật"))).json();
    check(tagged.total === 3, "Search tags");
    await status(await api.catalogRoute.GET(request("catalog?section=invalid")), 400);
    const stale = batch({
      action: "trash",
      items: [{
        id: "a",
        revision: 1
      }, {
        id: "b",
        revision: 99
      }]
    });
    await status(await api.batchRoute.POST(request("batch", stale)), 409);
    check((await api.getMenuTemplate(actor, "a")).template.revision === 1, "Stale batch changes no template");
    const deletion = batch({
      action: "trash",
      items: [{
        id: "a",
        revision: 1
      }, {
        id: "b",
        revision: 1
      }]
    });
    const removed = await api.batchMenuTemplates(actor, deletion);
    check(removed.items.length === 2, "Bulk delete modifies both");
    check((await api.getMenuTemplate(actor, "a")).content.availability?.state === "archived", "Deleted content retained in trash");
    check((await (await api.catalogRoute.GET(request("catalog"))).json()).total === 1, "Trash hidden from active catalog");
    check((await (await api.catalogRoute.GET(request("catalog?availability=archived"))).json()).total === 2, "Trash catalog lists both");
    await api.batchMenuTemplates(actor, batch({
      action: "restore",
      items: [{
        id: "a",
        revision: 2
      }, {
        id: "b",
        revision: 2
      }]
    }));
    const ref: MealRef = {
      id: "a",
      revision: 3,
      dayId: "a-day-1",
      mealId: "a-meal-1-0",
      groupId: legacy.groups[0].id
    };
    const copy = batch({
      action: "transfer",
      meals: [ref],
      targets: [{
        id: "b",
        revision: 3,
        dayId: "b-day-2",
        groupId: ref.groupId
      }, {
        id: "c",
        revision: 1,
        dayId: "c-day-1",
        groupId: ref.groupId
      }],
      mode: "copy"
    });
    await api.batchMenuTemplates(actor, copy);
    const b = await api.getMenuTemplate(actor, "b"),
      c = await api.getMenuTemplate(actor, "c");
    check(b.template.revision === 4 && c.template.revision === 2, "Copy into several templates atomically");
    check(b.content.days[1].meals.length === 3, "Append whole meal");
    const copied = b.content.days[1].meals[2];
    check(copied.groupPortions[0].dishes[0].ingredients[1].quantityPerPortion === .25, "Copy exact legacy spice, no rounding");
    check(copied.groupPortions[0].dishes[0].ingredients[0].foodId === "rice", "Real food ID preserved");
    check(copied.id !== ref.mealId, "Copied meal gets independent ID");
    check((await api.getMenuTemplate(actor, "a")).template.revision === 3, "Copy does not write the source");
    check(b.content.eatingContext === "mixed" && b.content.days[0].meals[0].eatingContext === "home" && copied.eatingContext === "restaurant", "Copy preserves explicit origin and prior inherited meal context");
    check((await api.batchMenuTemplates(actor, copy)).replayed, "Network retry is idempotent");
    check((await api.getMenuTemplate(actor, "b")).content.days[1].meals.length === 3, "Retry cannot duplicate meals");
    await assert.rejects(() => api.batchMenuTemplates(actor, {
      ...copy,
      reason: "Different operation"
    }), {
      status: 409
    });
    checks++;
    await api.batchMenuTemplates(actor, batch({
      action: "transfer",
      meals: [{
        ...ref,
        mealId: "a-meal-1-1"
      }],
      targets: [{
        id: "b",
        revision: 4,
        dayId: "b-day-1",
        groupId: ref.groupId
      }],
      mode: "move"
    }));
    check((await api.getMenuTemplate(actor, "a")).content.days[0].meals.length === 1, "Move removes source portion");
    const afterMove = await api.getMenuTemplate(actor, "b");
    check(afterMove.content.days[0].meals.length === 3, "Move appends destination");
    const ids = afterMove.content.days[0].meals.map(meal => meal.id).reverse();
    await api.batchMenuTemplates(actor, batch({
      action: "reorder",
      item: {
        id: "b",
        revision: 5
      },
      dayId: "b-day-1",
      mealIds: ids
    }));
    assert.deepEqual((await api.getMenuTemplate(actor, "b")).content.days[0].meals.map(meal => meal.id), ids);
    checks++;
    await assert.rejects(() => api.batchMenuTemplates(actor, batch({
      action: "reorder",
      item: {
        id: "b",
        revision: 6
      },
      dayId: "b-day-1",
      mealIds: [ids[0], ids[0]]
    })), {
      status: 409
    });
    checks++;
    const multi = structuredClone(PRIMARY_SCHOOL_DRAFT);
    multi.id = "multi";
    multi.days[0].meals[0].groupPortions.forEach(p => {
      p.mealRuleIds = [];
    });
    await api.saveMenuTemplate(actor, {
      content: multi,
      requestKey: "multi",
      reason: "Multi group"
    });
    await api.batchMenuTemplates(actor, batch({
      action: "remove_meals",
      meals: [{
        id: "multi",
        revision: 1,
        dayId: multi.days[0].id,
        mealId: multi.days[0].meals[0].id,
        groupId: multi.groups[0].id
      }, {
        id: "a",
        revision: 4,
        dayId: "a-day-2",
        mealId: "a-meal-2-1",
        groupId: ref.groupId
      }]
    }));
    check((await api.getMenuTemplate(actor, "multi")).content.days[0].meals[0].groupPortions.length === 2, "Removing a group meal retains the other groups");
    check((await api.getMenuTemplate(actor, "a")).content.days[1].meals.length === 1, "Remove meals across different menus");
    await api.batchMenuTemplates(actor, batch({
      action: "tag",
      items: [{
        id: "a",
        revision: 5
      }, {
        id: "b",
        revision: 6
      }],
      tags: ["Mềm", "#Mềm"]
    }));
    check((await api.getMenuTemplate(actor, "a")).content.tags?.join("|") === "Nhãn thật|Mềm", "Tags deduplicate and preserve existing tags");
    await api.batchMenuTemplates(actor, batch({
      action: "section",
      items: [{
        id: "a",
        revision: 6
      }],
      section: "hospital",
      hospitalUse: "patient_guidance"
    }));
    check((await api.getMenuTemplate(actor, "a")).content.hospitalUse === "patient_guidance", "Hospital patient guidance stays distinct");
    check((await (await api.catalogRoute.GET(request("catalog?section=hospital&hospitalUse=patient_guidance"))).json()).total === 1, "Hospital subcategory filter");
    const currentA = await api.getMenuTemplate(actor, "a"), currentB = await api.getMenuTemplate(actor, "b"), currentC = await api.getMenuTemplate(actor, "c");
    const corrupt = structuredClone(currentC.content);corrupt.days[0].meals[0].groupPortions[0].dishes[0].ingredients[0].foodId = "no-such-food";
    await api.fixtureQuery("UPDATE menu_library_templates SET document=$1 WHERE id='c'", [JSON.stringify(corrupt)]);
    const sourceNow = { ...ref, revision: currentA.template.revision };
    const targetNow = (opened: typeof currentB) => ({ id: opened.template.id, revision: opened.template.revision, dayId: opened.content.days[0].id, groupId: opened.content.groups[0].id });
    await assert.rejects(() => api.batchMenuTemplates(actor, batch({ action: "transfer", meals: [sourceNow], targets: [targetNow(currentB), targetNow(currentC)], mode: "copy" })), { status: 422 });checks++;
    check((await api.getMenuTemplate(actor, "b")).template.revision === currentB.template.revision, "A later catalog-ID failure rolls back an earlier destination write");
    await api.fixtureQuery("UPDATE menu_library_templates SET document=$1 WHERE id='c'", [JSON.stringify(currentC.content)]);
    const many = [currentA, currentB, currentC].flatMap(opened => opened.content.days.flatMap(day => day.meals.map(meal => ({ id: opened.template.id, revision: opened.template.revision, dayId: day.id, mealId: meal.id, groupId: opened.content.groups[0].id })))).slice(0, 9);
    await assert.rejects(() => api.batchMenuTemplates(actor, batch({ action: "transfer", meals: many, targets: [targetNow(currentB)], mode: "copy" })), { status: 422 });checks++;
    check((await api.getMenuTemplate(actor, "b")).template.revision === currentB.template.revision, "Over-capacity copy does not change the destination");
    for (let i = 0; i < 25; i++) {
      const d = draft(`page-${i}`);
      await api.fixtureQuery('INSERT INTO menu_library_templates(id,title,direction,document,"createdBy","requestKey","contentHash","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)', [d.id, d.title, d.direction, JSON.stringify(d), actor.userId, d.id, "fixture"]);
    }
    const page = await (await api.catalogRoute.GET(request("catalog?section=individual"))).json();
    check(page.items.length === 24 && page.nextOffset === 24 && page.total === 27, "Server pagination uses menus");
    const second = await (await api.catalogRoute.GET(request("catalog?section=individual&offset=24"))).json();
    check(second.items.length === 3 && second.items.every((item: {
      id: string;
    }) => !page.items.some((first: {
      id: string;
    }) => first.id === item.id)), "Distinct second page");
    check((await (await api.catalogRoute.GET(request("catalog?q=%25'%20OR%201%3D1--&section="))).json()).total === 0, "Literal parameterized search");
    console.log(`Menu manager: ${checks} checks passed (auth/CSRF, real PostgreSQL, menu counts, atomic bulk trash/restore, transfer, exact quantities, revision conflicts, retry, tags, categories and paging).`);
  } finally {
    if (app) await app.closeOAuthFixture();
    process.env = saved;
    await rm(dir, {
      recursive: true,
      force: true
    });
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
