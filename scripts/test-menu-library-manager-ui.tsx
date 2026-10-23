import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { PRIMARY_SCHOOL_DRAFT, type MenuLibraryDraft } from "../src/lib/menu-library/contracts";
import { reorderSelectedMeals } from "../src/lib/menu-library/manager-contracts";
async function main() {
  const directory = await mkdtemp(join(process.cwd(), ".manager-ui-")),
    dom = new JSDOM('<div id="root"></div>', {
      url: "https://example.test/quan-tri/kho-thuc-don",
      pretendToBeVisual: true
    });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Document: dom.window.Document,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLDialogElement: dom.window.HTMLDialogElement,
    SVGElement: dom.window.SVGElement,
    MutationObserver: dom.window.MutationObserver,
    KeyboardEvent: dom.window.KeyboardEvent,
    getComputedStyle: dom.window.getComputedStyle,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  dom.window.scrollTo = () => {};
  const {
      createRoot
    } = await import("react-dom/client"),
    root = createRoot(document.getElementById("root")!);
  let checks = 0;
  const check = (condition: unknown, message: string) => {
    checks++;
    assert.ok(condition, message);
  };
  try {
    const outfile = join(directory, "ui.cjs");
    await build({
      stdin: {
        contents: `export {default as Manager} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/MenuLibraryManager.tsx"))};`,
        resolveDir: process.cwd(),
        loader: "tsx"
      },
      outfile,
      bundle: true,
      packages: "external",
      platform: "node",
      format: "cjs",
      jsx: "automatic"
    });
    const {
      Manager
    } = createRequire(import.meta.url)(outfile);
    const drafts: Record<string, MenuLibraryDraft> = {};
    for (const id of ["a", "b"]) {
      const draft = structuredClone(PRIMARY_SCHOOL_DRAFT);
      draft.id = id;
      draft.title = `Thực đơn ${id}`;
      draft.description = `Mô tả ${id}`;
      draft.tags = ["Nhãn mẫu"];
      draft.direction = "individual";
      draft.librarySection = "individual";
      draft.unit = null;
      draft.groups = [{
        ...draft.groups[0],
        schoolLevel: null,
        label: "Người lớn",
        lifeStage: "adult",
        designEnergyKcal: 1900
      }];
      draft.days = [1, 2].map(i => ({
        id: `${id}-day-${i}`,
        dayIndex: i,
        date: null,
        meals: ["breakfast", "lunch"].map((code, j) => ({
          id: `${id}-meal-${i}-${j}`,
          code: code as "breakfast" | "lunch",
          label: j ? "Bữa trưa" : "Bữa sáng",
          groupPortions: [{
            groupId: draft.groups[0].id,
            headcount: null,
            mealRuleIds: [],
            dishes: [{
              id: `dish-${i}-${j}`,
              label: j ? "Cá hấp" : "Phở gà",
              sourceKind: "manual",
              recipeId: null,
              ingredients: []
            }]
          }]
        }))
      }));
      drafts[id] = draft;
    }
    const revisions: Record<string, number> = {
        a: 1,
        b: 1
      },
      requests: {
        url: string;
        body?: Record<string, unknown>;
        headers?: HeadersInit;
      }[] = [];
    let failBatch = false;
    const summary = (draft: MenuLibraryDraft) => ({
      id: draft.id,
      title: draft.title,
      description: draft.description,
      tags: draft.tags,
      revision: revisions[draft.id],
      updatedAt: "2026-10-23",
      section: "individual",
      hospitalUse: null,
      availability: draft.availability?.state ?? "active",
      reviewState: "draft",
      unitLabel: null,
      eatingContext: null,
      groups: draft.groups,
      days: draft.days.map(day => ({
        id: day.id,
        dayIndex: day.dayIndex,
        date: null,
        mealCount: day.meals.length,
        mealLabels: day.meals.map(meal => meal.label)
      }))
    });
    globalThis.fetch = async (url, options) => {
      const path = String(url),
        body = options?.body ? JSON.parse(String(options.body)) : undefined;
      requests.push({
        url: path,
        body,
        headers: options?.headers
      });
      if (path.includes("/catalog?")) {
        const params = new URL(path, "https://example.test").searchParams;
        const items = Object.values(drafts).filter(draft => (draft.availability?.state ?? "active") === (params.get("availability") ?? "active"));
        return Response.json({
          items: items.map(summary),
          total: items.length,
          nextOffset: null,
          csrf: "fixture-csrf"
        });
      }
      if (path.endsWith("/batch")) {
        if (failBatch) return Response.json({
          message: "Một thực đơn đã đổi phiên bản. Tải lại trước khi sửa."
        }, {
          status: 409
        });
        const items = body.items ?? body.targets ?? body.meals ?? [body.item];
        for (const item of items) {
          revisions[item.id]++;
          if (body.action === "trash") drafts[item.id].availability = {
            state: "archived",
            reason: "test"
          };
          if (body.action === "restore") drafts[item.id].availability = {
            state: "active",
            reason: null
          };
        }
        return Response.json({
          items: items.map((item: {
            id: string;
          }) => ({
            id: item.id,
            revision: revisions[item.id]
          }))
        });
      }
      if (path.endsWith("/templates") && options?.method === "POST") {
        drafts[body.content.id] = body.content;
        revisions[body.content.id] = 1;
        return Response.json({
          id: body.content.id,
          revision: 1
        }, {
          status: 201
        });
      }
      if (path.endsWith("/analysis")) return Response.json({
        sections: [],
        digest: "test",
        warnings: [],
        canApprove: false
      });
      const id = decodeURIComponent(path.split("/").at(-1)!);
      const content = {
        ...drafts[id],
        version: revisions[id]
      };
      return Response.json({
        content,
        template: {
          id,
          title: content.title,
          direction: content.direction,
          revision: revisions[id],
          updatedAt: "2026-10-23T00:00:00Z",
          url: `https://example.test?template=${id}`
        },
        foods: [],
        history: [],
        warnings: [],
        csrf: "fixture-csrf"
      });
    };
    const button = (text: string) => [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === text)!;
    async function click(element: Element) {
      check(!!element, "Interaction target exists");
      await act(async () => (element as HTMLElement).click());
    }
    async function settle() {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 250));
      });
    }
    async function input(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
      check(!!element, "Input target exists");
      await act(async () => {
        const prototype = element.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
        element.dispatchEvent(new dom.window.Event("input", {
          bubbles: true
        }));
      });
    }
    async function select(element: HTMLSelectElement, value: string) {
      await act(async () => {
        element.value = value;
        element.dispatchEvent(new dom.window.Event("change", {
          bubbles: true
        }));
      });
    }
    await act(async () => root.render(<Manager />));
    await settle();
    check(document.querySelectorAll('[data-template-id]').length === 2, "One card per template, not four daily rows");
    check(document.body.textContent!.includes("2 thực đơn"), "Template count label");
    check(document.body.textContent!.includes("1.900 kcal") && document.body.textContent!.includes("2 bữa/ngày") && document.body.textContent!.includes("Người lớn") && document.body.textContent!.includes("Mô tả a"), "Card has energy, meals, audience and description");
    check(!document.body.textContent!.includes("Đủ ngày") && !document.body.textContent!.includes("Chưa phân loại"), "No all-day or missing-classification assertion");
    await click(document.querySelector('input[aria-label="Chọn thực đơn Thực đơn a"]')!);
    await click(document.querySelector('input[aria-label="Chọn thực đơn Thực đơn b"]')!);
    await click(document.querySelector('[aria-label="Thao tác với thực đơn đã chọn"] button:last-child')!);
    check(document.querySelector('dialog[open]')?.textContent?.includes("2 thực đơn đã chọn"), "Review bulk trash count");
    failBatch = true;
    await click([...document.querySelectorAll('dialog button')].find(button => button.textContent === "Xóa thực đơn")!);
    check(document.querySelector('dialog [role="alert"]')?.textContent?.includes("đổi phiên bản"), "Conflict keeps review dialog open");
    check((document.querySelector('input[aria-label="Chọn thực đơn Thực đơn a"]') as HTMLInputElement).checked, "Conflict preserves selection");
    failBatch = false;
    await click([...document.querySelectorAll('dialog button')].find(button => button.textContent === "Xóa thực đơn")!);
    await settle();
    const deletion = requests.find(request => request.body?.action === "trash")!;
    check((deletion.body?.items as unknown[]).length === 2, "One request contains both selected menus");
    check((deletion.headers as Record<string, string>)["x-menu-library-csrf"] === "fixture-csrf", "Batch writes carry session CSRF");
    check(!document.querySelector('[data-template-id]'), "Deleted menus leave active view");
    await click(button("Thùng rác"));
    await settle();
    check(document.querySelectorAll('[data-template-id]').length === 2, "Trash view loads archived menus");
    await click(document.querySelector('input[aria-label="Chọn tất cả thực đơn đang hiển thị"]')!);
    await click(document.querySelector('[aria-label="Thao tác với thực đơn đã chọn"] button:last-child')!);
    await click([...document.querySelectorAll('dialog button')].find(button => button.textContent === "Khôi phục thực đơn")!);
    await settle();
    await click(button("Về kho đang dùng"));
    await settle();
    await click(document.querySelector('[data-template-id="a"] button[aria-label^="Kéo"]')!.parentElement!.parentElement!.querySelector('button[class*="cardTitle"]')!);
    check(!!document.querySelector('[aria-label="Xem nhanh thực đơn"]'), "Preview opens alongside catalog");
    check(document.querySelectorAll('[data-template-id]').length === 2, "Catalog stays available while previewing");
    await click(document.querySelector('input[aria-label="Chọn Bữa sáng, Thực đơn a, ngày 1"]')!);
    await click(document.querySelector('[data-template-id="b"] button[class*="cardTitle"]')!);
    await click(document.querySelector('input[aria-label="Chọn Bữa trưa, Thực đơn b, ngày 1"]')!);
    check(document.querySelector('[aria-label="Bữa đã chọn"]')?.textContent?.includes("2 bữa đã chọn"), "Meal selection survives switching templates");
    await click(document.querySelector('input[aria-label="Chọn thực đơn Thực đơn a"]')!);
    await click(button("Sao chép / chuyển bữa"));
    check(document.querySelector('dialog')?.textContent?.includes("2 bữa nguồn"), "Review several source meals");
    await click(button("Sao chép các bữa"));
    await settle();
    const copied = requests.findLast(request => request.body?.action === "transfer")!.body!;
    check((copied.meals as {
      id: string;
    }[]).map(item => item.id).join("|") === "a|b", "Send sources from multiple templates");
    check((copied.targets as {
      id: string;
    }[])[0].id === "a", "Explicit selected destination");
    await click(button("Thêm thực đơn"));
    const form = document.querySelector('dialog form')!;
    const label = (text: string) => [...form.querySelectorAll("label")].find(label => label.textContent?.startsWith(text))!;
    await input(label("Tên thực đơn").querySelector("input")!, "Thực đơn nhập tay");
    await input(label("Dành cho đối tượng").querySelector("input")!, "Trẻ 12–24 tháng");
    await input(label("Mô tả chung").querySelector("textarea")!, "Dễ nhập\nDễ xem");
    await input(label("Hashtag").querySelector("input")!, "Mềm, Gia đình");
    await input(label("Số ngày").querySelector("input")!, "2");
    await click(button("Tạo & nhập món"));
    await settle();
    const created = requests.findLast(request => request.url.endsWith("/templates") && request.body?.content)!.body!.content as MenuLibraryDraft;
    check(created.days.length === 2 && created.days.every(day => day.meals.length === 3), "Manual creation builds requested days and meal slots");
    check(created.description === "Dễ nhập Dễ xem" && created.tags?.join("|") === "Mềm|Gia đình", "Description and tags persist as clean metadata");
    check(document.querySelector('dialog[aria-label="Biên soạn thực đơn"]'), "Creation proceeds directly to editing");
    await click(button("+ Thêm ngày"));
    const daySelect = document.querySelector('[aria-label="Biên soạn và duyệt thực đơn"] select') as HTMLSelectElement;
    check(daySelect.options.length === 3, "Add a day without re-entering the existing menu");
    await select(daySelect, daySelect.options[2].value);
    await click(button("+ Thêm bữa vào ngày đang xem"));
    check(document.querySelector('dialog')?.textContent?.includes("Bữa trưa"), "Add meal to the newly selected day");
    dom.window.confirm = () => true;
    await click([...document.querySelectorAll('dialog button')].find(button => button.textContent === "Hủy")!);
    check(!document.querySelector('dialog[open]'), "Cancel editor closes the overlay");
    check(created.days.some(day => day.id === new URL(window.location.href).searchParams.get("day")), "Cancel restores a valid saved day link");
    assert.deepEqual(reorderSelectedMeals(["a", "b", "c"], ["a"], "b"), ["b", "a", "c"]);
    assert.deepEqual(reorderSelectedMeals(["a", "b", "c", "d"], ["a", "c"], "d"), ["b", "d", "a", "c"]);
    checks += 2;
    console.log(`Menu manager UI: ${checks} DOM checks passed (bulk trash/restore/conflicts, cross-menu meal selection, transfer review, manual input and independent metadata; not a visual or physical-touch test).`);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    await rm(directory, {
      recursive: true,
      force: true
    });
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
