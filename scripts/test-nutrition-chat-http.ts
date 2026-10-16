import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { removeNutritionFixtureDirectory } from "./fixtures/nutrition-oauth/safe-temp";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import {createHash} from "node:crypto";
import type * as Rest from "../src/app/api/nutrition/v1/[action]/route";
import type * as Mcp from "../src/app/api/nutrition/v1/mcp/route";
import type * as Upload from "../src/app/api/nutrition/v1/import/route";
import type * as WebReport from "../src/app/api/nutrition-report/export/route";
import type * as Service from "../src/lib/nutrition-chat/service";
import type * as Workbook from "../src/lib/nutrition-chat/workbook";
import type * as Database from "./fixtures/nutrition-oauth/database";
import type * as State from "./fixtures/nutrition-oauth/state";
import type * as Repository from "./fixtures/nutrition-oauth/repository";
import type * as Output from "../src/lib/nutrition-chat/mcp-output";
import type { MenuInput } from "../src/lib/nutrition-chat/contracts";
import { getNutritionPublicUrl, getNutritionResourceUrl, hashNutritionToken, randomNutritionToken } from "../src/lib/nutrition-chat/oauth-validation";
type Runtime = typeof Service & typeof Workbook & typeof Database & typeof State & typeof Repository & typeof Output & { restRoute: typeof Rest; mcpRoute: typeof Mcp; importRoute: typeof Upload; webReportRoute: typeof WebReport };
let checks = 0;

async function main() {
  const saved = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "nutrition-http-fixture-"));
  const require = createRequire(import.meta.url);
  let runtime: Runtime | undefined;
  try {
    process.env.NUTRITION_PUBLIC_URL = "https://dinhduong2598.food";
    process.env.APP_SECRET = "disposable-http-fixture-placeholder-only";
    delete process.env.NUTRITION_ALLOWED_ORIGINS;
    delete process.env.NUTRITION_TRUST_PROXY;
    const sources = ["src/lib/nutrition-chat/service.ts", "src/lib/nutrition-chat/workbook.ts", "src/lib/nutrition-chat/mcp-output.ts", "scripts/fixtures/nutrition-oauth/database.ts", "scripts/fixtures/nutrition-oauth/state.ts", "scripts/fixtures/nutrition-oauth/repository.ts"];
    const routes = { restRoute: "src/app/api/nutrition/v1/[action]/route.ts", mcpRoute: "src/app/api/nutrition/v1/mcp/route.ts", importRoute: "src/app/api/nutrition/v1/import/route.ts", webReportRoute: "src/app/api/nutrition-report/export/route.ts" };
    const outfile = join(directory, "http-fixture.cjs");
    await build({ stdin: { contents: sources.map(path => `export * from ${JSON.stringify(resolve(path))};`).join("\n") + "\n" + Object.entries(routes).map(([label, path]) => `import * as ${label} from ${JSON.stringify(resolve(path))}; export {${label}};`).join("\n"), resolveDir: process.cwd(), loader: "ts" }, outfile,
      bundle: true, platform: "node", format: "cjs", logLevel: "silent", plugins: [{ name: "disposable-http", setup(builder) {
        builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only-stub", namespace: "empty" }));
        builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};", loader: "js" }));
        builder.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/database.ts") }));
        builder.onResolve({ filter: /^(next\/headers|@\/lib\/auth)$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/state.ts") }));
        builder.onResolve({ filter: /^(\.\/repository|@\/lib\/nutrition-chat\/repository)$/ }, args => /nutrition-chat[\\/]/.test(args.importer) || args.path.startsWith("@/") ? { path: resolve("scripts/fixtures/nutrition-oauth/repository.ts") } : null);
        builder.onResolve({ filter: /^(\.\/downloads|@\/lib\/nutrition-chat\/downloads)$/ }, () => ({ path: resolve("scripts/fixtures/nutrition-oauth/downloads.ts") }));
        builder.onResolve({ filter: /^(@electric-sql\/pglite|exceljs)$/ }, args => ({ path: require.resolve(args.path), external: true }));
      } }] });
    runtime = require(outfile) as Runtime;
    const api = runtime;
    await api.initializeOAuthFixture(resolve("prisma/migrations/20261014090000_nutrition_chat_oauth/migration.sql"));
    const base = getNutritionPublicUrl(), resource = getNutritionResourceUrl();
    const scopes = ["nutrition:read", "nutrition:calculate", "nutrition:write", "nutrition:export"];
    async function bearer(userId = "user-a", granted = scopes) {
      const token = randomNutritionToken(), clientId = `nc_${randomNutritionToken()}`, family = randomNutritionToken();
      await api.fixtureQuery(`INSERT INTO "nutrition_oauth_clients" ("id","name","redirectUris","scopes","expiresAt") VALUES ($1,'HTTP fixture',$2,$3,$4)`, [clientId, ["https://claude.ai/api/mcp/auth_callback"], scopes, new Date(Date.now() + 86400_000)]);
      await api.fixtureQuery(`INSERT INTO "nutrition_oauth_tokens" ("id","familyId","userId","clientId","accessHash","refreshHash","scopes","issuer","audience","accessExpiresAt","refreshExpiresAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [randomNutritionToken(), family, userId, clientId, hashNutritionToken(token), hashNutritionToken(randomNutritionToken()), granted, base, resource, new Date(Date.now() + 900_000), new Date(Date.now() + 86400_000)]);
      return token;
    }
    const token = await bearer(), bToken = await bearer("user-b"), readToken = await bearer("user-a", ["nutrition:read"]);
    const menu: MenuInput = { title: "HTTP fixture", mode: "menu", comparison: { mode: "none" }, days: [{ id: "day-1", date: "2026-10-14", label: "Ngày 1", rows: [{ id: "row-1", foodId: "fixture-rice", dish: "Cơm", meal: "Trưa", quantity: 100, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Người dùng xác nhận (fixture)" } }] }] };
    const context = (action: string) => ({ params: Promise.resolve({ action }) });
    function request(path: string, value: unknown, access?: string, extra: Record<string, string> = {}) {
      return new Request(`${base}/api/nutrition/v1/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(access ? { Authorization: `Bearer ${access}` } : {}), ...extra }, body: JSON.stringify(value) });
    }
    async function rest(action: string, value: unknown, access: string | undefined = token, extra: Record<string, string> = {}) {
      return api.restRoute.POST(request(action, value, access, extra), context(action));
    }
    async function get(action: string, access: string | undefined = token, query = "") {
      return api.restRoute.GET(new Request(`${base}/api/nutrition/v1/${action}${query}`, { headers: access ? { Authorization: `Bearer ${access}` } : {} }), context(action));
    }
    let noAuth = await api.restRoute.POST(request("prepare", { input: menu }, undefined, { Origin: base }), context("prepare"));
    assert.equal(noAuth.status, 401); checks++;
    assert.ok(noAuth.headers.get("www-authenticate")?.includes("oauth-protected-resource")); checks++;
    noAuth = await api.restRoute.POST(request("prepare", { input: menu }), context("prepare"));
    assert.equal(noAuth.status, 403); checks++;
    assert.equal((await rest("prepare", { input: menu }, token, { Origin: "https://evil.test" })).status, 403); checks++;
    const missingScope = await rest("prepare", { input: menu }, readToken);
    assert.equal(missingScope.status, 403); checks++;
    assert.ok(missingScope.headers.get("www-authenticate")?.includes("nutrition:calculate")); checks++;
    assert.equal((await rest("unknown", {})).status, 404); checks++;
    assert.equal((await rest("prepare", { input: menu, extra: true })).status, 400); checks++;
    assert.equal((await rest("get_diet_code", { id: "fixture-diet" }, readToken)).status, 200); checks++;
    assert.equal((await rest("get_diet_code", { id: "missing-code" }, readToken)).status, 404); checks++;
    assert.equal((await rest("get_diet_code", { id: "fixture-diet", ownerId: "user-b" }, readToken)).status, 400); checks++;
    const dietSearch = await rest("search_diet_codes", { q: "TEST", targetGroup: "NguoiLon" }, readToken);
    assert.equal(dietSearch.status, 200); checks++;
    assert.equal((await dietSearch.json()).items[0].code, "TEST-01"); checks++;
    const preparedResponse = await rest("prepare", { input: menu });
    assert.equal(preparedResponse.status, 200); checks++;
    const prepared = await preparedResponse.json() as Awaited<ReturnType<typeof Service.prepareNutritionMenu>>;
    const confirmedArgs = { input: prepared.input, confirmationToken: prepared.confirmationToken };
    assert.equal((await rest("calculate", { input: menu, confirmationToken: "bad" })).status, 409); checks++;
    const calculated = await rest("calculate", confirmedArgs);
    assert.equal(calculated.status, 200); checks++;
    const calculationBody = await calculated.json();
    assert.equal(calculationBody.totals.energyKcal.value, 130); checks++;
    assert.equal(calculationBody.chatReport.format, "markdown"); checks++;
    assert.ok(calculationBody.chatReport.text.includes("**130 kcal**")); checks++;
    const savedResponse = await rest("save", { ...confirmedArgs, idempotencyKey: "http-save" });
    assert.equal(savedResponse.status, 200); checks++;
    const savedMenu = await savedResponse.json() as Awaited<ReturnType<typeof Service.saveNutritionMenu>>;
    assert.equal(savedMenu.ration.revision, 1); checks++;
    assert.equal((await get("saved", token, `?id=${savedMenu.ration.id}`)).status, 200); checks++;
    assert.equal((await get("saved", bToken, `?id=${savedMenu.ration.id}`)).status, 404); checks++;
    assert.equal((await get("saved", token)).status, 200); checks++;
    const updatedResponse = await rest("save", { ...confirmedArgs, idempotencyKey: "http-update", rationId: savedMenu.ration.id, expectedRevision: 1 });
    assert.equal(updatedResponse.status, 200); checks++;
    assert.equal((await updatedResponse.json()).ration.revision, 2); checks++;
    assert.equal((await rest("save", { ...confirmedArgs, idempotencyKey: "http-stale", rationId: savedMenu.ration.id, expectedRevision: 1 })).status, 409); checks++;
    assert.equal((await rest("export", confirmedArgs)).status, 200); checks++;
    api.setFixtureUser({ id: "user-a", displayName: "User A fixture", email: "fixture@example.test", role: "CLINICIAN" });
    assert.equal((await api.restRoute.POST(request("prepare", { input: menu }, undefined, { Origin: base }), context("prepare"))).status, 200); checks++;
    assert.equal((await api.restRoute.POST(request("prepare", { input: menu }, undefined, { Origin: "https://evil.test" }), context("prepare"))).status, 403); checks++;
    api.setFixtureUser(null);

    let rpcId = 0;
    function rpcRequest(method: string, params: Record<string, unknown>, access: string | undefined = token, modern = false, extra: Record<string, string> = {}) {
      const version = modern ? "2026-07-28" : "2025-11-25";
      const meta = modern ? { _meta: { "io.modelcontextprotocol/protocolVersion": version, "io.modelcontextprotocol/clientCapabilities": {} } } : {};
      return request("mcp", { jsonrpc: "2.0", id: ++rpcId, method, params: { ...params, ...meta } }, access, { Accept: "application/json, text/event-stream", "Mcp-Protocol-Version": version, ...(modern ? { "Mcp-Method": method, ...(method === "tools/call" ? { "Mcp-Name": String(params.name) } : {}) } : {}), ...extra });
    }
    const anonymousList = await api.mcpRoute.POST(rpcRequest("tools/list", {}, ""));
    assert.equal(anonymousList.status, 200); checks++;
    const anonymousTools = (await anonymousList.json()).result.tools;
    assert.equal(anonymousTools.length, 15); checks++;
    assert.deepEqual(anonymousTools.find((tool: { name: string }) => tool.name === "get_workflow").securitySchemes, [{ type: "noauth" }]); checks++;
    for (const tool of anonymousTools.filter((item: { name: string }) => item.name !== "get_workflow")) { assert.equal(tool.securitySchemes[0].type, "oauth2"); checks++; }
    const anonymousInit = await api.mcpRoute.POST(rpcRequest("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "anonymous fixture", version: "1" } }, ""));
    assert.equal(anonymousInit.status, 200); checks++;
    assert.equal((await anonymousInit.json()).result.protocolVersion, "2025-06-18"); checks++;
    const anonymousDiscovery = await api.mcpRoute.POST(rpcRequest("server/discover", {}, "", true));
    assert.equal(anonymousDiscovery.status, 200); checks++;
    const discovered=(await anonymousDiscovery.json()).result;assert.ok(discovered.capabilities.extensions["io.modelcontextprotocol/skills"]);checks++;
    const skillList=await api.mcpRoute.POST(rpcRequest("skills/list",{},""));assert.equal(skillList.status,200);checks++;
    const skills=(await skillList.json()).result.skills;assert.equal(skills.length,2);checks++;
    for(const skill of skills){const detail=await api.mcpRoute.POST(rpcRequest("skills/get",{uri:skill.uri},"",true));assert.deepEqual((await detail.json()).result.skill,skill);checks++;
      for(const resource of skill.resources){const read=await api.mcpRoute.POST(rpcRequest("resources/read",{uri:resource.uri},""));assert.equal(read.status,200);checks++;const contents=(await read.json()).result.contents;assert.equal(contents.length,1);checks++;assert.equal(contents[0].uri,resource.uri);checks++;assert.equal(`sha256:${createHash("sha256").update(contents[0].text,"utf8").digest("hex")}`,resource.digest);checks++;}}
    assert.equal((await api.mcpRoute.POST(rpcRequest("resources/read",{uri:"file:///etc/passwd"},""))).status,404);checks++;
    assert.equal((await api.mcpRoute.POST(rpcRequest("resources/read",{uri:"skill://dinh-duong-2598/../.env"},""))).status,404);checks++;
    assert.equal((await api.mcpRoute.POST(rpcRequest("skills/list",{cursor:"unknown"},""))).status,400);checks++;
    const anonymousWorkflow = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "get_workflow", arguments: {} }, "", true));
    assert.equal(anonymousWorkflow.status, 200); checks++;
    assert.equal((await anonymousWorkflow.json()).result.structuredContent.name, "Dinh dưỡng 2598"); checks++;
    const malformedWorkflow = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "get_workflow", arguments: { ownerId: "user-b" } }, "", true));
    assert.equal((await malformedWorkflow.json()).result.isError, true); checks++;
    assert.equal((await api.mcpRoute.POST(rpcRequest("tools/list", {}, "bad-token"))).status, 401); checks++;
    for (const tool of anonymousTools.filter((item: { name: string }) => item.name !== "get_workflow")) {
      const denied = await api.mcpRoute.POST(rpcRequest("tools/call", { name: tool.name, arguments: {} }, "", true));
      assert.equal(denied.status, 401); checks++;
      const deniedBody = (await denied.json()).result;
      assert.equal(deniedBody.isError, true); checks++;
      assert.ok(deniedBody._meta["mcp/www_authenticate"][0].includes('error="invalid_token"')); checks++;
      assert.ok(deniedBody._meta["mcp/www_authenticate"][0].includes("error_description=")); checks++;
      assert.equal(deniedBody._meta["io.modelcontextprotocol/serverInfo"].name, "dinh-duong-2598"); checks++;
      assert.equal(deniedBody.structuredContent, undefined); checks++;
    }
    const legacyDenied = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "search_foods", arguments: { q: "cơm" } }, ""));
    assert.ok((await legacyDenied.json()).result._meta["mcp/www_authenticate"][0].includes("nutrition:read")); checks++;
    const badOrigin = await api.mcpRoute.POST(rpcRequest("tools/list", {}, token, false, { Origin: "https://evil.test" }));
    const badOriginStatus = badOrigin.status; // Assert after other cases to expose independent regressions.
    const list = await api.mcpRoute.POST(rpcRequest("tools/list", {}));
    assert.equal(list.status, 200); checks++;
    assert.ok((await list.json()).result.tools.some((tool: { name: string }) => tool.name === "save_menu")); checks++;
    const init = await api.mcpRoute.POST(rpcRequest("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "fixture", version: "1" } }));
    assert.equal(init.status, 200); checks++;
    assert.equal((await init.json()).result.protocolVersion, "2025-11-25"); checks++;
    const modernList = await api.mcpRoute.POST(rpcRequest("tools/list", {}, token, true));
    assert.equal(modernList.status, 200); checks++;
    assert.equal((await modernList.json()).result.resultType, "complete"); checks++;
    assert.equal((await api.mcpRoute.POST(rpcRequest("tools/list", {}, token, true, { "Mcp-Method": "tools/call" }))).status, 400); checks++;
    const unknownRpcRequest = rpcRequest("unknown/method", {}), unknownId = rpcId;
    const unknownRpc = await api.mcpRoute.POST(unknownRpcRequest);
    assert.equal(unknownRpc.status, 404); checks++;
    assert.equal((await unknownRpc.json()).id, unknownId); checks++;
    const unknownToolRequest = rpcRequest("tools/call", { name: "unknown_tool", arguments: {} }), unknownToolId = rpcId;
    const unknownTool = await api.mcpRoute.POST(unknownToolRequest);
    assert.equal(unknownTool.status, 400); checks++;
    assert.equal((await unknownTool.json()).id, unknownToolId); checks++;
    const wrongArgs = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "prepare_menu", arguments: { input: menu, extra: true } }));
    assert.equal(wrongArgs.status, 200); checks++;
    assert.equal((await wrongArgs.json()).result.isError, true); checks++;
    const scopeDenied = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "save_menu", arguments: { ...confirmedArgs, idempotencyKey: "mcp-write-denied" } }, readToken));
    assert.equal(scopeDenied.status, 403); checks++;
    assert.ok((await scopeDenied.json()).result._meta["mcp/www_authenticate"][0].includes('error="insufficient_scope"')); checks++;
    const mcpPrepared = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "prepare_menu", arguments: { input: menu } }, token, true));
    assert.equal(mcpPrepared.status, 200); checks++;
    const mcpPreview = (await mcpPrepared.json()).result.structuredContent as Awaited<ReturnType<typeof Service.prepareNutritionMenu>>;
    const mcpCalculated = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "calculate_menu", arguments: { input: mcpPreview.input, confirmationToken: mcpPreview.confirmationToken } }, token, true));
    assert.equal(mcpCalculated.status, 200); checks++;
    const mcpCalculationBody = await mcpCalculated.json();
    assert.equal(mcpCalculationBody.result.structuredContent.totals.energyKcal.value, 130); checks++;
    assert.ok(mcpCalculationBody.result.structuredContent.chatReport.text.includes("P–L–G")); checks++;
    assert.deepEqual(JSON.parse(mcpCalculationBody.result.content[0].text).chatReport, mcpCalculationBody.result.structuredContent.chatReport); checks++;
    assert.equal((await api.mcpRoute.GET()).status, 405); checks++;
    assert.equal((await api.mcpRoute.DELETE()).status, 405); checks++;
    const largeMenu: MenuInput = structuredClone(menu);
    largeMenu.days[0].rows = Array.from({ length: 350 }, (_, i) => ({ ...menu.days[0].rows[0], id: `large-row-${i}`, note: "x".repeat(400) }));
    const clientId = (await api.fixtureQuery<{ clientId: string }>('SELECT "clientId" FROM "nutrition_oauth_tokens" WHERE "accessHash"=$1', [hashNutritionToken(token)]))[0].clientId;
    const largePrepared = await api.prepareNutritionMenu(largeMenu, { userId: "user-a", clientId, scopes });
    const oversizedPrepare = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "prepare_menu", arguments: { input: largeMenu } }, token, true));
    assert.equal(oversizedPrepare.status, 200); checks++;
    const oversizedBody = await oversizedPrepare.json();
    assert.equal(oversizedBody.result.isError, true); checks++;
    assert.equal(JSON.parse(oversizedBody.result.content[0].text).status, 413); checks++;
    const compactCalculation = await api.mcpRoute.POST(rpcRequest("tools/call", { name: "calculate_menu", arguments: { input: largePrepared.input, confirmationToken: largePrepared.confirmationToken } }, token, true));
    assert.equal(compactCalculation.status, 200); checks++;
    const compactBody = await compactCalculation.json();
    assert.equal(compactBody.result.structuredContent.outputCompacted, true); checks++;
    assert.equal(compactBody.result.structuredContent.totals.energyKcal.value, 45500); checks++;
    assert.ok(compactBody.result.structuredContent.chatReport.text.includes("**45.500 kcal**")); checks++;
    assert.ok(compactBody.result.structuredContent.chatReport.text.includes("Chưa có mục tiêu nhu cầu")); checks++;
    assert.ok(JSON.stringify(compactBody.result).length < 140_000); checks++;
    const smallOutput = api.nutritionMcpOutput("get_workflow", { name: "small fixture" });
    assert.equal(smallOutput.includeStructured, true); checks++;
    const mediumOutput = api.nutritionMcpOutput("get_workflow", { padding: "x".repeat(90_000) });
    assert.equal(mediumOutput.includeStructured, false); checks++;
    assert.ok(JSON.stringify({ content: [{ type: "text", text: mediumOutput.text }] }).length + 1000 <= 140_000); checks++;
    assert.throws(() => api.nutritionMcpOutput("get_workflow", { padding: '"\\'.repeat(45_000) }), error => !!error && typeof error === "object" && "status" in error && error.status === 413); checks++;
    const saveOutput = api.nutritionMcpOutput("save_menu", { ration: savedMenu.ration, replayed: false, input: largePrepared.input, preview: largePrepared.preview });
    assert.equal((saveOutput.data as { ration: { id: string } }).ration.id, savedMenu.ration.id); checks++;
    assert.ok(saveOutput.text.length < 140_000); checks++;
    const historyOutput = api.nutritionMcpOutput("get_saved_menu", { ...prepared, ration: savedMenu.ration, historyTruncated: false,
      history: [{ revision: 2, clientId: "fixture-client", confirmedAt: new Date().toISOString(), dataVersion: prepared.preview.dataVersion,
        changes: [{ rowId: "row-1", before: { quantity: 100, note: "x".repeat(160_000) }, after: { quantity: 200 } }],
      }],
    });
    const historySummary = historyOutput.data as { history: { revision: number; changedRowCount: number; changes?: unknown }[]; historyDetailsCompacted: boolean };
    assert.equal(historySummary.historyDetailsCompacted, true); checks++;
    assert.equal(historySummary.history[0].revision, 2); checks++;
    assert.equal(historySummary.history[0].changedRowCount, 1); checks++;
    assert.equal(historySummary.history[0].changes, undefined); checks++;
    assert.ok(historyOutput.text.length < 140_000); checks++;

    // Real workbook build and import parser, fake nutrient catalogue. Export endpoint above
    // is a stub solely to exercise routing; it does not count as real file download coverage.
    const workbook = await api.buildNutritionWorkbook(prepared.preview, await api.loadNutritionCatalogue());
    const multipart = new FormData();
    multipart.append("file", new File([new Uint8Array(workbook)], "fixture.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const imported = await api.importRoute.POST(new Request(`${base}/api/nutrition/v1/import`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: multipart }));
    assert.equal(imported.status, 200, await imported.clone().text()); checks++;
    assert.equal((await imported.json()).preview.totals.energyKcal.value, 130); checks++;
    const webRequest = (value: unknown, origin = base) => new Request(`${base}/api/nutrition-report/export`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(value) });
    assert.equal((await api.webReportRoute.POST(webRequest({ input: prepared.input }, "https://example.invalid"))).status, 403); checks++;
    assert.equal((await api.webReportRoute.POST(webRequest({ input: prepared.input, meta: { role: "ADMIN" } }))).status, 400); checks++;
    const webExport = await api.webReportRoute.POST(webRequest({ input: prepared.input, meta: { subjectName: "Mẫu thử" }, medications: [] }));
    assert.equal(webExport.status, 200, webExport.status === 200 ? undefined : await webExport.clone().text()); checks++;
    assert.match(webExport.headers.get("content-type")!, /spreadsheetml/); checks++;
    const webImported = await api.parseNutritionWorkbook(new Uint8Array(await webExport.arrayBuffer()));
    assert.equal(webImported.days[0].rows[0].foodId, "fixture-rice"); checks++;
    // Separate feature phase in the disposable PGlite DB; quota behavior has its own fixtures/live checks.
    await api.fixtureQuery('DELETE FROM nutrition_api_windows');
    assert.equal((await api.webReportRoute.POST(webRequest({ input: prepared.input, saveToAccount: true }))).status, 401); checks++;
    assert.equal((await api.webReportRoute.POST(webRequest({ input: prepared.input, saveToAccount: "true" }))).status, 400); checks++;
    const exportOnly = await bearer("user-a", ["nutrition:export"]);
    const exportClientId = (await api.fixtureQuery<{ clientId: string }>('SELECT "clientId" FROM nutrition_oauth_tokens WHERE "accessHash"=$1', [hashNutritionToken(exportOnly)]))[0].clientId;
    const exportPrepared = await api.prepareNutritionMenu(menu, { userId: "user-a", clientId: exportClientId, scopes: ["nutrition:export"] });
    assert.equal((await rest("export", { input: exportPrepared.input, confirmationToken: exportPrepared.confirmationToken }, exportOnly)).status, 200); checks++;
    const writeDenied = await rest("export", { ...confirmedArgs, saveToAccount: true }, exportOnly);
    assert.equal(writeDenied.status, 403); checks++;
    assert.ok(writeDenied.headers.get("www-authenticate")?.includes("nutrition:write")); checks++;
    assert.equal((await rest("export", { ...confirmedArgs, saveToAccount: "true" })).status, 400); checks++;
    await api.fixtureQuery('DELETE FROM nutrition_api_windows WHERE "key"=$1', [hashNutritionToken("nutrition-export:user-a:4:60")]);
    for (let retry = 0; retry < 2; retry++) { const response = await rest("export", { ...confirmedArgs, saveToAccount: true }); assert.equal(response.status, 200, await response.clone().text()); checks++; }
    const autoSaved = await api.fixtureQuery<{ id: string }>('SELECT id FROM rations WHERE "ownerId"=$1 AND "conversationRequestKey"=$2', ["user-a", `export-${prepared.preview.digest}`]);
    assert.equal(autoSaved.length, 1, "retry export saves one private menu"); checks++;
    const autoOpened = await get("saved", token, `?id=${autoSaved[0].id}`);
    assert.equal((await autoOpened.json()).ration.url, `${base}/ket-noi-ai/ban-luu/${autoSaved[0].id}`); checks++;
    assert.equal((await get("saved", bToken, `?id=${autoSaved[0].id}`)).status, 404); checks++;
    const saveWeb = webRequest({ input: { ...prepared.input, title: "Saved web fixture" }, saveToAccount: true });
    saveWeb.headers.set("Authorization", `Bearer ${token}`);
    const savedWebExport = await api.webReportRoute.POST(saveWeb);
    assert.equal(savedWebExport.status, 200, savedWebExport.status === 200 ? undefined : await savedWebExport.clone().text()); checks++;
    assert.match(savedWebExport.headers.get("X-Nutrition-Saved-Url") ?? "", /^https:\/\/dinhduong2598\.food\/ket-noi-ai\/ban-luu\/[A-Za-z0-9_-]+$/); checks++;
    const savedWebInput = await api.parseNutritionWorkbook(new Uint8Array(await savedWebExport.arrayBuffer()));
    assert.equal(savedWebInput.title, "Saved web fixture"); checks++;
    assert.equal((await api.webReportRoute.POST(webRequest({ input: prepared.input, medications: [{ meal: "Trưa", name: "test", dose: "1", timing: "sau", note: "", isAdmin: true }] }))).status, 400); checks++;
    assert.equal((await api.importRoute.POST(request("import", {}, token))).status, 415); checks++;
    const wrongFile = new FormData(); wrongFile.append("file", new File(["text"], "wrong.csv"));
    assert.equal((await api.importRoute.POST(new Request(`${base}/api/nutrition/v1/import`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: wrongFile }))).status, 413); checks++;
    const tooBig = new FormData(); tooBig.append("file", new File(["x"], "fixture.xlsx"));
    assert.equal((await api.importRoute.POST(new Request(`${base}/api/nutrition/v1/import`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Length": "6000000" }, body: tooBig }))).status, 413); checks++;
    function deletion(access: string, revision: number) {
      return api.restRoute.DELETE(new Request(`${base}/api/nutrition/v1/saved`, {
        method: "DELETE", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedMenu.ration.id, expectedRevision: revision }),
      }), context("saved"));
    }
    assert.equal((await deletion(readToken, 2)).status, 403); checks++;
    assert.equal((await deletion(bToken, 2)).status, 409); checks++;
    assert.equal((await deletion(token, 1)).status, 409); checks++;
    assert.equal((await deletion(token, 2)).status, 200); checks++;
    assert.equal((await get("saved", token, `?id=${savedMenu.ration.id}`)).status, 404); checks++;
    assert.equal((await deletion(token, 2)).status, 409); checks++;
    await api.fixtureQuery('DELETE FROM "nutrition_api_windows" WHERE "key"=$1', [hashNutritionToken("nutrition-import:user-a:4:60")]);
    api.setFixtureWorkbookBusy(true);
    const busyWorkbook = await api.importRoute.POST(new Request(`${base}/api/nutrition/v1/import`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: multipart }));
    assert.equal(busyWorkbook.status, 503); checks++;
    assert.equal(busyWorkbook.headers.get("retry-after"), "15"); checks++;
    api.setFixtureWorkbookBusy(false);
    await api.fixtureQuery('DELETE FROM "nutrition_api_windows"');
    const pingStatuses: number[] = [];
    // Keep PostgreSQL CURRENT_TIMESTAMP fixed for this short test so a wall-clock
    // minute boundary does not reset the quota in the middle of the 121 requests.
    await api.fixtureQuery("BEGIN");
    try { for (let i = 0; i < 121; i++) pingStatuses.push((await api.mcpRoute.POST(rpcRequest("ping", {}))).status); }
    finally { await api.fixtureQuery("COMMIT"); }
    assert.equal(pingStatuses.filter(status => status === 200).length, 120); checks++;
    assert.equal(pingStatuses[120], 429); checks++;
    const publicPingStatuses: number[] = [];
    let publicRetryAfter: string | null = null;
    await api.fixtureQuery("BEGIN");
    try { for (let i = 0; i < 61; i++) { const response = await api.mcpRoute.POST(rpcRequest("ping", {}, "")); publicPingStatuses.push(response.status); publicRetryAfter = response.headers.get("retry-after"); } }
    finally { await api.fixtureQuery("COMMIT"); }
    assert.equal(publicPingStatuses.filter(status => status === 200).length, 60); checks++;
    assert.equal(publicPingStatuses[60], 429); checks++;
    assert.ok(Number(publicRetryAfter) > 0); checks++;
    assert.equal(badOriginStatus, 403, "MCP must preserve forbidden Origin403 rather than rewrite it as a JSON parse error"); checks++;
    console.log(`Nutrition actual HTTP route-handler fixtures: ${checks} checks passed. REST + legacy/modern MCP + OAuth bearer lookup + owner/CSRF/origin/scope errors + real workbook import parser verified.`);
    console.log("No HTTP socket, browser, real platform, live DB or real export/download; routes called directly with PGlite and isolated data/export fixtures.");
  } finally {
    if (runtime) await runtime.closeOAuthFixture();
    await removeNutritionFixtureDirectory(directory, "nutrition-http-fixture-");
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.stack : "HTTP fixture failed"); process.exitCode = 1; });
