import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "integrations", "nutrition-chat");
const output = join(root, "public", "nutrition-chat");
const argumentsList = process.argv.slice(2);
if (argumentsList.length && (argumentsList.length !== 2 || argumentsList[0] !== "--public-url")) throw new Error("Usage: node scripts/package-nutrition-chat-plugin.mjs [--public-url https://domain]");
const publicUrl = new URL(argumentsList[1] || "https://dinhduong2598.food");
if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash || publicUrl.pathname !== "/") throw new Error("Public URL must be an HTTPS origin without credentials, path or query.");
const fixedDate = new Date("2026-10-14T00:00:00.000Z");
// The installed reference and live get_workflow use the same tool contracts.
const guide = JSON.parse(await readFile(join(root, "src/lib/nutrition-chat/tool-guide.json"), "utf8"));
const guideText = ["# Công cụ, kết quả và cách xử lý", "", `Phiên bản hướng dẫn: ${guide.version}. Một plugin Dinh dưỡng 2598 chứa ${Object.keys(guide.tools).length} công cụ; không phải cài mỗi công cụ thành một plugin.`, "", guide.start, "", "## Bản nháp để duyệt thành phần", "", guide.approvalPresentation, "", ...Object.entries(guide.tools).flatMap(([name, tool]) => [`## ${name} — ${tool.title}`, "", `- Khi dùng: ${tool.when}`, `- Đầu vào: ${tool.input}`, `- Kết quả: ${tool.returns}`, `- Tiếp theo: ${tool.next}`, ""]), "## Các luồng", "", ...guide.recipes.map(recipe => `- **${recipe.goal}:** ${recipe.steps}`), "", "## Khi không hoàn thành", "", ...guide.recovery.map(item => `- **${item.case}:** ${item.action}`), ""].join("\n");
await writeFile(join(source, "skills/dinh-duong-2598/references/cong-cu.md"), guideText);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const full = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Plugin packages must not include symbolic links.");
    if (entry.isDirectory()) files.push(...await sourceFiles(full));
    else if (entry.isFile()) {
      if (!/\.(json|md)$/i.test(entry.name)) throw new Error(`Unexpected plugin asset: ${entry.name}`);
      files.push(full);
    }
  }
  return files;
}

const plugin = JSON.parse(await readFile(join(source, "plugin.json"), "utf8"));
const mcp = JSON.parse(await readFile(join(source, "mcp.json"), "utf8"));
if (plugin.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json" || plugin.name !== "dinh-duong-2598") throw new Error("Unsupported plugin identity or schema.");
const server = mcp.mcpServers?.["dinh-duong-2598"];
if (mcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json" || server?.type !== "streamable-http") throw new Error("Unsupported MCP schema or transport.");
const skill = await readFile(join(source, "skills", "dinh-duong-2598", "SKILL.md"), "utf8");
if (!/^---\r?\nname: dinh-duong-2598\r?\ndescription: [^\r\n]+\r?\n---\r?\n/.test(skill)) throw new Error("Skill frontmatter is incomplete.");
const files = await sourceFiles(source);
const pluginZip = new JSZip();
const skillZip = new JSZip();
const skillResources = {};
for (const file of files) {
  const path = relative(source, file).split("\\").join("/");
  let content = (await readFile(file, "utf8")).replaceAll("https://dinhduong2598.food", publicUrl.origin).replaceAll("\r\n", "\n");
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:clientSecret|client_secret|Authorization)\s*[":=]+\s*["']?(?:Bearer\s+)?[A-Za-z0-9_-]{24,}/.test(content)) throw new Error(`Credential-like value in ${path}`);
  if (path.endsWith(".json")) JSON.parse(content);
  pluginZip.file(path, content, { date: fixedDate, createFolders: false });
  const resourcePath = /^skills\/([^/]+)\/(.+)$/.exec(path);
  if(resourcePath){const uri=`skill://dinh-duong-2598/${resourcePath[1]}/${resourcePath[2]}`;skillResources[uri]={uri,mimeType:"text/markdown",text:content};}
  if (path.startsWith("skills/dinh-duong-2598/")) skillZip.file(path.slice("skills/".length), content, { date: fixedDate, createFolders: false });
}
const skillCatalog = Object.values(skillResources).filter(resource=>resource.uri.endsWith("/SKILL.md")).map(resource=>{
  const header=/^---\n([\s\S]+?)\n---\n/.exec(resource.text);if(!header)throw Error("Missing skill frontmatter");
  const frontmatter={};for(const line of header[1].split("\n")){const field=/^([a-zA-Z][a-zA-Z0-9_-]*): (.+)$/.exec(line);if(!field)throw Error("Unsupported scalar skill frontmatter");frontmatter[field[1]]=field[2];}
  const directory=resource.uri.slice(0,-"SKILL.md".length);if(directory.split("/").at(-2)!==frontmatter.name||!frontmatter.description)throw Error("Skill name/path mismatch");
  return {uri:resource.uri,frontmatter,resources:Object.values(skillResources).filter(item=>item.uri.startsWith(directory)).map(item=>({uri:item.uri,digest:`sha256:${createHash("sha256").update(item.text,"utf8").digest("hex")}`}))};
});
await mkdir(output, { recursive: true });
const assets = [
  ["dinh-duong-2598-plugin.zip", await pluginZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } })],
  ["dinh-duong-2598-skill.zip", await skillZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } })],
  ["huong-dan-ket-noi.md", Buffer.from((await readFile(join(root, "docs", "nutrition-chat", "ket-noi.md"), "utf8")).replaceAll("https://dinhduong2598.food", publicUrl.origin).replaceAll("\r\n", "\n"))],
  ["mcp-skills.json",Buffer.from(JSON.stringify({skills:skillCatalog,resources:skillResources}))],
];
const checksums = [];
for (const [name, content] of assets) {
  await writeFile(join(output, name), content);
  checksums.push(`${createHash("sha256").update(content).digest("hex")}  ${name}`);
  process.stdout.write(`${name}: ${content.length} bytes\n`);
}
await writeFile(join(output, "SHA256SUMS"), `${checksums.join("\n")}\n`);
