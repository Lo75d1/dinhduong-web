import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LIBRARY_VERSION, MEAL_REFERENCE_RULES, REFERENCE_SOURCES, menuLibraryCatalog } from "../src/lib/menu-library/catalog";
import { PRIMARY_SCHOOL_DRAFT } from "../src/lib/menu-library/contracts";
import { menuAiGuide, implementationAiGuide } from "../src/lib/menu-library/guide";
import GuidanceArticle from "../src/app/quan-tri/kho-thuc-don/GuidanceArticle";
import type { GET as CatalogGet } from "../src/app/api/admin/menu-library/route";
import type { GET as GuideGet } from "../src/app/api/admin/menu-library/guide/route";
import type Page from "../src/app/quan-tri/kho-thuc-don/page";

let checks = 0;
function check(value: unknown, message: string) { assert.ok(value, message); checks++; }

async function main() {
  const catalog = menuLibraryCatalog();
  check(catalog.capabilities.collectiveCalculation === false && catalog.capabilities.persistTemplates === true, "Draft persistence is separate from collective calculation");
  check(new Set(REFERENCE_SOURCES.map(source => source.id)).size === REFERENCE_SOURCES.length, "Unique source IDs");
  for (const rule of MEAL_REFERENCE_RULES) {
    const source = REFERENCE_SOURCES.find(source => source.id === rule.sourceId);
    check(source?.verification === "extracted" && source.version === rule.sourceVersion, `Rule ${rule.id} pins an inspected source version`);
    check(rule.denominator === "daily_energy" && rule.unit === "percent" && rule.nutrient === "energy", "Percentages retain daily denominator");
    check(rule.min >= 0 && rule.max <= 100 && rule.min <= rule.max && rule.status === "reference_only", "No active automatic rule");
  }
  check(!MEAL_REFERENCE_RULES.some(rule => rule.sourceId === "vdd-rni-2026" || rule.sourceId === "bgddt-pilot-2026"), "Unread sources never supply numeric rules");
  const rules = Object.fromEntries(MEAL_REFERENCE_RULES.map(rule => [rule.id, rule]));
  check(rules["nursery-main"].mealCode !== rules["nursery-snack"].mealCode, "Main afternoon and snack have different stable codes");
  check(rules["worker-main"].mealCode === "shift_main", "A main shift meal is independent of lunch clock time");
  check(rules["kindergarten-total"].min === 50 && rules["kindergarten-total"].max === 55, "Kindergarten served total is separate from individual meal ranges");
  check(PRIMARY_SCHOOL_DRAFT.coverage === "served_meals" && PRIMARY_SCHOOL_DRAFT.days[0].date === null, "Reusable served-meal example is not full-day coverage");
  check(PRIMARY_SCHOOL_DRAFT.groups.map(group => group.ageYears?.min).join(",") === "6,8,10", "Primary example keeps age groups separate");
  const meals = PRIMARY_SCHOOL_DRAFT.days[0].meals;
  check(meals.every(meal => meal.groupPortions.length === 3 && meal.groupPortions.every(group => group.headcount === null && group.dishes.length === 0)), "Empty meals and unknown counts exist without fake rows");

  const guide = menuAiGuide();
  for (const source of REFERENCE_SOURCES) check(guide.includes(source.url) && guide.includes(`[${source.number}]`), "Guide carries original reference links");
  for (const phrase of ["không tự thừa hưởng", "save_admin_menu_template", "20,6 kg", "1,25 kg", "prepare_menu", "calculate_menu", "sourceVersion", "khác MenuInput", "null", "tối đa ba câu"]) check(guide.includes(phrase), `AI guidance: ${phrase}`);
  check(implementationAiGuide().includes("docs/menu-library/implementation.md"), "Copyable developer handoff points to maintained implementation instructions");
  const html = renderToStaticMarkup(<GuidanceArticle />);
  for (const source of REFERENCE_SOURCES) check(html.includes(`id="nguon-${source.id}"`) && html.includes(`href="#nguon-${source.id}"`), "Reference citations resolve inside page");
  check(html.includes("Chờ xác minh bản gốc") && html.includes("chưa được mở") && html.includes("Sao chép hướng dẫn AI lập thực đơn"), "Admin sees source status and honest capability boundary");

  // Bundle the real page and route handlers; replace only session I/O and redirect.
  const directory = await mkdtemp(join(process.cwd(), ".menu-library-test-"));
  try {
    const outfile = join(directory, "routes.cjs");
    await build({
      stdin: { contents: `export {GET as getCatalog} from ${JSON.stringify(resolve("src/app/api/admin/menu-library/route.ts"))};\nexport {GET as getGuide} from ${JSON.stringify(resolve("src/app/api/admin/menu-library/guide/route.ts"))};\nexport {default as page} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/page.tsx"))};\nexport {setRole} from "fixture-session";`, resolveDir: process.cwd(), loader: "ts" },
      outfile, bundle: true, platform: "node", format: "cjs", packages: "external", jsx: "automatic", logLevel: "silent",
      plugins: [{ name: "session-fixture", setup(builder) {
        builder.onResolve({ filter: /^(?:@\/lib\/auth|fixture-session)$/ }, () => ({ path: "fixture-session", namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `let role=null; export function setRole(value){role=value;} export async function getSessionUser(){if(role==="ERROR")throw new Error("private database detail");return role ? {role} : null;}` }));
        builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: "module-css", namespace: "css-fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "css-fixture" }, () => ({ contents: "export default {}" }));
        builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "empty", namespace: "empty" }));
        builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {}" }));
        builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "navigation" }));
        builder.onLoad({ filter: /.*/, namespace: "navigation" }, () => ({ contents: "export function redirect(path){throw new Error('REDIRECT:'+path)}" }));
      } }],
    });
    const require = createRequire(resolve("package.json"));
    const api = require(outfile) as { getCatalog: typeof CatalogGet; getGuide: typeof GuideGet; page: typeof Page; setRole(role: string | null): void };
    for (const [role, status] of [[null, 401], ["USER", 403], ["CLINICIAN", 403], ["EDITOR", 403], ["ERROR", 503], ["ADMIN", 200]] as const) {
      api.setRole(role);
      for (const response of [await api.getCatalog(), await api.getGuide(new Request("https://example.test/api/admin/menu-library/guide")), await api.getGuide(new Request("https://example.test/api/admin/menu-library/guide?mode=implementation"))]) {
        check(response.status === status, `${role} => ${status}`);
        check(response.headers.get("cache-control")?.includes("private, no-store"), "Private no-store on success and failure");
        check(response.headers.get("x-robots-tag") === "noindex, nofollow", "Private response is not indexable");
        const body = await response.text();
        if (status !== 200) check(!body.includes("3958") && !body.includes("schemaVersion") && !body.includes("private database detail"), "Denied response contains no catalog or internal error");
      }
      if (role === null) {
        await assert.rejects(() => api.page(), /REDIRECT:\/dang-nhap\?next=%2Fquan-tri%2Fkho-thuc-don/); checks++;
      } else {
        const pageHtml = renderToStaticMarkup(await api.page());
        check(pageHtml.includes("data-menu-library") === (role === "ADMIN"), "Only Admin page renders workspace or AI instructions");
        if (role === "ADMIN") check(!pageHtml.includes('id="nguon-'), "The catalog landing page does not dump the guidance article");
        if (role !== "ADMIN") check(!pageHtml.includes("3958") && !pageHtml.includes("day-1-lunch"), "Denied page does not serialize private content");
      }
    }
    api.setRole("ADMIN");
    const data = await (await api.getCatalog()).json();
    check(data.schemaVersion === LIBRARY_VERSION && !data.capabilities.collectiveShoppingExport, "Admin JSON matches UI capability version");
    check((await api.getGuide(new Request("https://example.test/api/admin/menu-library/guide?mode=unknown"))).status === 400, "Invalid guide mode is rejected");
    check(await (await api.getGuide(new Request("https://example.test/api/admin/menu-library/guide?mode=implementation"))).text() === implementationAiGuide(), "TXT and copied handoff are identical");
    const publicGuide = await readFile("src/lib/nutrition-chat/start-guide.ts", "utf8");
    check(!publicGuide.includes("menu-library"), "Private catalog is not imported into public start guide");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  console.log(`Menu library: ${checks} source/version, structure, UI, guide and authorization checks passed (isolated session fixture; no production database).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
