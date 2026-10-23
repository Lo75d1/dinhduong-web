import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import React, { act, useState } from "react";
import { JSDOM } from "jsdom";
import { PRIMARY_SCHOOL_DRAFT, type MenuLibraryDraft } from "../src/lib/menu-library/contracts";
import type TemplateEditorType from "../src/app/quan-tri/kho-thuc-don/TemplateEditor";
import type MealSheetType from "../src/app/quan-tri/kho-thuc-don/MealSheet";
import type { MealIllustration } from "../src/lib/menu-library/illustration";
async function main() {
  const directory = await mkdtemp(join(process.cwd(), ".image-ui-")), dom = new JSDOM('<div id="root"></div>', { url: "https://example.test/quan-tri/kho-thuc-don", pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import("react-dom/client"), root = createRoot(document.getElementById("root")!);
  let checks = 0;
  const check = (value: unknown, message: string) => { assert.ok(value, message); checks++; };
  try {
    const outfile = join(directory, "ui.cjs");
    await build({ stdin: { contents: `export {default as Editor} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/TemplateEditor.tsx"))};export {default as Sheet} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/MealSheet.tsx"))};`, resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, packages: "external", platform: "node", format: "cjs", jsx: "automatic", logLevel: "silent" });
    const { Editor, Sheet } = createRequire(import.meta.url)(outfile) as { Editor: typeof TemplateEditorType; Sheet: typeof MealSheetType };
    const initial = structuredClone(PRIMARY_SCHOOL_DRAFT), image: MealIllustration = { assetId: "a".repeat(64), alt: "Cơm cá hấp và canh rau", sourceKind: "ai" };
    initial.id = "images-ui"; initial.schemaVersion = "1.2.0";
    let saved: MenuLibraryDraft | undefined, draft: MenuLibraryDraft | undefined, uploads = 0, saving = false, failUpload = false;
    const attempts: string[] = [];
    let releaseUpload: (() => void) | undefined, waitForUpload = false;
    globalThis.fetch = async (url, options) => {
      if (String(url).endsWith("/images")) {
        uploads++;
        check(new Headers(options?.headers).get("x-menu-library-csrf") === "fixture-csrf", "Upload includes CSRF");
        check(!new Headers(options?.headers).has("content-type"), "Browser creates the multipart boundary");
        const form = options?.body as FormData;
        check(form.get("file") instanceof File && form.get("sourceKind") === "ai" && !!form.get("alt"), "File, actual source and caption submitted");
        attempts.push(String(form.get("requestKey")));
        if (waitForUpload) await new Promise<void>(resolve => { releaseUpload = resolve; });
        if (failUpload) throw new Error("Network interrupted");
        return Response.json({ illustration: image });
      }
      saved = JSON.parse(String(options?.body)).content;
      return Response.json({ id: initial.id, revision: saved!.version });
    };
    function Harness() {
      const [content, setContent] = useState(initial);
      return <Editor key={content.version} content={content} csrf="fixture-csrf" foods={[]} dayId={content.days[0].id} groupId={content.groups[0].id} onSaved={() => setContent(saved!)} onCancel={() => {}} onDirty={() => {}} onDraftChange={value => { draft = value; }} onSaving={value => { saving = value; }} />;
    }
    const button = (text: string) => [...document.querySelectorAll("button")].find(button => button.textContent === text)!;
    const files = (file: File) => { const input = document.querySelector('input[type="file"]')!; Object.defineProperty(input, "files", { configurable: true, value: [file] }); input.dispatchEvent(new dom.window.Event("change", { bubbles: true })); };
    await act(async () => root.render(<Harness />));
    check(document.querySelectorAll('input[type="file"]').length === 2, "Each visible meal has an independent uploader for the selected group");
    const file = new File([new Uint8Array([1, 2, 3])], "meal.png", { type: "image/png" });
    await act(async () => files(new File(["bad"], "meal.svg", { type: "image/svg+xml" })));
    check(uploads === 0 && document.querySelector('[role="alert"]')?.textContent?.includes("5 MB"), "Unsupported files blocked without an API call");
    failUpload = true;
    await act(async () => files(file));
    check(document.querySelector('[role="alert"]')?.textContent?.includes("Network interrupted"), "Network failure is visible and draft retained");
    failUpload = false; waitForUpload = true;
    await act(async () => { button("Thử tải lại").click(); });
    check(saving && document.querySelector("fieldset")?.disabled, "Save and structural controls disabled during upload");
    await act(async () => { releaseUpload?.(); });
    check(!saving && attempts[0] === attempts[1], "Retry preserves request key and unlocks after completion");
    check(document.querySelector("img")?.getAttribute("src")?.endsWith(image.assetId) && document.querySelector("figcaption")?.textContent === "Ảnh minh hoạ do AI tạo", "Actual uploaded asset is previewed and AI-labelled");
    check(draft?.days[0].meals[0].groupPortions[0].illustration?.assetId === image.assetId, "Image attached to the intended meal/group draft");
    check(!draft?.days[0].meals[0].groupPortions[1].illustration && !draft?.days[0].meals[1].groupPortions[0].illustration, "Other groups and meals remain independent");
    await act(async () => { document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
    check(saved?.version === 2 && saved.days[0].meals[0].groupPortions[0].illustration?.assetId === image.assetId, "Saving persists reference through the existing versioned API");
    check(saved?.days[0].meals[0].groupPortions[0].dishes.length === initial.days[0].meals[0].groupPortions[0].dishes.length, "Image save never changes dishes or portions");
    await act(async () => button("Bỏ ảnh khỏi bữa này").click());
    check(!document.querySelector("img") && draft?.days[0].meals[0].groupPortions[0].illustration === null, "Remove detaches image from current draft");
    check(initial.days[0].meals[0].groupPortions[0].illustration === undefined, "Original input stays untouched");
    const show = structuredClone(initial); show.days[0].meals[0].groupPortions[0].illustration = image;
    await act(async () => root.render(<Sheet content={show} day={show.days[0]} groupId={show.groups[0].id} foods={[]} />));
    check(document.querySelectorAll("img").length === 1 && document.querySelector("img")?.alt === image.alt, "Meal sheet displays the selected group image with accessible description");
    await act(async () => root.render(<Sheet content={show} day={show.days[0]} groupId={show.groups[1].id} foods={[]} />));
    check(document.querySelectorAll("img").length === 0, "Changing group cannot display another group's illustration");
    console.log(`Menu image UI: ${checks} DOM checks passed (multipart, retry, save interlock, versioned attach/remove, correct meal/group and accessible preview; transport fixture, not visual/physical-device QA).`);
  } finally { await act(async () => root.unmount()); dom.window.close(); await rm(directory, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
