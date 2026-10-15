import JSZip from "jszip";
import { inflateRawSync } from "node:zlib";
import { NutritionInputError } from "./validation";
import { isNutritionWebsiteLink } from "./website-links";

export const WORKBOOK_LIMITS = { bytes: 5 * 1024 * 1024, expandedBytes: 64 * 1024 * 1024, entryBytes: 32 * 1024 * 1024, worksheetBytes: 32 * 1024 * 1024, entries: 512, rows: 1000, days: 90, customFoods: 100, catalogue: 6000 } as const;

export class NutritionWorkbookError extends NutritionInputError {
  constructor(public readonly code: string, message: string) { super(message, "file", code === "WORKBOOK_LIMIT" ? 413 : 400); this.name = "NutritionWorkbookError"; }
}

/** Only for bytes produced by our own writer: inspect declared sizes without inflating a second copy. */
export function assertNutritionWorkbookExportBudget(bytes: Uint8Array): void {
  const fail = (): never => { throw new NutritionWorkbookError("WORKBOOK_LIMIT", "Excel vượt giới hạn xử lý offline; giảm số ngày/dòng/chất hoặc phạm vi danh mục rồi xuất lại."); };
  if (bytes.byteLength < 22 || bytes.byteLength > WORKBOOK_LIMITS.bytes) fail();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.byteLength - 22; offset >= Math.max(0, bytes.byteLength - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) fail();
  const entries = view.getUint16(end + 10, true);
  const directoryLength = view.getUint32(end + 12, true);
  let cursor = view.getUint32(end + 16, true);
  const directoryEnd = cursor + directoryLength;
  if (!entries || entries > WORKBOOK_LIMITS.entries || directoryEnd > end || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) fail();
  let expanded = 0;
  const decoder = new TextDecoder();
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > directoryEnd || view.getUint32(cursor, true) !== 0x02014b50) fail();
    const size = view.getUint32(cursor + 24, true);
    const compressed = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const next = cursor + 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    if (next > directoryEnd || size === 0xffffffff || compressed === 0xffffffff || size > WORKBOOK_LIMITS.entryBytes) fail();
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (/^xl\/worksheets\/.*\.xml$/i.test(name) && size > WORKBOOK_LIMITS.worksheetBytes) fail();
    expanded += size;
    if (expanded > WORKBOOK_LIMITS.expandedBytes) fail();
    cursor = next;
  }
  if (cursor !== directoryEnd) fail();
}

/** Read the central directory before decompression to reject ZIP bombs and unsupported ZIP forms. */
export async function inspectWorkbookArchive(bytes: Uint8Array): Promise<JSZip> {
  const fail = (message: string): never => { throw new NutritionWorkbookError("INVALID_WORKBOOK", message); };
  if (bytes.byteLength < 22 || bytes.byteLength > WORKBOOK_LIMITS.bytes) fail("File Excel rỗng hoặc vượt giới hạn 5 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.byteLength - 22; offset >= Math.max(0, bytes.byteLength - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) fail("Không phải file XLSX hợp lệ.");
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) fail("Không hỗ trợ ZIP nhiều phần.");
  const entries = view.getUint16(end + 10, true);
  const directoryLength = view.getUint32(end + 12, true);
  let cursor = view.getUint32(end + 16, true);
  const directoryStart = cursor;
  if (!entries || entries > WORKBOOK_LIMITS.entries || cursor + directoryLength > end) fail("Cấu trúc ZIP hoặc số thành phần không hợp lệ.");
  const seen = new Set<string>();
  let expanded = 0;
  const decoder = new TextDecoder();
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) fail("Danh mục ZIP bị lỗi.");
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true);
    const uncompressed = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end || flags & 1 || (method !== 0 && method !== 8)) fail("ZIP mã hóa hoặc kiểu nén không được hỗ trợ.");
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (!name || /[\u0000-\u001f]/.test(name) || name.startsWith("/") || name.includes("\\") || name.split("/").some(part => part === "..") || seen.has(name)) fail("Tên thành phần ZIP không an toàn hoặc bị trùng.");
    seen.add(name);
    if (uncompressed === 0xffffffff || compressed === 0xffffffff || uncompressed > WORKBOOK_LIMITS.entryBytes) fail("Thành phần ZIP vượt giới hạn.");
    if (/^xl\/worksheets\/.*\.xml$/i.test(name) && uncompressed > WORKBOOK_LIMITS.worksheetBytes) fail("Trang tính vượt giới hạn.");
    if (/vbaProject|externalLinks|embeddings|activeX|customUI|connections\.xml|queryTables/i.test(name)) fail("File chứa macro, kết nối hoặc nội dung nhúng không được phép.");
    expanded += uncompressed;
    if (expanded > WORKBOOK_LIMITS.expandedBytes) fail("File giải nén vượt giới hạn 64 MB.");
    if (localOffset + 30 > directoryStart || view.getUint32(localOffset, true) !== 0x04034b50) fail("Header ZIP cục bộ không hợp lệ.");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const contentOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (contentOffset + compressed > directoryStart || decoder.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength)) !== name || view.getUint16(localOffset + 8, true) !== method) fail("Thông tin ZIP cục bộ không khớp danh mục.");
    // A malicious central directory can lie about expanded size. Bound the actual inflater before JSZip runs.
    try {
      const content = bytes.subarray(contentOffset, contentOffset + compressed);
      const actual = method === 0 ? content : inflateRawSync(content, { maxOutputLength: Math.min(WORKBOOK_LIMITS.entryBytes, uncompressed + 1) });
      if (actual.byteLength !== uncompressed) fail("Kích thước giải nén thực tế không khớp.");
    } catch (error) {
      if (error instanceof NutritionWorkbookError) throw error;
      fail("Nội dung ZIP bị lỗi hoặc vượt giới hạn giải nén.");
    }
    cursor = next;
  }
  if (cursor !== view.getUint32(end + 16, true) + directoryLength) fail("Danh mục ZIP không nhất quán.");
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(bytes, { checkCRC32: true }); } catch { return fail("File ZIP bị lỗi hoặc kiểm tra toàn vẹn thất bại."); }
  if (!zip.file("xl/workbook.xml") || !zip.file("[Content_Types].xml")) fail("Thiếu cấu trúc workbook.");
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !/\.(?:xml|rels)$/i.test(entry.name)) continue;
    const xml = await entry.async("string");
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail("Không cho phép thực thể XML.");
    // Our read-only website hyperlinks are allowed; external data/formula connections stay blocked.
    const withoutWebsiteLinks = /\.rels$/i.test(entry.name) && /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(entry.name) ? xml.replace(/<(?:[\w.-]+:)?Relationship\b[^<>]*\/>/g, tag => {
      const pairs = [...tag.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], match[2] ?? match[3]]);
      const attributes = Object.fromEntries(pairs);
      const knownAttributes = pairs.length === 4 && new Set(pairs.map(pair => pair[0])).size === 4 && pairs.every(pair => ["Id", "Type", "Target", "TargetMode"].includes(pair[0]));
      return knownAttributes && attributes.TargetMode === "External" && attributes.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" && isNutritionWebsiteLink(attributes.Target ?? "") ? "" : tag;
    }) : xml;
    if (/TargetMode\s*=\s*["']External["']/i.test(withoutWebsiteLinks)) fail("Không cho phép liên kết hoặc công thức ngoài workbook.");
    if (entry.name === "[Content_Types].xml" && /macroEnabled/i.test(xml)) fail("Không hỗ trợ workbook có macro.");
  }
  return zip;
}
