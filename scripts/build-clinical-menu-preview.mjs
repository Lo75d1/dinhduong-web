import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd(), output = path.join(root, "docs/design/previews/clinical-menu.html");
const mark = await readFile(path.join(root, "public/brand/mark.svg"));
const result = await build({
  absWorkingDir: root, entryPoints: ["docs/design/prototypes/ClinicalMenuPreview.tsx"], outfile: "clinical.js",
  bundle: true, write: false, minify: true, platform: "browser", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', BRAND_MARK: JSON.stringify(`data:image/svg+xml;base64,${mark.toString("base64")}`) },
  plugins: [{ name: "preview-digest-only", setup(builder) {
    builder.onResolve({ filter: /^node:crypto$/ }, () => ({ path: "preview-crypto", namespace: "preview-crypto" }));
    builder.onLoad({ filter: /.*/, namespace: "preview-crypto" }, () => ({ contents: 'export function createHash(){let text="";return {update(value){text+=value;return this;},digest(){let hash=0;for(const char of text)hash=(hash*31+char.charCodeAt(0))|0;return "fixture-only-"+hash;}}}' }));
  } }],
});
const script = result.outputFiles.find(file => file.path.endsWith(".js")).text.replace(/<\/script/gi, "<\\/script");
const css = result.outputFiles.find(file => file.path.endsWith(".css")).text;
const base = `:root{--ink:#272c33;--muted:#626a6a;--brand:#0f766e;--line:#dededa;--control-line:#858a87}*{box-sizing:border-box}body{margin:0;background:#f7f6f2;color:var(--ink);font:17px/1.45 'Times New Roman',Times,serif}h1,h2,h3,h4,p,ol,ul{margin:0;padding:0}button,input,select,textarea{font:inherit}button{border:0;background:none;cursor:pointer}ul,ol{list-style:none}strong{font-weight:700}summary{list-style:none}summary::-webkit-details-marker{display:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.previewBrand{height:64px;padding:12px max(24px,calc((100vw - 1180px)/2));display:flex;gap:12px;align-items:center;background:white;border-bottom:1px solid var(--line)}.previewBrand strong{font-size:19px;color:#1b6d64;white-space:nowrap}.previewBrand span{margin-left:auto;color:var(--muted);font-size:16px}.previewMain{max-width:1228px;margin:20px auto 40px;padding:0 24px}.previewNotice{color:var(--muted);font-size:14px;margin-bottom:10px}@media(max-width:640px){.previewBrand{padding:12px 16px}.previewBrand span{display:none}.previewMain{padding:0 14px;margin-top:14px}}`;
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thực đơn dành cho bác sĩ dinh dưỡng · Xem giao diện</title><style>${base}\n${css}</style></head><body><div id="clinical-preview"></div><script>${script}</script></body></html>`);
console.log(`Created ${path.relative(root,output)}. Read-only fixture, no real API calls or writes.`);
