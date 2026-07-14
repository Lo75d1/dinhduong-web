// Seed the `foods` table from:
//  - D:\datanutrition\Thuc pham gop VDD va RNI.xlsx   (2659 rows, 169 cols — merged VDD+RNI composition)
//  - D:\datanutrition\Món ăn của VDD.xlsx              (1250 rows, 56 messy cols — VDD dishes, foodType=MA)
//
// See ../README-data.md for every assumption made below.

import "dotenv/config";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/prisma.js";
import { normalizeVi } from "../src/lib/normalize.js";

const MERGED_PATH = "D:\\datanutrition\\Thuc pham gop VDD va RNI.xlsx";
const MONAN_VDD_PATH = "D:\\datanutrition\\Món ăn của VDD.xlsx";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim();
}
function firstNonNull(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = num(v);
    if (n !== null) return n;
  }
  return null;
}
function level0to3(v: number | null, t1: number, t2: number, t3: number): number | null {
  if (v === null) return null;
  if (v < t1) return 0;
  if (v < t2) return 1;
  if (v < t3) return 2;
  return 3;
}
function containsAny(text: string | null, keywords: string[]): boolean {
  if (!text) return false;
  return keywords.some((k) => text.includes(k));
}

// ---- classification tables (see README-data.md #2) ----
const NHOM_MAP: Record<string, string> = {
  "Ngũ cốc và sản phẩm chế biến": "Nhóm lương thực",
  "Khoai củ và sản phẩm chế biến": "Nhóm lương thực",
  "Thịt và sản phẩm chế biến": "Nhóm thịt các loại, cá và hải sản",
  "Thủy sản và sản phẩm chế biến": "Nhóm thịt các loại, cá và hải sản",
  "Trứng và sản phẩm chế biến": "Nhóm trứng và các sản phẩm từ trứng",
  "Sữa và sản phẩm chế biến": "Nhóm sữa và các chế phẩm từ sữa",
  "Rau, quả, củ dùng làm rau": "Nhóm rau củ quả khác",
  "Quả chín": "Nhóm rau củ quả khác",
  "Hạt, quả giàu đạm, béo và sản phẩm chế biến": "Nhóm hạt các loại",
  "Dầu, mỡ, bơ": "Nhóm dầu ăn, mỡ các loại",
  "Gia vị, nước chấm": "Gia vị",
  "Nước giải khát": "Nhóm nước giải khát",
  "Đồ ngọt (đường, bánh, mứt, kẹo)": "Nhóm bánh kẹo, đồ ngọt",
  "Đồ hộp": "", // mixed (trái cây ngâm đường, đậu rang dầu...) — không chắc 1 nhóm, để trống
  "Thức ăn truyền thống": "Món ăn hỗn hợp", // bánh chưng/bánh bèo... — nhiều nguyên liệu, không phải 1 nhóm
};

// Nhóm gốc riêng của file "Món ăn của VDD.xlsx" (dishes, không phải nguyên liệu thô) — xem
// README-data.md mục 13. Chỉ map các nhóm CHẮC CHẮN 1 loại nguyên liệu chủ đạo; phần còn lại
// (đa số — món hỗn hợp nhiều nhóm, vd "Lẩu hải sản", "Xôi thịt thập cẩm") -> "Món ăn hỗn hợp".
const MONAN_GROUP_MAP: Record<string, string> = {
  "Các loại trái cây": "Nhóm rau củ quả khác",
  "Ngao, ốc": "Nhóm thịt các loại, cá và hải sản",
  "Các món trứng, sữa và chế phẩm": "Nhóm sữa và các chế phẩm từ sữa",
  "Chè, caramen, kem": "Nhóm bánh kẹo, đồ ngọt",
  "Các món xôi, chè": "Nhóm bánh kẹo, đồ ngọt",
  "Các món bánh, kẹo": "Nhóm bánh kẹo, đồ ngọt",
  "Giải khát": "Nhóm nước giải khát",
  "Món xào": "Nhóm thịt các loại, cá và hải sản",
  "Các món chế biến sẵn": "Nhóm thịt các loại, cá và hải sản",
};
const MONAN_MIXED_GROUP = "Món ăn hỗn hợp";

// proteinOrigin cho "Món ăn" + "Đồ hộp"/"Thức ăn truyền thống" (merged file, trước để ngỏ) —
// xem README-data.md mục 15. "Hỗn hợp" khác "Chưa phân loại": đã biết là món nhiều nguồn đạm.
const MONAN_PROTEIN_MAP: Record<string, string> = {
  "Các loại trái cây": "Thực vật",
  "Các món trứng, sữa và chế phẩm": "Trứng sữa",
  "Chè, caramen, kem": "Trứng sữa",
  "Ngao, ốc": "Thịt trắng",
  "Các món chế biến sẵn": "Chế biến",
};
const MIXED_PROTEIN_ORIGIN = "Hỗn hợp";
const MONAN_MIXED_PROTEIN_GROUPS = [
  "Các món khác",
  "Các loại bánh",
  "Bánh đa, bún, phở",
  "Bánh canh, bánh đa, bún, cháo, súp, hoành thánh, hủ tiếu, miến, mỳ, phở, lẩu",
  "Cơm, cháo, xôi",
  "Thức ăn truyền thống", // trùng tên với nhóm merged-file CB_GROUPS, xử lý ở cả 2 nơi
  "Các món bánh, kẹo",
  "Bún, cơm, xôi, cháo",
  "Các món xôi, chè",
  "Giải khát",
  "Đồ hộp", // trùng tên với nhóm merged-file, xử lý ở cả 2 nơi
  "Cơm các loại",
  "Món canh",
  "Burger, pizza",
];
// "Món xào" (15 dòng cố định, đã soát tên — xem README-data.md mục 15): không dùng từ khóa
// chung vì "sườn"/nội tạng không khớp RED_MEAT_KW/WHITE_MEAT_KW.
const MON_XAO_PROTEIN_MAP: Record<string, string> = {
  "Sườn xào chua ngọt": "Thịt đỏ",
  "Su hào xào": "Thực vật",
  "Rau muống xào": "Thực vật",
  "Thịt bò xào măng": "Thịt đỏ",
  "Thịt trâu xào rau muống": "Thịt đỏ",
  "Thịt bò xào dứa": "Thịt đỏ",
  "Thịt bò xào đậu cove": "Thịt đỏ",
  "Thịt bò xào hành tây, cà chua": "Thịt đỏ",
  "Thịt bò xào cần tỏi": "Thịt đỏ",
  "Thịt gà xào sả": "Thịt trắng",
  "Tim bầu dục xào cần tỏi": "Thịt đỏ",
  "Thịt bò xào hoa thiên lý": "Thịt đỏ",
  "Thịt chim câu xào răm": "Thịt trắng",
  "Thịt bò xào su su": "Thịt đỏ",
  "Thịt bò xào nấm": "Thịt đỏ",
};

const PROTEIN_PLANT_GROUPS = [
  "Ngũ cốc và sản phẩm chế biến",
  "Khoai củ và sản phẩm chế biến",
  "Rau, quả, củ dùng làm rau",
  "Quả chín",
  "Hạt, quả giàu đạm, béo và sản phẩm chế biến",
];
const PROTEIN_DAIRY_EGG_GROUPS = ["Trứng và sản phẩm chế biến", "Sữa và sản phẩm chế biến"];
const CB_GROUPS = [
  "Gia vị, nước chấm",
  "Đồ hộp",
  "Đồ ngọt (đường, bánh, mứt, kẹo)",
  "Nước giải khát",
  "Thức ăn truyền thống",
];
const CB_KEYWORDS = [
  "xúc xích", "giò lụa", "giò thủ", "chả lụa", "chả quế", "lạp xưởng", "pate",
  "hun khói", "jambon", "đóng hộp", "thịt hộp", "cá hộp", "mì ăn liền",
  "miến ăn liền", "phở ăn liền", "sữa chua", "sữa đặc", "sữa bột", "phô mai",
  "bơ thực vật", "tương ớt", "tương cà", "nước mắm", "nước chấm", "mứt",
  "kẹo", "bánh quy", "bánh kẹo", "nước ngọt", "nước giải khát", "sấy khô",
  "tẩm bột", "chiên xù", "ruốc", "nem chua",
];
const RED_MEAT_KW = ["thịt bò", "thịt lợn", "thịt heo", "thịt trâu", "thịt dê", "thịt cừu"];
const WHITE_MEAT_KW = ["thịt gà", "thịt vịt", "thịt ngan", "thịt ngỗng", "thịt chim", "thịt bồ câu"];
const PROCESSED_MEAT_KW = ["xúc xích", "giò", "chả", "lạp xưởng", "pate", "hun khói", "jambon", "đóng hộp", "thịt hộp", "nem chua", "ruốc"];
const PROCESSED_FISH_KW = ["đóng hộp", "hun khói", "chế biến", "xúc xích", "chả cá", "cá viên", "tẩm bột"];

// "SP" (Sản phẩm) — xem README-data.md mục 14. So khớp GIỮ NGUYÊN DẤU/hoa thường gốc, KHÔNG
// dùng normalizeVi (bài học sự cố alias — bỏ dấu gộp nhầm các từ khác nghĩa).
const SP_PACKAGING_RE = /\d+[.,]?\d*\s*(g|ml|kg|l|gr)\s*\/\s*(gói|hộp|túi|lon|chai|hủ|ly|thanh|viên|cái|miếng)/i;
const SP_BRANDS = [
  "Vinamilk", "NutiFood", "Nuti ", "NutiMilk", "Nuvi ", "Abbott", "Nestle", "Nestlé", "Physiolac",
  "Frisolac", "Enfamil", "Enfalac", "Similac", "Wakodo", "Acecook", "Vifon", "Masan", "Domino's",
  "Domino", "Pizza Hut", "KFC", "Lotteria", "Lipton", "Yakult", "Kirkland", "SokFarm", "Bibica",
  "Gullón", "Gullon", "Hammer", "RAW•BITE", "RAWBITE", "Vitadairy", "Nutren", "Ensure", "PediaSure",
  "Meiji", "Aptamil", "Morinaga", "Glico", "Ovaltine", "Milo", "TH true Milk", "TH True Milk",
  "Vfresh", "Dutch Lady", "Cô Gái Hà Lan", "Devondale", "Anlene", "Hảo Hảo", "Omachi", "Miliket",
  "Gấu Đỏ", "3 Miền", "Cung Đình", "Modilac", "Nutrilon", "Blackmores", "Glucerna", "Nepro",
  "Diecerna", "Calokid", "Colos", "Growplus", "GrowPlus", "Dielac", "CERELAC", "Cerelac",
  "Gold Standard", "Prostar", "Ultimate Nutrition", "7up", "Sprite", "Coca", "Pepsi",
  "McDonald", "Oishi", "Custas", "One One", "Solite", "Nature Zen",
];

// column index (1-based) in the merged file — see conversation notes / merge_food.ps1 pairs order
const COL = {
  nguon: 1,
  ten: 3,
  nhom: 4,
  nhomEn: 5,
  energyKj: 6,
  wastePercent: 7,
  rniCitation: 8,
  energyKcal: 9,
  water: 10,
  protein: 11,
  lipid: 12,
  glucid: 13,
  fiber: 14,
  ash: 15,
  animalProtein: 16,
  calcium: 17,
  iron: 18,
  magnesium: 19,
  manganese: 20,
  phosphorus: 21,
  potassium: 22,
  sodium: 23,
  zinc: 24,
  copperVdd: 25,
  copperRni: 26,
  selenium: 27,
  fluoride: 28,
  phytosterols: 29,
  purin: 30,
  retinol: 31,
  vitARae: 32,
  vitAMgVdd: 33,
  vitAMcgRni: 34,
  vitARe: 35,
  betaCaroten: 36,
  alphaCaroten: 37,
  cryptoxanthinBeta: 38,
  lycopene: 39,
  luteinZeaxanthin: 40,
  vitC: 41,
  vitB1: 42,
  vitB2: 43,
  vitB3: 44,
  niacinEquiv: 45,
  vitB5: 46,
  vitB6: 47,
  folateTotal: 48,
  folateFood: 49,
  folateDfe: 50,
  folicAcid: 51,
  vitB12: 52,
  vitB12Added: 53,
  biotin: 54,
  vitD: 55,
  vitD2: 56,
  vitD3: 57,
  vitE: 58,
  vitEAdded: 59,
  tocopherolAlpha: 60,
  tocopherolBeta: 61,
  tocopherolGamma: 62,
  tocopherolDelta: 63,
  tocotrienolAlpha: 64,
  tocotrienolBeta: 65,
  tocotrienolGamma: 66,
  tocotrienolDelta: 67,
  vitK: 68,
  dihydrophylloquinone: 69,
  menaquinone4: 70,
  choline: 71,
  tryptophan: 72,
  threonine: 73,
  isoleucine: 74,
  leucine: 75,
  lysine: 76,
  methionine: 77,
  cystine: 78,
  phenylalanine: 79,
  tyrosine: 80,
  valine: 81,
  arginine: 82,
  histidine: 83,
  alanine: 84,
  asparticAcid: 85,
  glutamicAcid: 86,
  glycine: 87,
  proline: 88,
  serine: 89,
  hydroxyproline: 90,
  satFatTotal: 91,
  palmitic: 92,
  margaric: 93,
  stearic: 94,
  rniUnknownFattyAcid: 95,
  behenic: 96,
  lignoceric: 97,
  mufaTotal: 98,
  myristoleic: 99,
  palmitoleic: 100,
  oleic: 101,
  pufaTotal: 102,
  linoleic: 103,
  linolenic: 104,
  arachidonic: 105,
  epa: 106,
  dha: 107,
  cholesterol: 108,
  transFatTotal: 109,
  c40: 110, c60: 111, c80: 112, c100: 113, c120: 114, c140: 115,
  c181Undiff: 116, c161Undiff: 117, c182Undiff: 118, c183Undiff: 119,
  c200: 120, c130: 121, c150: 122, c151: 123, c161Trans: 124, c171: 125,
  c181Trans: 126, c1811Trans: 127, c201: 128, c221Undiff: 129, c221c: 130,
  c221t: 131, c241c: 132, c182Cla: 133, c182Tt: 134, c182I: 135, c182Nfd: 136,
  c183N6Ccc: 137, c183I: 138, c184: 139, c202N6Cc: 140, c203Undiff: 141,
  c203N3: 142, c203N6: 143, c204Undiff: 144, c215: 145, c224: 146,
  c225N3Dpa: 147, transMonoenoic: 148, transPolyenoic: 149, stigmasterol: 150,
  campesterol: 151, betaSitosterol: 152,
  sugarsTotal: 153, glucose: 154, fructose: 155, lactose: 156, maltose: 157,
  galactose: 158, sucrose: 159, starch: 160, phyticAcid: 161, sugarsAdded: 162,
  caffeine: 163, theobromine: 164, alcohol: 165, isoflavoneTotal: 166,
  daidzein: 167, genistein: 168, glycetin: 169,
};

async function loadSheet(path: string, sheetIndex = 1) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb.worksheets[sheetIndex - 1];
}

function cellVal(ws: ExcelJS.Worksheet, row: number, col: number): unknown {
  const cell = ws.getRow(row).getCell(col);
  return cell.value;
}

async function seedMergedFood() {
  console.log("Reading merged VDD+RNI food file...");
  const ws = await loadSheet(MERGED_PATH);
  const rowCount = ws.rowCount;
  console.log(`  ${rowCount - 1} data rows`);

  const records = [];
  for (let r = 2; r <= rowCount; r++) {
    const g = (c: number) => cellVal(ws, r, c);
    const nguon = str(g(COL.nguon));
    const isVdd = nguon === "VDD";
    const ten = str(g(COL.ten)) ?? "(không tên)";
    const nhom = str(g(COL.nhom));

    let foodType = "TS";
    if (isVdd && nhom && CB_GROUPS.includes(nhom)) foodType = "CB";
    if (containsAny(ten, CB_KEYWORDS)) foodType = "CB";
    // "SP" (Sản phẩm — đóng gói/có thương hiệu), 1 trong 4 loại gốc app cũ (MA/CB/TS/SP) —
    // xem README-data.md mục 14. Soát bằng mắt toàn bộ ứng viên trước khi chốt 2 tín hiệu này.
    if (SP_PACKAGING_RE.test(ten) || SP_BRANDS.some((b) => ten.includes(b))) foodType = "SP";

    let proteinOrigin: string | null = null;
    if (isVdd && nhom) {
      if (PROTEIN_PLANT_GROUPS.includes(nhom)) proteinOrigin = "Thực vật";
      else if (PROTEIN_DAIRY_EGG_GROUPS.includes(nhom)) proteinOrigin = "Trứng sữa";
      else if (nhom === "Thịt và sản phẩm chế biến") {
        if (containsAny(ten, PROCESSED_MEAT_KW)) proteinOrigin = "Chế biến";
        else if (containsAny(ten, RED_MEAT_KW)) proteinOrigin = "Thịt đỏ";
        else if (containsAny(ten, WHITE_MEAT_KW)) proteinOrigin = "Thịt trắng";
      } else if (nhom === "Thủy sản và sản phẩm chế biến") {
        proteinOrigin = containsAny(ten, PROCESSED_FISH_KW) ? "Chế biến" : "Thịt trắng";
      } else if (MONAN_MIXED_PROTEIN_GROUPS.includes(nhom)) {
        proteinOrigin = MIXED_PROTEIN_ORIGIN; // "Đồ hộp"/"Thức ăn truyền thống" — hỗn hợp nhiều nguồn đạm
      }
    }

    const foodGroup = isVdd && nhom && NHOM_MAP[nhom] ? NHOM_MAP[nhom] : null;
    const purinMg = num(g(COL.purin));
    const cholesterolMg = num(g(COL.cholesterol));

    records.push({
      name: ten,
      nameNormalized: normalizeVi(ten),
      source: nguon ?? "VDD",
      sourceNote: isVdd ? "Viện Dinh Dưỡng Việt Nam" : "RNI",
      unit: "g",
      wastePercent: num(g(COL.wastePercent)),
      foodType,
      foodGroup,
      proteinOrigin,
      giLevel: null,
      purinLevel: level0to3(purinMg, 50, 100, 150),
      cholesterolLevel: level0to3(cholesterolMg, 1, 20, 50),
      vddGroupRaw: isVdd ? nhom : null,
      vddGroupEn: isVdd ? str(g(COL.nhomEn)) : null,

      energyKcal: num(g(COL.energyKcal)),
      energyKj: num(g(COL.energyKj)),
      waterG: num(g(COL.water)),
      proteinG: num(g(COL.protein)),
      animalProteinG: num(g(COL.animalProtein)),
      lipidG: num(g(COL.lipid)),
      glucidG: num(g(COL.glucid)),
      fiberG: num(g(COL.fiber)),
      ashG: num(g(COL.ash)),

      calciumMg: num(g(COL.calcium)),
      ironMg: num(g(COL.iron)),
      magnesiumMg: num(g(COL.magnesium)),
      manganeseMg: num(g(COL.manganese)),
      phosphorusMg: num(g(COL.phosphorus)),
      potassiumMg: num(g(COL.potassium)),
      sodiumMg: num(g(COL.sodium)),
      zincMg: num(g(COL.zinc)),
      copperMgVdd: num(g(COL.copperVdd)),
      copperMcgRni: num(g(COL.copperRni)),
      seleniumMcg: num(g(COL.selenium)),
      fluorideMcg: num(g(COL.fluoride)),
      phytosterolsMg: num(g(COL.phytosterols)),
      purinMg,

      retinolMcg: num(g(COL.retinol)),
      vitARaeMcg: num(g(COL.vitARae)),
      vitAMgVdd: num(g(COL.vitAMgVdd)),
      vitAMcgRni: num(g(COL.vitAMcgRni)),
      vitAReMcg: num(g(COL.vitARe)),
      betaCarotenMcg: num(g(COL.betaCaroten)),
      alphaCarotenMcg: num(g(COL.alphaCaroten)),
      cryptoxanthinBetaMcg: num(g(COL.cryptoxanthinBeta)),
      lycopeneMcg: num(g(COL.lycopene)),
      luteinZeaxanthinMcg: num(g(COL.luteinZeaxanthin)),
      vitCMg: num(g(COL.vitC)),
      vitB1Mg: num(g(COL.vitB1)),
      vitB2Mg: num(g(COL.vitB2)),
      vitB3Mg: num(g(COL.vitB3)),
      niacinEquivMg: num(g(COL.niacinEquiv)),
      vitB5Mg: num(g(COL.vitB5)),
      vitB6Mg: num(g(COL.vitB6)),
      folateTotalMcg: num(g(COL.folateTotal)),
      folateFoodMcg: num(g(COL.folateFood)),
      folateDfeMcg: num(g(COL.folateDfe)),
      folicAcidMcg: num(g(COL.folicAcid)),
      vitB12Mcg: num(g(COL.vitB12)),
      vitB12AddedMcg: num(g(COL.vitB12Added)),
      biotinMcg: num(g(COL.biotin)),
      vitDMcg: num(g(COL.vitD)),
      vitD2Mcg: num(g(COL.vitD2)),
      vitD3Mcg: num(g(COL.vitD3)),
      vitEMg: num(g(COL.vitE)),
      vitEAddedMg: num(g(COL.vitEAdded)),
      tocopherolAlphaMg: num(g(COL.tocopherolAlpha)),
      tocopherolBetaMg: num(g(COL.tocopherolBeta)),
      tocopherolGammaMg: num(g(COL.tocopherolGamma)),
      tocopherolDeltaMg: num(g(COL.tocopherolDelta)),
      tocotrienolAlphaMg: num(g(COL.tocotrienolAlpha)),
      tocotrienolBetaMg: num(g(COL.tocotrienolBeta)),
      tocotrienolGammaMg: num(g(COL.tocotrienolGamma)),
      tocotrienolDeltaMg: num(g(COL.tocotrienolDelta)),
      vitKMcg: num(g(COL.vitK)),
      dihydrophylloquinoneMcg: num(g(COL.dihydrophylloquinone)),
      menaquinone4Mcg: num(g(COL.menaquinone4)),
      cholineMg: num(g(COL.choline)),

      tryptophanMg: num(g(COL.tryptophan)),
      threonineMg: num(g(COL.threonine)),
      isoleucineMg: num(g(COL.isoleucine)),
      leucineMg: num(g(COL.leucine)),
      lysineMg: num(g(COL.lysine)),
      methionineMg: num(g(COL.methionine)),
      cystineMg: num(g(COL.cystine)),
      phenylalanineMg: num(g(COL.phenylalanine)),
      tyrosineMg: num(g(COL.tyrosine)),
      valineMg: num(g(COL.valine)),
      arginineMg: num(g(COL.arginine)),
      histidineMg: num(g(COL.histidine)),
      alanineMg: num(g(COL.alanine)),
      asparticAcidMg: num(g(COL.asparticAcid)),
      glutamicAcidMg: num(g(COL.glutamicAcid)),
      glycineMg: num(g(COL.glycine)),
      prolineMg: num(g(COL.proline)),
      serineMg: num(g(COL.serine)),
      hydroxyprolineG: num(g(COL.hydroxyproline)),

      satFatTotalG: num(g(COL.satFatTotal)),
      palmiticC160G: num(g(COL.palmitic)),
      margaricC170G: num(g(COL.margaric)),
      stearicC180G: num(g(COL.stearic)),
      behenicC220G: num(g(COL.behenic)),
      lignocericC240G: num(g(COL.lignoceric)),
      mufaTotalG: num(g(COL.mufaTotal)),
      myristoleicC141G: num(g(COL.myristoleic)),
      palmitoleicC161G: num(g(COL.palmitoleic)),
      oleicC181G: num(g(COL.oleic)),
      pufaTotalG: num(g(COL.pufaTotal)),
      linoleicC182G: num(g(COL.linoleic)),
      linolenicC183G: num(g(COL.linolenic)),
      arachidonicC204G: num(g(COL.arachidonic)),
      epaC205G: num(g(COL.epa)),
      dhaC226G: num(g(COL.dha)),
      cholesterolMg,
      transFatTotalG: num(g(COL.transFatTotal)),
      rniUnknownFattyAcidG: num(g(COL.rniUnknownFattyAcid)),

      c40G: num(g(COL.c40)), c60G: num(g(COL.c60)), c80G: num(g(COL.c80)),
      c100G: num(g(COL.c100)), c120G: num(g(COL.c120)), c140G: num(g(COL.c140)),
      c181UndiffG: num(g(COL.c181Undiff)), c161UndiffG: num(g(COL.c161Undiff)),
      c182UndiffG: num(g(COL.c182Undiff)), c183UndiffG: num(g(COL.c183Undiff)),
      c200G: num(g(COL.c200)), c130G: num(g(COL.c130)), c150G: num(g(COL.c150)),
      c151G: num(g(COL.c151)), c161TransG: num(g(COL.c161Trans)), c171G: num(g(COL.c171)),
      c181TransG: num(g(COL.c181Trans)), c1811TransG: num(g(COL.c1811Trans)),
      c201G: num(g(COL.c201)), c221UndiffG: num(g(COL.c221Undiff)), c221cG: num(g(COL.c221c)),
      c221tG: num(g(COL.c221t)), c241cG: num(g(COL.c241c)), c182ClaG: num(g(COL.c182Cla)),
      c182TtG: num(g(COL.c182Tt)), c182IG: num(g(COL.c182I)), c182NfdG: num(g(COL.c182Nfd)),
      c183N6CccG: num(g(COL.c183N6Ccc)), c183IG: num(g(COL.c183I)), c184G: num(g(COL.c184)),
      c202N6CcG: num(g(COL.c202N6Cc)), c203UndiffG: num(g(COL.c203Undiff)), c203N3G: num(g(COL.c203N3)),
      c203N6G: num(g(COL.c203N6)), c204UndiffG: num(g(COL.c204Undiff)), c215G: num(g(COL.c215)),
      c224G: num(g(COL.c224)), c225N3DpaG: num(g(COL.c225N3Dpa)), transMonoenoicG: num(g(COL.transMonoenoic)),
      transPolyenoicG: num(g(COL.transPolyenoic)), stigmasterolMg: num(g(COL.stigmasterol)),
      campesterolMg: num(g(COL.campesterol)), betaSitosterolMg: num(g(COL.betaSitosterol)),

      sugarsTotalG: num(g(COL.sugarsTotal)),
      glucoseG: num(g(COL.glucose)),
      fructoseG: num(g(COL.fructose)),
      lactoseG: num(g(COL.lactose)),
      maltoseG: num(g(COL.maltose)),
      galactoseG: num(g(COL.galactose)),
      sucroseG: num(g(COL.sucrose)),
      starchG: num(g(COL.starch)),
      phyticAcidMg: num(g(COL.phyticAcid)),
      sugarsAddedG: num(g(COL.sugarsAdded)),

      caffeineMg: num(g(COL.caffeine)),
      theobromineMg: num(g(COL.theobromine)),
      alcoholG: num(g(COL.alcohol)),
      isoflavoneTotalMg: num(g(COL.isoflavoneTotal)),
      daidzeinMg: num(g(COL.daidzein)),
      genisteinMg: num(g(COL.genistein)),
      glyceteinMg: num(g(COL.glycetin)),
    });
  }
  return records;
}

// VDD Mon an: 56 messy cols, coalesce duplicates (see README-data.md #4)
async function seedVddMonAn() {
  console.log("Reading VDD Mon an file...");
  const ws = await loadSheet(MONAN_VDD_PATH);
  const rowCount = ws.rowCount;
  console.log(`  ${rowCount - 1} data rows`);

  const records = [];
  for (let r = 2; r <= rowCount; r++) {
    const g = (c: number) => cellVal(ws, r, c);
    const ten = str(g(2)) ?? "(không tên)";

    const lipid = firstNonNull(g(7), g(28));
    const glucid = firstNonNull(g(8), g(26), g(32));
    const chatXo = firstNonNull(g(24), g(43));
    const canxi = firstNonNull(g(12), g(20));
    const sat = firstNonNull(g(13), g(21));
    const kem = firstNonNull(g(14), g(22));
    const kali = firstNonNull(g(23), g(38));
    const magie = firstNonNull(g(18), g(30), g(55));
    const betaCaroten = firstNonNull(g(10), g(47), g(48), g(49), g(52));
    const vitC = firstNonNull(g(11), g(46), g(51));
    const cholesterolMg = num(g(17));
    const monAnNhom = str(g(3));
    const foodGroup = monAnNhom ? (MONAN_GROUP_MAP[monAnNhom] ?? MONAN_MIXED_GROUP) : null;
    const proteinOrigin = MON_XAO_PROTEIN_MAP[ten]
      ?? (monAnNhom ? (MONAN_PROTEIN_MAP[monAnNhom] ?? (MONAN_MIXED_PROTEIN_GROUPS.includes(monAnNhom) ? MIXED_PROTEIN_ORIGIN : null)) : null);

    records.push({
      name: ten,
      nameNormalized: normalizeVi(ten),
      source: "VDD",
      sourceNote: "Viện Dinh Dưỡng Việt Nam (Món ăn)",
      unit: "g",
      foodType: "MA",
      foodGroup,
      proteinOrigin,
      energyKcal: num(g(5)),
      proteinG: num(g(6)),
      lipidG: lipid,
      glucidG: glucid,
      fiberG: chatXo,
      calciumMg: canxi,
      ironMg: sat,
      zincMg: kem,
      sodiumMg: num(g(15)),
      potassiumMg: kali,
      magnesiumMg: magie,
      betaCarotenMcg: betaCaroten,
      vitAMcgRni: num(g(9)), // Vitamin A (μg) gốc VDD Mon an — dùng chung cột µg với RNI để so sánh được
      vitCMg: vitC,
      cholesterolMg,
      cholesterolLevel: level0to3(cholesterolMg, 1, 20, 50),
      vddGroupRaw: str(g(3)),
      vddGroupEn: str(g(4)),
    });
  }
  return records;
}

async function main() {
  console.log("Deleting existing foods (idempotent re-seed)...");
  await prisma.dishIngredient.deleteMany({ where: { foodId: { not: null } } });
  await prisma.food.deleteMany({});

  const foodRecords = await seedMergedFood();
  const monAnRecords = await seedVddMonAn();
  const all = [...foodRecords, ...monAnRecords];

  console.log(`Inserting ${all.length} food rows in batches...`);
  const BATCH = 500;
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.food.createMany({ data: batch as any });
    console.log(`  ${Math.min(i + BATCH, all.length)}/${all.length}`);
  }

  const count = await prisma.food.count();
  console.log(`Done. foods table now has ${count} rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
