/* eslint-disable @next/next/no-img-element -- Standalone HTML fixture uses an inline SVG data URL, without a Next image server. */
import React from "react";
import { createRoot } from "react-dom/client";
import TemplateWorkspace from "../../../src/app/quan-tri/kho-thuc-don/TemplateWorkspace";
import fixture from "./clinical-menu-fixture.json";
import { analyzeLibraryDraft } from "../../../src/lib/menu-library/analysis";
import type { MenuLibraryDraft } from "../../../src/lib/menu-library/contracts";
import type { NutritionFood } from "../../../src/lib/nutrition-chat/contracts";

declare const BRAND_MARK: string;
const content = fixture.content as MenuLibraryDraft;
const foods = fixture.foods as NutritionFood[];
// Browser-only fixture transport: source calculation code is reused, but nothing
// calls a real API and write/approval requests are always rejected.
window.fetch = async (url, init) => {
  const path = String(url);
  if (path.endsWith("/analysis")) {
    const args = JSON.parse(String(init?.body));
    return Response.json(analyzeLibraryDraft(args.content ?? content, foods));
  }
  if (path.includes("/foods?")) {
    const query = new URL(path, window.location.href).searchParams.get("q")?.toLocaleLowerCase("vi-VN") ?? "";
    return Response.json({ items: foods.filter(food => food.name.toLocaleLowerCase("vi-VN").includes(query)), nextOffset: null });
  }
  return Response.json({ message: "Đây là bản xem giao diện. Không lưu hay duyệt lên website." }, { status: 422 });
};
const data = {
  content, foods,
  template: { id: content.id, title: content.title, direction: content.direction, revision: content.version, updatedAt: "2026-10-22T00:00:00.000Z", url: "https://dinhduong2598.food/quan-tri/kho-thuc-don" },
  csrf: "ui-fixture-only", reviews: [], warnings: [], history: [],
};
createRoot(document.getElementById("clinical-preview")!).render(<>
  <header className="previewBrand"><img src={BRAND_MARK} alt="" width="32" height="32" /><strong>DINH DƯỠNG 2598</strong><span>Kho thực đơn</span></header>
  <main className="previewMain"><p className="previewNotice">Bản xem giao diện · Dữ liệu minh họa · Không lưu hoặc duyệt lên hệ thống</p><TemplateWorkspace data={data} onDirty={() => {}} onReload={() => {}} /></main>
</>);
