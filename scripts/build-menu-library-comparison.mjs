import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "docs/design/previews/kho-mau-a-b.html");
const mark = await readFile(path.join(root, "public/brand/mark.svg"));
const result = await build({
  absWorkingDir: root,
  entryPoints: ["docs/design/prototypes/MenuLibraryComparison.tsx"],
  bundle: true, write: false, minify: true, platform: "browser", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', BRAND_MARK: JSON.stringify(`data:image/svg+xml;base64,${mark.toString("base64")}`) },
  legalComments: "inline",
});
const css = await readFile(path.join(root, "docs/design/prototypes/menu-library-comparison.css"), "utf8");
const script = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>So sánh A/B · Kho mẫu thực đơn · Dinh dưỡng 2598</title><style>${css}</style></head><body><div id="comparison"></div><noscript>Bản xem thử tương tác cần JavaScript. Xem ảnh A và B kèm theo trong thư mục này.</noscript><script>${script}</script></body></html>\n`);
console.log(`Created ${path.relative(root, destination)} (${Buffer.byteLength(script)} bytes of bundled JS). No API calls or production changes.`);
