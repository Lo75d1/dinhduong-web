import type { Profile } from "./PersonalProfile";

export default function ProfileSummary({ profile }: { profile: Profile | null }) {
  if (!profile) return <p className="mt-3 text-sm text-neutral-800">Chưa nhập hồ sơ cá nhân — bấm “✏️ Sửa hồ sơ” để nhập tuổi, giới, chiều cao, cân nặng (cần cho đối chiếu nhu cầu).</p>;
  const h = Number(profile.height), w = Number(profile.weight);
  const bmi = h > 0 && w > 0 ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;
  const activity = { sedentary: "Tĩnh tại", light: "Nhẹ", moderate: "Trung bình", heavy: "Nặng", very_heavy: "Rất nặng" }[profile.activityLevel];
  const physiology = { normal: "", pregnant_1: "Thai kỳ (3 tháng đầu)", pregnant_2: "Thai kỳ (3 tháng giữa)", pregnant_3: "Thai kỳ (3 tháng cuối)", lactating_1: "Cho bú (0–6 tháng)", lactating_2: "Cho bú (6–12 tháng)" }[profile.physiology];
  const chips: [string, string][] = [
    ["Giới", profile.gender],
    ["Tuổi", `${profile.age || "—"} ${profile.ageUnit === "thang" ? "tháng" : "tuổi"}`],
    ["Chiều cao", profile.height ? `${profile.height} cm` : "—"],
    ["Cân nặng", profile.weight ? `${profile.weight} kg` : "—"],
    ["BMI", bmi != null ? String(bmi) : "—"],
    ["Vận động", activity],
  ];
  if (physiology) chips.push(["Sinh lý", physiology]);
  return <div className="mt-3 flex flex-wrap gap-2">{chips.map(([label, value]) => <span key={label} className="inline-flex items-baseline gap-1 rounded-md border border-[#8fa99e] bg-white px-2.5 py-1 text-sm"><span className="text-neutral-600">{label}:</span><span className="font-semibold text-neutral-950">{value}</span></span>)}</div>;
}
