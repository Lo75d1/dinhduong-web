import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { PRIMARY_SCHOOL_DRAFT } from "../src/lib/menu-library/contracts";
import { analyzeLibraryDraft } from "../src/lib/menu-library/analysis";
import type { NutritionFood } from "../src/lib/nutrition-chat/contracts";

let checks = 0;
function check(value: unknown, message: string) { assert.ok(value, message); checks++; }
async function main() {
  const directory = await mkdtemp(join(process.cwd(), ".menu-library-ui-"));
  const dom = new JSDOM("<div id='root'></div>", { url: "https://example.test/quan-tri/kho-thuc-don" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.getElementById("root")!);
  try {
    const outfile = join(directory, "ui.cjs");
    await build({ stdin: { contents: `export {default as Editor} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/TemplateEditor.tsx"))};export {default as Review} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/TemplateReview.tsx"))};export {default as Workspace} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/TemplateWorkspace.tsx"))};`, resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, platform: "node", format: "cjs", packages: "external", jsx: "automatic" });
    const { Editor, Review, Workspace } = createRequire(import.meta.url)(outfile);
    const draft = structuredClone(PRIMARY_SCHOOL_DRAFT);
    draft.groups = [draft.groups[0]]; draft.days[0].meals = [draft.days[0].meals[0]];
    draft.days[0].meals[0].groupPortions = [{ groupId: draft.groups[0].id, headcount: null, mealRuleIds: [], dishes: [{ id: "rice-dish", label: "Cơm", recipeId: "rice-recipe", sourceKind: "catalog", ingredients: [{ foodId: "rice", quantityPerPortion: 60, unit: "g", basis: "edible_raw", edibleFraction: null, cookingYield: null }] }] }];
    draft.groups[0].lifeStage = "child";
    draft.groups[0].guidance = { notes: ["Lưu ý kiểm thử"], recommendations: ["Khuyến nghị kiểm thử"] };
    draft.days[0].meals[0].groupPortions[0].dishes[0].preparation = { method: "simmer", texture: "regular", steps: ["Bước kiểm thử"], notes: ["Lưu ý kiểm thử"] };
    const rice: NutritionFood = { id: "rice", name: "Gạo kiểm thử", unit: "g", wastePercent: null, foodGroup: null, source: { kind: "catalog", label: "RNI", confirmed: true }, nutrients: { energyKcal: 360, proteinG: null, lipidG: 1, glucidG: 80 } };
    const analysis = analyzeLibraryDraft(draft, [rice]);
    const inputs = () => [...document.querySelectorAll("input")];
    const button = (text: string) => [...document.querySelectorAll("button")].find(item => item.textContent === text)!;
    async function change(element: HTMLInputElement, value: string) {
      await act(async () => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(element, value); element.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
    }
    async function click(element: HTMLElement) { check(!!element, "Interaction target exists"); await act(async () => { element.click(); }); }
    let saved = 0, dirty = false, lastBody: Record<string, unknown> = {}, lastHeaders: Record<string, string> = {};
    globalThis.fetch = async (_url, options) => { lastBody = JSON.parse(String(options?.body)); lastHeaders = options?.headers as Record<string, string>; return Response.json({ id: draft.id, revision: 2 }); };
    await act(async () => root.render(<Editor content={draft} csrf="fixture-csrf" foods={[rice]} onSaved={() => saved++} onCancel={() => {}} onDirty={(value: boolean) => { dirty = value; }} />));
    check(button("Lưu thay đổi").disabled, "Unchanged editor cannot save");
    const quantity = inputs().find(item => item.max === "100000")!;
    await change(quantity, "75");
    check(dirty && quantity.value === "75", "Manual quantity editing sets dirty state");
    await change(inputs().find(item => item.maxLength === 500)!, "Đổi lượng gạo");
    await act(async () => document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    const sent = lastBody.content as typeof draft;
    check(saved === 1 && lastBody.expectedRevision === 1 && sent.version === 2 && lastHeaders["x-menu-library-csrf"] === "fixture-csrf", "Save sends revision guard, CSRF and new version");
    check(sent.days[0].meals[0].groupPortions[0].dishes[0].sourceKind === "manual" && sent.days[0].meals[0].groupPortions[0].dishes[0].recipeId === null, "Edited catalog dish loses original-recipe claim");
    check(sent.days[0].meals[0].groupPortions[0].dishes[0].ingredients[0].quantityPerPortion === 75, "Exact manual quantity is persisted in request");
    globalThis.fetch = async () => Response.json({ message: "Mẫu đã đổi phiên bản" }, { status: 409 });
    await change(quantity, "80");
    await act(async () => document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    check(document.querySelector('[role="alert"]')?.textContent?.includes("Mẫu đã đổi phiên bản") && quantity.value === "80", "Conflicting save keeps unsaved manual edits visible");
    let reviewed = 0;
    globalThis.fetch = async (url, options) => {
      lastBody = JSON.parse(String(options?.body));
      return String(url).endsWith("/analysis") ? Response.json(analysis) : Response.json({ id: "review-one" });
    };
    await act(async () => root.render(<Review id={draft.id} revision={1} csrf="fixture-csrf" reviews={[]} onReviewed={() => reviewed++} />));
    check(!document.querySelector('input[type="checkbox"]') && document.body.textContent!.includes("Chưa duyệt"), "Review starts without implicit approval or confirmation");
    await click(button("Tính dinh dưỡng"));
    check(document.body.textContent!.includes("216") && document.body.textContent!.includes("Chất đạm"), "Analysis shows calculated nutrients");
    await click(button("Duyệt mẫu này"));
    check(button("Xác nhận duyệt").disabled && analysis.sections[0].macroPercent.proteinG === null, "No approval before explicit acknowledgment; incomplete protein percentage remains unknown");
    await click(document.querySelector('input[type="checkbox"]')!);
    check(!button("Xác nhận duyệt").disabled, "Acknowledging review enables deliberate approval");
    await click(button("Xác nhận duyệt"));
    check(reviewed === 1 && lastBody.acknowledged === true && lastBody.analysisDigest === analysis.digest && lastBody.expectedRevision === 1, "Approval submits exact viewed analysis and revision");
    globalThis.fetch = async (url) => String(url).endsWith("/analysis") ? Response.json(analysis) : Response.json({ message: "Nguồn đã đổi" }, { status: 409 });
    await click(button("Xác nhận duyệt"));
    check(document.body.textContent!.includes("Nguồn đã đổi") && !document.querySelector('input[type="checkbox"]'), "Stale review discards preview and acknowledgment until reanalysis");
    // The clinical workspace computes on opening and recalculates unsaved quantities.
    let calculations = 0, writes = 0;
    globalThis.fetch = async (url, options) => {
      if (!String(url).endsWith("/analysis")) { writes++; return Response.json({}); }
      calculations++;
      const body = JSON.parse(String(options?.body));
      const working = body.content ?? draft;
      const quantity = working.days[0].meals[0].groupPortions[0].dishes[0].ingredients[0].quantityPerPortion;
      if (quantity === 90) await new Promise(resolve => setTimeout(resolve, 800));
      return Response.json(analyzeLibraryDraft(working, [rice]));
    };
    const opened = { content: draft, template: { id: draft.id, title: draft.title, direction: draft.direction, revision: 1, updatedAt: "2026-10-22T06:00:00Z", url: "https://example.test" }, foods: [rice], warnings: [], history: [], csrf: "fixture-csrf" };
    await act(async () => root.render(<Workspace data={opened} onReload={() => {}} onDirty={() => {}} />));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
    check(calculations === 1 && document.querySelector('[aria-label="Năng lượng và tỷ lệ P L G"]')!.textContent!.includes("216"), "Opening a menu calculates immediately without an analysis button");
    check(document.querySelector('[aria-label="Bữa ăn, món ăn và thực phẩm"]')!.textContent!.includes("Gạo kiểm thử"), "Meal, dish, ingredient and quantity remain the main workspace");
    check(!document.querySelector('details[open]'), "Detailed analysis and history start collapsed");
    await click(button("Chỉnh khẩu phần"));
    await change(inputs().find(item => item.max === "100000")!, "75");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
    check(document.querySelector('[aria-label="Năng lượng và tỷ lệ P L G"]')!.textContent!.includes("270"), "Changing unsaved grams updates calculated energy");
    check(writes === 0, "Automatic calculation never saves or approves the working menu");
    const beforeBurst = calculations;
    await change(inputs().find(item => item.max === "100000")!, "80");
    await change(inputs().find(item => item.max === "100000")!, "85");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
    check(calculations === beforeBurst + 1, "Rapid typing is debounced into one calculation");
    await change(inputs().find(item => item.max === "100000")!, "90");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 500)); });
    await change(inputs().find(item => item.max === "100000")!, "95");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 900)); });
    check(document.querySelector('[aria-label="Năng lượng và tỷ lệ P L G"]')!.textContent!.includes("342"), "A slower stale response cannot replace the latest quantity calculation");
    const beforeInvalid = calculations;
    await change(inputs().find(item => item.max === "100000")!, "");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
    check(calculations === beforeInvalid && document.querySelector('[role="alert"]')?.textContent?.includes("định lượng hợp lệ"), "Blank quantity stays unknown and does not submit a zero or stale result");
    console.log(`Menu library UI: ${checks} DOM interaction checks passed (manual edit, safe save, conflict retention, nutrient display and deliberate review; not a visual browser test).`);
  } finally { await act(async () => root.unmount()); dom.window.close(); await rm(directory, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
