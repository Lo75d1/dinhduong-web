import ExcelJS from "exceljs";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SheetRow = { sourceCode: string; imageUrl: string; imageSourceUrl: string };

function text(value: unknown) {
  if (value && typeof value === "object") {
    const linked = value as { text?: unknown; hyperlink?: unknown; result?: unknown };
    if (typeof linked.hyperlink === "string") return linked.hyperlink.trim();
    if (typeof linked.text === "string") return linked.text.trim();
    if (typeof linked.result === "string") return linked.result.trim();
  }
  return String(value ?? "").trim();
}

function normalHeader(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("viendinhduong.vn") ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    await requireDataEditor();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Hãy chọn file Excel xuất từ fetch_mon_an_api.py." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return Response.json({ error: "File Excel tối đa 15 MB." }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) return Response.json({ error: "File Excel không có trang dữ liệu." }, { status: 400 });

    const headers = sheet.getRow(1).values as unknown[];
    const headerIndex = new Map(headers.map((value, index) => [normalHeader(value), index]));
    const codeIndex = headerIndex.get("ma so");
    const imageIndex = headerIndex.get("url anh");
    const sourceIndex = headerIndex.get("nguon anh du lieu");
    if (!codeIndex || !imageIndex) {
      return Response.json({ error: "File thiếu cột Mã số hoặc URL ảnh. Hãy dùng file do script mới xuất ra." }, { status: 400 });
    }

    const rows: SheetRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || rows.length >= 3000) return;
      const sourceCode = text(row.getCell(codeIndex).value);
      const imageUrl = readUrl(text(row.getCell(imageIndex).value));
      const imageSourceUrl = sourceIndex ? readUrl(text(row.getCell(sourceIndex).value)) : "";
      if (sourceCode && imageUrl) rows.push({ sourceCode, imageUrl, imageSourceUrl });
    });
    if (!rows.length) return Response.json({ error: "Không tìm thấy dòng nào có Mã số và URL ảnh hợp lệ của Viện Dinh dưỡng." }, { status: 400 });

    const foods = await prisma.food.findMany({
      where: { sourceCode: { in: [...new Set(rows.map((row) => row.sourceCode))] } },
      select: { id: true, name: true, source: true, sourceCode: true, foodType: true, imageUrl: true, imageSourceUrl: true },
    });
    const byCode = new Map<string, typeof foods>();
    for (const food of foods) {
      if (!food.sourceCode) continue;
      const list = byCode.get(food.sourceCode) ?? [];
      list.push(food);
      byCode.set(food.sourceCode, list);
    }

    const matches = rows.map((row) => {
      const candidates = byCode.get(row.sourceCode) ?? [];
      const preferred = candidates.filter((food) => food.source === "VDD" && food.foodType === "MA");
      const selected = preferred.length === 1 ? preferred[0] : candidates.length === 1 ? candidates[0] : null;
      return {
        ...row,
        status: selected ? "MATCHED" : candidates.length > 1 ? "AMBIGUOUS" : "NOT_FOUND",
        food: selected ? { ...selected } : null,
      };
    });
    const matched = matches.filter((item) => item.status === "MATCHED");
    return Response.json({
      items: matches.slice(0, 3000),
      summary: { fileRows: rows.length, matched: matched.length, unchanged: matched.filter((item) => item.food?.imageUrl === item.imageUrl).length, notFound: matches.filter((item) => item.status === "NOT_FOUND").length, ambiguous: matches.filter((item) => item.status === "AMBIGUOUS").length },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không thể đọc file Excel để xem trước." }, { status: 500 });
  }
}
