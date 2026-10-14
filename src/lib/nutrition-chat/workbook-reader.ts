import JSZip from "jszip";
import path from "node:path";
import { NutritionWorkbookError, WORKBOOK_LIMITS } from "./workbook-security";

const REQUIRED = ["Nhap khau phan", "Tu nhap", "Ngay va muc tieu", "_meta"];
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const decode = (value: string) => value.replace(/&(?:amp|quot|apos|lt|gt);/g, entity => ({ "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" })[entity]!);
function attributes(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], decode(match[2] ?? match[3])]));
}
const fail = (message: string): never => { throw new NutritionWorkbookError("INVALID_WORKBOOK", message); };

/** Construct a read-only input view so ExcelJS never allocates immutable catalogue/chart/build cells. */
export async function workbookInputView(original: JSZip): Promise<Uint8Array> {
  const document = await original.file("xl/workbook.xml")!.async("string");
  const relationshipsEntry = original.file("xl/_rels/workbook.xml.rels") ?? fail("Thiếu quan hệ workbook.");
  const relationships = await relationshipsEntry.async("string");
  const links = new Map([...relationships.matchAll(/<(?:[\w.-]+:)?Relationship\b[^>]*\/?>/g)].map(match => { const entry = attributes(match[0]); return [entry.Id, entry]; }));
  const records = [...document.matchAll(/<(?:[\w.-]+:)?sheet\b[^>]*\/?>/g)].map(match => attributes(match[0]));
  const selected = REQUIRED.map(name => {
    const matches = records.filter(record => record.name === name);
    if (matches.length !== 1) return fail(`Thiếu hoặc trùng sheet ${name}.`);
    const record = matches[0];
    const id = Object.entries(record).find(([key]) => key.endsWith(":id"))?.[1];
    const link = id ? links.get(id) : null;
    if (!link || !link.Type?.endsWith("/worksheet") || link.TargetMode === "External") return fail("Quan hệ trang tính không hợp lệ.");
    const target = link.Target.startsWith("/") ? path.posix.normalize(link.Target.slice(1)) : path.posix.normalize(path.posix.join("xl", link.Target));
    if (!target.startsWith("xl/worksheets/") || !original.file(target)) return fail("Đường dẫn trang tính không hợp lệ.");
    return { name, target, state: record.state === "veryHidden" || record.state === "hidden" ? record.state : "visible" };
  });
  const view = new JSZip();
  const spreadsheetNS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const officeNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const relNS = "http://schemas.openxmlformats.org/package/2006/relationships";
  const overrides: string[] = [];
  const rels: string[] = [];
  for (let index = 0; index < selected.length; index++) {
    const sheet = selected[index];
    let xml = await original.file(sheet.target)!.async("string");
    xml = xml.replace(/<(?:[\w.-]+:)?c\b[^>]*(?:\/>|>[\s\S]*?<\/(?:[\w.-]+:)?c>)/g, cell => {
      const address = attributes(cell.slice(0, cell.indexOf(">") + 1)).r;
      const parsed = /^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(address ?? "");
      if (!parsed || Number(parsed[2]) > WORKBOOK_LIMITS.catalogue + 100) return fail("Địa chỉ ô ngoài giới hạn.");
      const column = [...parsed[1]].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0);
      const allowed = sheet.name === "Nhap khau phan" ? column <= 16 || column === 28 : sheet.name === "Tu nhap" ? column <= 55 : sheet.name === "Ngay va muc tieu" ? column <= 8 : column === 1;
      return allowed ? cell : "";
    });
    const filename = `xl/worksheets/sheet${index + 1}.xml`;
    view.file(filename, xml);
    overrides.push(`<Override PartName="/${filename}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    rels.push(`<Relationship Id="rId${index + 1}" Type="${officeNS}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`);
  }
  for (const [filename, type, relation] of [["styles.xml", "styles", "styles"], ["sharedStrings.xml", "sharedStrings", "sharedStrings"]]) {
    const entry = original.file(`xl/${filename}`);
    if (!entry) continue;
    view.file(`xl/${filename}`, await entry.async("uint8array"));
    overrides.push(`<Override PartName="/xl/${filename}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.${type}+xml"/>`);
    rels.push(`<Relationship Id="${relation}" Type="${officeNS}/${relation}" Target="${filename}"/>`);
  }
  view.file("xl/workbook.xml", `${XML}<workbook xmlns="${spreadsheetNS}" xmlns:r="${officeNS}"><sheets>${selected.map((sheet, index) => `<sheet name="${escape(sheet.name)}" sheetId="${index + 1}" state="${sheet.state}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`);
  view.file("xl/_rels/workbook.xml.rels", `${XML}<Relationships xmlns="${relNS}">${rels.join("")}</Relationships>`);
  view.file("_rels/.rels", `${XML}<Relationships xmlns="${relNS}"><Relationship Id="office" Type="${officeNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  view.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides.join("")}</Types>`);
  return view.generateAsync({ type: "uint8array", compression: "STORE" });
}
