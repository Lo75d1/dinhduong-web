// Khớp 1 dòng NutritionRecommendation (KhuyenNghi) phù hợp với hồ sơ cá nhân.
// Mirror logic app cũ (findKhuyenNghi/parseAgeRange trong JS_Analyze.html) + tận dụng
// thêm cột physicalActivity (72 dòng, KHÔNG có trong app cũ dùng để chọn giữa 3 mức
// lao động của người lớn — app cũ chỉ lấy dòng đầu tiên khớp, ở đây khớp đúng theo mức).

export type RecommendationRow = {
  id: string;
  stt: number | null;
  ageGroup: string;
  gender: string;
  energyKcal: number | null;
  referenceWeightKg: number | null;
  physicalActivity: string | null;
  proteinMinPct: number | null;
  proteinMaxPct: number | null;
  lipidMinPct: number | null;
  lipidMaxPct: number | null;
  glucidMinPct: number | null;
  glucidMaxPct: number | null;
  [key: string]: unknown; // các cột vi chất (vitA, calcium, ...) đọc động
};

export type RecommendationTarget = {
  value: number | null;
  type: string | null;
  isDelta: boolean;
  baseValue: number | null;
  deltaValue: number | null;
};

type MatchInput = {
  gender: "Nam" | "Nữ";
  physiology: "normal" | "pregnant_1" | "pregnant_2" | "pregnant_3" | "lactating_1" | "lactating_2";
  ageYr: number;
  ageMonth: number;
  activityLevel: "sedentary" | "light" | "moderate" | "heavy" | "very_heavy";
};

function parseAgeRange(text: string): { min: number; max: number; unit: "thang" | "tuoi" } | null {
  const t = text.toLowerCase();
  const unit: "thang" | "tuoi" = t.includes("tháng") ? "thang" : "tuoi";
  const nums = t.match(/\d+\.?\d*/g);
  if (!nums) return null;
  const min = parseFloat(nums[0]);
  let max = nums.length > 1 ? parseFloat(nums[1]) : min;
  if (t.includes("+") || t.includes(">=") || t.includes("trở lên")) max = 999;
  return { min, max, unit };
}

const ACTIVITY_TO_VN: Record<MatchInput["activityLevel"], string> = {
  sedentary: "Nhẹ",
  light: "Nhẹ",
  moderate: "Trung bình",
  heavy: "Nặng",
  very_heavy: "Nặng",
};

export function findRecommendation(rows: RecommendationRow[], input: MatchInput): RecommendationRow | null {
  // Phụ nữ có thai / cho con bú -> khớp theo nhãn đặc biệt, không theo tuổi
  if (input.gender === "Nữ" && input.physiology !== "normal") {
    const label =
      input.physiology === "pregnant_1"
        ? "Phụ nữ có thai (3 tháng đầu)"
        : input.physiology === "pregnant_2"
        ? "Phụ nữ có thai (3 tháng giữa)"
        : input.physiology === "pregnant_3"
          ? "Phụ nữ có thai (3 tháng cuối)"
          : "Phụ nữ cho con bú";
    return rows.find((r) => r.ageGroup === label) ?? null;
  }

  const candidates = rows.filter((r) => {
    if (r.gender !== input.gender) return false;
    if (r.ageGroup.startsWith("Phụ nữ")) return false;
    const rng = parseAgeRange(r.ageGroup);
    if (!rng) return false;
    const ageInUnit = rng.unit === "thang" ? input.ageMonth : input.ageYr;
    return ageInUnit >= rng.min && ageInUnit <= rng.max;
  });

  if (candidates.length <= 1) return candidates[0] ?? null;

  // nhiều dòng cùng nhóm tuổi (người lớn, chia theo mức lao động) -> khớp đúng mức
  const wantActivity = ACTIVITY_TO_VN[input.activityLevel];
  const byActivity = candidates.find((r) => r.physicalActivity === wantActivity);
  return byActivity ?? candidates[0];
}

/** Các trường có hậu tố `(delta)` ở thai kỳ/cho bú là phần cộng thêm, không phải mục tiêu cả ngày. */
export function resolveRecommendationTarget(
  recommendation: RecommendationRow | null,
  baseRecommendation: RecommendationRow | null,
  field: string,
): RecommendationTarget {
  const raw = recommendation?.[field];
  const rawValue = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  const rawType = recommendation?.[`${field}Type`];
  const type = typeof rawType === "string" ? rawType : null;
  const isDelta = Boolean(type && /\(\s*delta\s*\)/i.test(type));
  if (!isDelta) return { value: rawValue, type, isDelta: false, baseValue: null, deltaValue: null };

  const base = baseRecommendation?.[field];
  const baseValue = typeof base === "number" && Number.isFinite(base) ? base : null;
  return {
    value: rawValue !== null && baseValue !== null ? baseValue + rawValue : null,
    type,
    isDelta: true,
    baseValue,
    deltaValue: rawValue,
  };
}
