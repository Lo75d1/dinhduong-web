import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { normalizeVi } from "../src/lib/normalize.js";

// Đợt 1 (2026-07-12) — tên gọi khác/địa phương cho thực phẩm, theo yêu cầu người dùng.
// CHỈ gồm các cặp tôi chắc chắn (khác biệt vùng miền Bắc/Trung/Nam phổ biến, được biết rộng
// rãi) — KHÔNG suy đoán hàng loạt cho toàn bộ CSDL. verified=false luôn — đây là gợi ý theo
// kiến thức chung, chưa có nguồn kiểm chứng, chỉ phục vụ tìm kiếm.
//
// ⚠️ BÀI HỌC (xem sự cố 2026-07-12): so khớp PHẢI giữ nguyên dấu tiếng Việt. Dùng
// normalizeVi() (bỏ dấu) để so khớp làm nhiều từ khác nghĩa gộp làm một — "dừa"/"dứa"/"dưa"
// đều thành "dua", "ngô" khớp nhầm cả "ngọt"/"ngỗng", "lạc" khớp nhầm cả "Cá lác"/"Similac".
// Đã phải xoá sạch 622 dòng rác vì lỗi này. KHÔNG sửa lại cách so khớp ở dưới nếu chưa hiểu
// rõ vì sao phải giữ dấu + so "bắt đầu bằng" (startsWith) thay vì "chứa" (contains).
//
// Quy trình đã dùng để tạo danh sách MATCHES dưới đây: chạy
// `scripts/_alias-candidates-dryrun.ts` (chỉ đọc, in ứng viên) rồi soát bằng mắt từng dòng
// trước khi đưa vào đây — vd đã loại "Rau mùi tàu..." khỏi rule "rau mùi" vì đó là RAU KHÁC
// (mùi tàu/ngò gai, không phải rau mùi/ngò rí).

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
}
function viPart(name: string): string {
  return name.split("(")[0].trim();
}
function startsWithPhrase(nameTokens: string[], phraseTokens: string[]): boolean {
  if (nameTokens.length < phraseTokens.length) return false;
  return phraseTokens.every((t, i) => nameTokens[i] === t);
}

type Rule = {
  target: string; // cụm từ tiếng Việt CÓ DẤU, so khớp "bắt đầu bằng" trên phần tên trước dấu "("
  aliases: { alias: string; region?: string }[];
  excludeIds?: string[]; // loại trừ thủ công sau khi soát bằng mắt (xem _alias-candidates-dryrun.ts)
};

const RULES: Rule[] = [
  { target: "ngô", aliases: [{ alias: "Bắp", region: "Nam" }] },
  { target: "lạc", aliases: [{ alias: "Đậu phộng", region: "Nam" }] },
  { target: "dứa", aliases: [{ alias: "Thơm", region: "Nam" }, { alias: "Khóm", region: "Nam" }] },
  {
    target: "rau mùi",
    aliases: [{ alias: "Ngò", region: "Nam" }, { alias: "Ngò rí", region: "Nam" }],
    excludeIds: ["cmrfzruib00ci0sm1ehj295t9", "cmrfzrxgr00s70sm16yj3naco"], // "Rau mùi tàu..." — rau khác (ngò gai)
  },
  { target: "thịt lợn", aliases: [{ alias: "Thịt heo", region: "Nam" }] },
  { target: "sắn", aliases: [{ alias: "Khoai mì", region: "Nam" }] },
  { target: "bí ngô", aliases: [{ alias: "Bí đỏ", region: "Nam" }] },
  { target: "bí xanh", aliases: [{ alias: "Bí đao", region: "Nam" }] },
  { target: "na", aliases: [{ alias: "Mãng cầu", region: "Nam" }, { alias: "Mãng cầu ta", region: "Nam" }] },
  { target: "mướp đắng", aliases: [{ alias: "Khổ qua", region: "Nam" }] },
  { target: "rau ngót", aliases: [{ alias: "Rau bồ ngót", region: "Trung/Nam" }] },
  { target: "đậu tương", aliases: [{ alias: "Đậu nành", region: "Nam" }] },
];

async function main() {
  const foods = await prisma.food.findMany({ select: { id: true, name: true, source: true } });
  let createdCount = 0;

  for (const rule of RULES) {
    const phraseTokens = tokenize(rule.target);
    const matches = foods.filter(
      (f) => startsWithPhrase(tokenize(viPart(f.name)), phraseTokens) && !rule.excludeIds?.includes(f.id)
    );

    if (matches.length === 0) {
      console.log(`⚠️  "${rule.target}" — không khớp thực phẩm nào, bỏ qua.`);
      continue;
    }

    for (const food of matches) {
      for (const a of rule.aliases) {
        const existing = await prisma.foodAlias.findFirst({
          where: { foodId: food.id, aliasNormalized: normalizeVi(a.alias) },
        });
        if (existing) continue;
        await prisma.foodAlias.create({
          data: {
            foodId: food.id,
            alias: a.alias,
            aliasNormalized: normalizeVi(a.alias),
            region: a.region ?? null,
            verified: false,
          },
        });
        createdCount++;
        console.log(`+ [${food.source}] "${food.name}" ← alias "${a.alias}"${a.region ? ` (${a.region})` : ""}`);
      }
    }
  }

  console.log(`\n✅ Đã tạo ${createdCount} alias.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
