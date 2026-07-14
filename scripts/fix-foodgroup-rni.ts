import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// Phân loại foodGroup cho các dòng còn null (chủ yếu RNI — không có nguồn "nhóm" gốc, xem
// README-data.md mục 13). Dựa trên TỪ KHOÁ trong TÊN (tiếng Việt, giữ nguyên dấu), so khớp
// THEO TỪ/CỤM TỪ nguyên vẹn (không phải substring) — bài học từ sự cố alias (mục 12).
//
// Đây là suy luận theo tên món, ĐỘ TIN CẬY THẤP HƠN dữ liệu có nguồn gốc (vddGroupRaw) — theo
// yêu cầu người dùng 2026-07-13: "điền trước, để soát lại sau". Áp dụng rồi vẫn cần người dùng
// duyệt lại, đặc biệt các dòng biên (branded/composite).
//
// ⚠️ Qua 2 đợt soát bằng mắt đã sửa các lỗi sau (đọc trước khi chỉnh sửa thêm):
// 1) So từ khoá TRÊN TOÀN BỘ tên khiến "Bánh...vị dâu/lá dứa" (hương vị, không phải nguyên
//    liệu chính) rơi vào rau củ quả -> thêm cổng nhận diện TÊN MÓN (Bánh/Chè/Kẹo/Mứt/Kem/
//    Thạch/Pizza/Hamburger/Sushi/Hạt...) chạy TRƯỚC hết, và giới hạn so khớp nguyên liệu
//    trong 4 TỪ ĐẦU (nguyên liệu chính thường đứng đầu tên).
// 2) Từ ĐƠN chung chung (vd "ớt", "rau") thắng trước CỤM TỪ cụ thể hơn cùng chứa từ đó (vd
//    "tương ớt", "bột nêm rau củ") chỉ vì nhóm của từ đơn được duyệt trước trong mảng RULES
//    -> tách 2 tầng so khớp: TẦNG A so mọi CỤM TỪ (>=2 từ) của MỌI nhóm trước, TẦNG B mới so
//    từ đơn theo thứ tự ưu tiên nhóm — cụm từ cụ thể luôn thắng từ đơn bất kể thuộc nhóm nào.
// 3) Đợt soát thứ 3: "Hạt nêm Knorr/Maggi" (gia vị) bị cổng "hạt" bắt nhầm thành Nhóm hạt ->
//    thêm loại trừ "hạt nêm" khỏi cổng. "Chuối tiêu"/"Nhãn hạt tiêu" bị từ đơn "tiêu" (Gia vị)
//    thắng trước từ đơn "chuối"/"nhãn" (rau củ quả) do Gia vị đứng trước trong mảng RULES;
//    "Quả trứng gà (lê ki ma)" bị từ đơn "trứng" thắng trước "quả" vì Nhóm trứng đứng trước
//    rau củ quả -> thêm 3 cụm từ này làm phrase CỤM TỪ (Tầng A) của rau củ quả. "Đậu gà
//    (chickpeas)" là đậu chứ không phải gà, bị từ đơn "gà" (Nhóm thịt) bắt nhầm -> thêm "đậu
//    gà" làm cụm từ của Nhóm hạt các loại.
// 4) Đợt soát thứ 4: TẦNG B vốn so theo THỨ TỰ MẢNG RULES nên "Rau giấp cá" bị "cá" (Nhóm
//    thịt, đứng trước rau củ quả trong mảng) thắng "rau" dù "rau" đứng ở từ đầu tiên -> đổi
//    Tầng B sang so theo VỊ TRÍ TỪ SỚM NHẤT khớp trong window (hoà vị trí mới theo thứ tự mảng).
//    "Cá lóc chay"/"Đùi gà chay"... là ĐỒ CHAY (giả mặn), không phải thịt/cá thật dù trùng từ
//    khoá -> loại nhóm Nhóm thịt khỏi Tầng B khi tên có từ "chay" (thà để trống còn hơn gán sai).
//    Sau khi đổi Tầng B, phát hiện thêm: "Bột đạm/Protein/Maltodextrin/Whey..." (thực phẩm bổ
//    sung tăng cơ) bị từ đơn "bột" (Nhóm lương thực) bắt nhầm -> bỏ từ đơn "bột", chỉ giữ cụm
//    từ cụ thể (bột gạo/bắp/ngô/mì/sắn/nếp/năng/đậu tương) — bột thực phẩm bổ sung không khớp
//    cụm nào nên để trống, đúng hơn là gán nhầm lương thực. Đồng thời bổ sung một loạt từ khoá
//    rau/củ/quả/hải sản còn thiếu (cà rốt, su hào, su su, súp lơ, dừa, quýt, đào, sả, hẹ, lươn,
//    tép, xúc xích...) để tăng độ phủ — đều là từ ít khả năng nhầm lẫn, đã kiểm tra không đụng
//    độ với các cụm/từ hiện có. KHÔNG thêm "lá lốt" (rau) làm từ khoá vì sẽ đụng "Chả lá lốt"
//    (món thịt cuốn lá lốt) — nếu cần, phải thêm "chả lá lốt" làm cụm riêng của Nhóm thịt trước.

const APPLY = process.argv.includes("--apply");
const KEYWORD_WINDOW = 4; // chỉ so khớp nguyên liệu trong N từ đầu tên

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
}
function hasPhrase(tokens: string[], phrase: string): boolean {
  const p = tokenize(phrase);
  if (p.length === 0) return false;
  for (let i = 0; i + p.length <= tokens.length; i++) {
    if (p.every((w, j) => tokens[i + j] === w)) return true;
  }
  return false;
}
function hasAny(tokens: string[], phrases: string[]): boolean {
  return phrases.some((p) => hasPhrase(tokens, p));
}
function startsWithAny(tokens: string[], phrases: string[]): boolean {
  return phrases.some((p) => {
    const words = tokenize(p);
    return words.length <= tokens.length && words.every((w, i) => tokens[i] === w);
  });
}

const INSTANT_MEAL_BRANDS = [
  "vifon", "acecook", "gấu đỏ", "omachi", "hảo hảo", "đệ nhất", "samurai", "mikochi", "siukay",
  "phú hương", "cung đình", "táo quân", "đậu đậu", "hoàng gia", "xưa và nay", "số đỏ",
];
const DAIRY_BRANDS = [
  "vinamilk", "dutch lady", "th true milk", "th true", "nutimilk", "wakodo", "enfamil", "enfalac",
  "frisolac", "similac", "physiolac", "aptamil", "aptamilk", "meiji", "nan", "ensure", "glucerna",
  "nepro", "pediasure", "vitadairy", "colos", "growplus", "dielac", "nuvi", "kirkland", "riso opti",
  "calokid", "oggi", "pediaplus", "canxi pro", "sure diecerna", "yoko gold",
];
const DRINK_BRANDS = [
  "coca cola", "coca", "fanta", "sprite", "pepsi", "pocari", "red bull", "monster", "lipton",
  "nescafe", "highlands", "vinacafe", "resoni", "nuticafé", "vfresh", "crystal light", "tropicana",
];
// bánh mặn/có nhân thịt/hải sản -> món hỗn hợp, không phải bánh kẹo ngọt
const BANH_SAVORY_KW = ["mặn", "nhân thịt", "nhân tôm", "pate", "cà ri", "sốt", "kim chi"];
// bánh dạng bún/mì/gạo (lương thực), không phải bánh ngọt
const BANH_STAPLE_KW = [
  "mì", "phở", "đa", "tráng", "canh", "gạo", "bột lọc", "đúc", "cuốn", "xèo", "căn", "khọt",
];

// (nhóm, cụm từ) dùng chung cho cả tầng A (>=2 từ) và tầng B (1 từ) — thứ tự mảng = độ ưu
// tiên khi hoà (cùng số từ, nhiều nhóm cùng khớp).
const RULES: { group: string; phrases: string[] }[] = [
  {
    group: "Nhóm sữa và các chế phẩm từ sữa",
    phrases: ["bột kem", "pho mát", "sữa", "phô mai", "pho mai", "yaourt", "yogurt", "váng sữa", ...DAIRY_BRANDS],
  },
  { group: "Nhóm trứng và các sản phẩm từ trứng", phrases: ["trứng"] },
  {
    group: "Gia vị",
    phrases: [
      "muối", "tiêu", "nước mắm", "nước tương", "giấm", "mắm", "bột canh", "bột ngọt", "gia vị",
      "hạt nêm", "bột nêm", "tương ớt", "tương cà", "dầu hào", "mạch nha", "mật ong", "đường",
      "mayonnaise",
    ],
  },
  {
    group: "Nhóm thịt các loại, cá và hải sản",
    phrases: [
      "chả lá lốt", "xúc xích", "bạch tuộc",
      "thịt", "cá", "tôm", "cua", "mực", "hàu", "hến", "ốc", "ếch", "gà", "vịt", "heo", "lợn", "bò",
      "dê", "cừu", "ngan", "ngỗng", "chim", "gan", "lòng", "dạ dày", "óc", "tim", "bầu dục", "lưỡi",
      "da gà", "giò", "chả", "nem chua", "lạp xưởng", "dăm bông", "kfc", "popeyes",
      "mỡ gà", "mỡ cừu", "mỡ lợn", "đầu bò", "đầu heo", "đuôi bò", "đuôi heo", "chân giò",
      "huyết gà", "huyết vịt", "sò", "ngao", "hải sâm", "ba ba", "châu chấu", "nhộng",
      "lươn", "rươi", "rạm", "tép",
    ],
  },
  {
    group: "Nhóm rau củ quả khác",
    phrases: [
      // cụm từ cụ thể phải đứng trước để thắng từ đơn "tiêu"/"trứng"/"đậu" ở nhóm khác trong Tầng A
      // ("đậu bắp" = quả okra, không phải nhóm đậu/hạt dù có chữ "đậu")
      "chuối tiêu", "nhãn hạt tiêu", "quả trứng gà", "đậu bắp",
      "xương sông", "ngải cứu", "hoa lý", "bạc hà", "cần tây", "cần ta", "ngó sen", "thì là",
      "rong biển", "cà rốt", "su hào", "su su", "súp lơ",
      "rau", "củ", "quả", "trái cây", "dưa", "cà chua", "cà tím", "cà bát", "cà pháo", "bí đao",
      "bí đỏ", "bí ngô", "bầu", "mướp", "khổ qua", "mướp đắng", "cải", "hành", "tỏi", "ớt", "gừng",
      "nghệ", "chanh", "cam", "bưởi", "chuối", "xoài", "đu đủ", "dứa", "na", "mãng cầu", "nhãn",
      "vải", "măng cụt", "chôm chôm", "mít", "lê", "táo", "nho", "dâu", "mận", "hồng", "khế",
      "sấu", "cóc", "ổi", "gấc", "thanh long", "vú sữa", "lựu", "mơ", "chà là", "nhót", "măng",
      "nấm", "khoai", "sắn", "kê", "ngô", "bắp", "gạo", "cốm", "nếp", "dừa", "quýt", "quất", "đào",
      "sung", "trám", "sả", "hẹ",
    ],
  },
  { group: "Nhóm hạt các loại", phrases: ["đậu gà", "hạt", "đậu", "lạc", "vừng", "mè"] },
  { group: "Nhóm dầu ăn, mỡ các loại", phrases: ["dầu", "bơ"] },
  {
    group: "Nhóm nước giải khát",
    phrases: [
      "cà phê", "trà", "nước ép", "nước ngọt", "nước tăng lực", "nước uống tăng lực", "nước lọc",
      "nước khoáng", "nước mía", "nước chanh", "nước rau má", "nước sâm", "cocktail", "bia",
      "rượu", "cô nhắc", ...DRINK_BRANDS,
    ],
  },
  {
    group: "Nhóm lương thực",
    phrases: [
      // "bột" ĐỂ RIÊNG dạng cụm từ cụ thể (bột gạo/bắp/mì...) — bỏ từ đơn "bột" vì bột đạm/
      // whey/maltodextrin (thực phẩm bổ sung) không phải lương thực dù cũng gọi là "bột"
      "bột gạo", "bột bắp", "bột ngô", "bột mì", "bột sắn", "bột nếp", "bột năng", "bột đậu tương",
      "mì", "bún", "miến", "phở", "hủ tiếu", "nui", "ngũ cốc", "xôi", "cơm",
    ],
  },
];

function classify(name: string): string | null {
  const allTokens = tokenize(name);

  // Bước 1: mì/phở/miến/cháo/bún gói ăn liền có thương hiệu -> món ăn hỗn hợp
  if (hasAny(allTokens, INSTANT_MEAL_BRANDS) && hasAny(allTokens, ["mì", "phở", "miến", "cháo", "bún"])) {
    return "Món ăn hỗn hợp";
  }

  // Bước 2: cổng nhận diện TÊN MÓN — chạy trước, không bị nguyên liệu/hương vị phía sau gây nhiễu
  if (startsWithAny(allTokens, ["pizza", "hamburger", "sushi", "shushi"])) return "Món ăn hỗn hợp";
  // "Hạt nêm ..." là gia vị (hạt nêm Knorr/Maggi...), không phải nhóm hạt
  if (startsWithAny(allTokens, ["hạt"]) && !hasPhrase(allTokens.slice(0, 2), "hạt nêm")) {
    return "Nhóm hạt các loại";
  }
  if (startsWithAny(allTokens, ["bánh"])) {
    if (hasAny(allTokens, BANH_STAPLE_KW)) return "Nhóm lương thực";
    if (hasAny(allTokens, BANH_SAVORY_KW)) return "Món ăn hỗn hợp";
    return "Nhóm bánh kẹo, đồ ngọt";
  }
  if (startsWithAny(allTokens, ["chè", "kẹo", "mứt", "kem", "thạch", "caramen", "caramel", "pudding"])) {
    return "Nhóm bánh kẹo, đồ ngọt";
  }
  if (startsWithAny(allTokens, ["sinh tố", "nước ép", "nước ngọt"])) return "Nhóm nước giải khát";
  if (startsWithAny(allTokens, ["cháo"])) return "Nhóm lương thực";

  // Bước 3: so khớp nguyên liệu — CHỈ trong N từ đầu, TẦNG A (cụm >=2 từ) trước TẦNG B (từ đơn)
  const tokens = allTokens.slice(0, KEYWORD_WINDOW);

  for (const rule of RULES) {
    const multiWord = rule.phrases.filter((p) => tokenize(p).length >= 2);
    if (hasAny(tokens, multiWord)) return rule.group;
  }

  // Tầng B: từ đơn — "chay" (đồ chay/giả mặn, vd "Cá lóc chay", "Đùi gà chay") KHÔNG PHẢI
  // thịt/cá thật dù trùng từ khoá -> loại nhóm Nhóm thịt khỏi Tầng B khi có từ "chay", thà để
  // trống còn hơn gán nhầm.
  const isChay = hasPhrase(allTokens, "chay");

  // Chọn theo VỊ TRÍ TỪ SỚM NHẤT khớp trong window (nguyên liệu chính đứng đầu tên phải thắng
  // từ đơn xuất hiện muộn hơn dù nhóm của từ muộn hơn đứng trước trong mảng RULES — bài học từ
  // "Rau giấp cá" bị "cá" (Nhóm thịt, đứng trước trong RULES) thắng "rau" (đứng ở vị trí 0)).
  // Hoà vị trí thì theo thứ tự ưu tiên nhóm trong RULES.
  let bestGroup: string | null = null;
  let bestPos = Infinity;
  for (const rule of RULES) {
    if (isChay && rule.group === "Nhóm thịt các loại, cá và hải sản") continue;
    const singleWord = rule.phrases.filter((p) => tokenize(p).length === 1);
    for (const w of singleWord) {
      const pos = tokens.indexOf(w);
      if (pos !== -1 && pos < bestPos) {
        bestPos = pos;
        bestGroup = rule.group;
      }
    }
  }
  return bestGroup;
}

async function main() {
  const items = await prisma.food.findMany({
    where: { foodGroup: null },
    select: { id: true, name: true, source: true, foodType: true },
  });

  const results = items.map((i) => ({ ...i, assigned: classify(i.name) }));
  const byGroup = new Map<string, typeof results>();
  let unclassified = 0;
  for (const r of results) {
    const key = r.assigned ?? "(KHÔNG PHÂN LOẠI ĐƯỢC)";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(r);
    if (!r.assigned) unclassified++;
  }

  console.log(`Tổng: ${items.length}, phân loại được: ${items.length - unclassified}, không phân loại được: ${unclassified}\n`);
  for (const [group, list] of Array.from(byGroup.entries()).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`=== ${group} (${list.length}) ===`);
    list.forEach((r) => console.log(`  [${r.source}/${r.foodType}] ${r.name}`));
    console.log();
  }

  if (!APPLY) {
    console.log("(DRY RUN — chạy lại với --apply để thực sự ghi.)");
    return;
  }

  let updated = 0;
  for (const r of results) {
    if (!r.assigned) continue;
    await prisma.food.update({ where: { id: r.id }, data: { foodGroup: r.assigned } });
    updated++;
  }
  console.log(`\n✅ Đã cập nhật ${updated} dòng.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
