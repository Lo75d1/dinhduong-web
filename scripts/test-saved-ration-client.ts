import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadLegacyRationIntoStorage, legacyRationRows, normalizedRationOpenUrl, rationConflictOpenUrl, restoreLegacyRationFromServer, SavedRationLoadError, type LegacySavedRation } from "../src/app/tinh-khau-phan/saved-ration-client";
import { removeNutritionFixtureDirectory } from "./fixtures/nutrition-oauth/safe-temp";
import type * as Listing from "../src/app/api/rations/route";
import type * as RecordRoute from "../src/app/api/rations/[id]/route";

async function main() {
  let checks = 0;
  const equal = (actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected); checks++; };
  const legacy: LegacySavedRation = { conversationRevision: 0, profileJson: null, items: [{ foodId: "food-one", foodName: "Thực phẩm nguồn", meal: "Trưa", dish: "Món thử", edibleGrams: "80", inputGrams: "125", inputBasis: "raw", conversionFactor: "0.8", wastePercent: "20", note: "Nguồn đã lưu", nutrientsJson: { energyKcal: 125, calciumMg: 0, ironMg: null }, classifyJson: { foodGroup: "Rau" } }] };
  const stored = new Map<string, string>([["khauphan_profile_v1", '{"age":"60"}'], ["khauphan_pagemode_v1", "multi"], ["khauphan_menu_days_v1", "previous-multi-day"]]);
  const storage = { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => { stored.set(key, value); }, removeItem: (key: string) => { stored.delete(key); } };
  const rows = loadLegacyRationIntoStorage(legacy, storage);
  equal(rows[0].grams, 80); equal(rows[0].inputGrams, 125); equal(rows[0].conversionFactor, 0.8); equal(rows[0].wastePercent, 20);
  equal(rows[0].nutrients, { energyKcal: 125, calciumMg: 0, ironMg: null }); equal(rows[0].note, "Nguồn đã lưu");
  equal(stored.has("khauphan_profile_v1"), false); equal(stored.get("khauphan_pagemode_v1"), "single"); equal(stored.get("khauphan_mode_v1"), "menu"); equal(stored.get("khauphan_menu_days_v1"), "previous-multi-day");
  equal(JSON.parse(stored.get("khauphan_rows_v1")!)[0].foodId, "food-one");
  loadLegacyRationIntoStorage({ ...legacy, profileJson: { age: "42", gender: "Nữ" }, items: [{ ...legacy.items[0], inputBasis: "edible" }] }, storage);
  equal(JSON.parse(stored.get("khauphan_profile_v1")!), { age: "42", gender: "Nữ" }); equal(stored.get("khauphan_mode_v1"), "recall24h");
  const before = [...stored];
  let failed = false;
  assert.throws(() => loadLegacyRationIntoStorage(legacy, { ...storage, setItem(key, value) { if (!failed && key === "khauphan_mode_v1") { failed = true; throw new Error("quota"); } storage.setItem(key, value); } }), /Trình duyệt/); checks++;
  equal([...stored], before);
  assert.throws(() => legacyRationRows({ ...legacy, conversationRevision: 2 }), /đường dẫn thực đơn đầy đủ/); checks++;
  equal(normalizedRationOpenUrl({ id: "saved-two", conversationRevision: 2 }), "/tinh-khau-phan?banLuu=saved-two");
  equal(normalizedRationOpenUrl({ id: "saved-old", conversationRevision: 0 }), null);
  equal(rationConflictOpenUrl(409, { openUrl: "/tinh-khau-phan?banLuu=saved-two" }, "saved-two"), "/tinh-khau-phan?banLuu=saved-two");
  equal(rationConflictOpenUrl(409, { openUrl: "/ket-noi-ai/ban-luu/saved-two" }, "saved-two"), "/tinh-khau-phan?banLuu=saved-two");
  for (const url of ["https://evil.test/saved-two", "/tinh-khau-phan?banLuu=other", "/tinh-khau-phan?banLuu=saved-two&token=secret", "//evil.test/"]) equal(rationConflictOpenUrl(409, { openUrl: url }, "saved-two"), null);
  equal(rationConflictOpenUrl(404, { openUrl: "/tinh-khau-phan?banLuu=saved-two" }, "saved-two"), null);
  equal([...stored], before); // Opening normalized paths never writes a gram-only snapshot.
  const fakeFetch = (status: number, body: unknown): typeof fetch => async () => Response.json(body, { status });
  equal(await restoreLegacyRationFromServer("saved-two", storage, fakeFetch(409, { openUrl: "/ket-noi-ai/ban-luu/saved-two" })), { kind: "normalized", openUrl: "/tinh-khau-phan?banLuu=saved-two" });
  equal([...stored], before);
  await assert.rejects(() => restoreLegacyRationFromServer("saved-two", storage, fakeFetch(401, { error: "Cần đăng nhập" })), error => error instanceof SavedRationLoadError && error.status === 401); checks++;
  equal([...stored], before);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => restoreLegacyRationFromServer("saved-old", storage, fakeFetch(200, { ration: legacy }), controller.signal), error => error instanceof DOMException && error.name === "AbortError"); checks++;
  equal([...stored], before);
  equal(await restoreLegacyRationFromServer("saved-old", storage, fakeFetch(200, { ration: legacy })), { kind: "legacy", openUrl: "/tinh-khau-phan" });
  equal(stored.has("khauphan_profile_v1"), false);

  const directory = await mkdtemp(join(tmpdir(), "nutrition-saved-ration-routes-"));
  try {
    const fixture = `
      let user = { id: 'owner-one' }; export const calls = [];
      const records = [
        { id: 'saved-old', ownerId: 'owner-one', title: 'Khẩu phần web', conversationRevision: 0, updatedAt: '2026-10-17', observedAt: null, patient: null, _count: { items: 1 }, items: ${JSON.stringify(legacy.items)}, profileJson: null },
        { id: 'saved-two', ownerId: 'owner-one', title: 'Hai ngày có ml', conversationRevision: 3, updatedAt: '2026-10-17', observedAt: null, patient: null, _count: { items: 0 }, conversationJson: { private: 'DO NOT LEAK' }, items: [] },
        { id: 'private-other', ownerId: 'owner-two', title: 'Tài khoản khác', conversationRevision: 2, _count: { items: 0 }, items: [] }
      ];
      export function setUser(value) { user = value; }
      export async function requireSessionUser() { if (!user) throw new Error('UNAUTHORIZED'); return user; }
      export function unauthorizedResponse() { return Response.json({error:'Unauthorized'}, {status:401}); }
      export const prisma = { ration: {
        async findMany(args) { calls.push(['findMany',args]); return records.filter(record => record.ownerId === args.where.ownerId && (args.where.conversationRevision === undefined || record.conversationRevision === args.where.conversationRevision)).map(record => Object.fromEntries(Object.keys(args.select).map(key => [key,record[key]]))); },
        async findFirst(args) { calls.push(['findFirst',args]); return records.find(record => record.id === args.where.id && record.ownerId === args.where.ownerId) ?? null; },
        async delete(args) { calls.push(['delete',args]); }, async update(args) { calls.push(['update',args]); }, async create(args) { calls.push(['create',args]); return {id:'created',title:args.data.title,updatedAt:'2026-10-17'}; }
      } };`;
    const outfile = join(directory, "routes.cjs");
    await build({ stdin: { contents: `import * as listing from ${JSON.stringify(resolve("src/app/api/rations/route.ts"))}; import * as item from ${JSON.stringify(resolve("src/app/api/rations/[id]/route.ts"))}; export {listing,item}; export * from 'saved-ration-fixture';`, resolveDir: process.cwd(), loader: "ts" }, outfile, bundle: true, platform: "node", format: "cjs", logLevel: "silent", plugins: [{ name: "saved-ration-isolated-handlers", setup(builder) {
      builder.onResolve({ filter: /^(saved-ration-fixture|@\/lib\/prisma|@\/lib\/auth)$/ }, () => ({ path: "fixture", namespace: "saved-ration" }));
      builder.onLoad({ filter: /.*/, namespace: "saved-ration" }, () => ({ contents: fixture, loader: "js" }));
      builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "empty", namespace: "empty" }));
      builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};" }));
    } }] });
    const api = createRequire(import.meta.url)(outfile) as { listing: typeof Listing; item: typeof RecordRoute; calls: [string, { where?: Record<string, unknown>; select?: Record<string, unknown>; data?: Record<string, unknown> }][]; setUser(user: { id: string } | null): void };
    const result = await api.listing.GET(), data = await result.json();
    equal(result.status, 200); equal(data.items.map((item: { id: string }) => item.id), ["saved-old", "saved-two"]);
    equal(data.items.map((item: { openUrl: string }) => item.openUrl), ["/tinh-khau-phan?banCu=saved-old", "/tinh-khau-phan?banLuu=saved-two"]);
    equal(data.items.map((item: { kind: string; foodCount: number | null }) => [item.kind, item.foodCount]), [["legacy", 1], ["normalized", null]]);
    equal(JSON.stringify(data).includes("DO NOT LEAK"), false); equal(api.calls[0][1].where, { ownerId: "owner-one" }); equal(api.calls[0][1].select?.conversationJson, undefined);
    const request = new Request("https://example.test/api/rations/saved-two"), ctx = (id: string) => ({ params: Promise.resolve({ id }) });
    const normalized = await api.item.GET(request, ctx("saved-two")); equal(normalized.status, 409); equal((await normalized.json()).openUrl, "/tinh-khau-phan?banLuu=saved-two");
    const old = await api.item.GET(request, ctx("saved-old")); equal(old.status, 200); equal((await old.json()).ration.items[0].nutrientsJson.ironMg, null);
    equal((await api.item.GET(request, ctx("private-other"))).status, 404);
    const rejectedDelete = await api.item.DELETE(request, ctx("saved-two")); equal(rejectedDelete.status, 409); equal((await rejectedDelete.json()).openUrl, "/tinh-khau-phan?banLuu=saved-two");
    equal((await api.item.DELETE(request, ctx("private-other"))).status, 404);
    const putRequest = () => new Request("https://example.test/api/rations/saved-two", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Không làm phẳng bản đầy đủ", rows }) });
    const rejectedPut = await api.item.PUT(putRequest(), ctx("saved-two")); equal(rejectedPut.status, 409); equal((await rejectedPut.json()).openUrl, "/tinh-khau-phan?banLuu=saved-two");
    equal((await api.item.PUT(putRequest(), ctx("private-other"))).status, 404);
    equal(api.calls.some(([operation]) => operation === "delete" || operation === "update"), false);
    const posted = await api.listing.POST(new Request("https://example.test/api/rations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Lưu legacy vẫn dùng được", profile: null, rows }) }));
    equal(posted.status, 201); equal(api.calls.find(([operation]) => operation === "create")?.[1].data?.ownerId, "owner-one");
    api.setUser(null); equal((await api.listing.GET()).status, 401); equal((await api.item.GET(request, ctx("saved-two"))).status, 401);
  } finally { await removeNutritionFixtureDirectory(directory, "nutrition-saved-ration-routes-"); }
  console.log(`Saved ration interoperability: ${checks} helper and isolated real-handler checks passed; no production DB or browser interaction.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
