"use client";

import { useEffect, useState } from "react";
import WhoGrowthAssessment from "./WhoGrowthAssessment";
import type { WhoGrowthEntry } from "@/lib/who-growth";

export type Profile = {
  age: string;
  ageUnit: "tuoi" | "thang";
  gender: "Nam" | "Nữ";
  height: string;
  weight: string;
  activityLevel: "sedentary" | "light" | "moderate" | "heavy" | "very_heavy";
  physiology: "normal" | "pregnant_1" | "pregnant_2" | "pregnant_3" | "lactating_1" | "lactating_2";
  pregnancyWeek: string;
  prePregnancyWeight: string;
  pregnancyNote: string;
};

const DEFAULT_PROFILE: Profile = {
  age: "",
  ageUnit: "tuoi",
  gender: "Nam",
  height: "",
  weight: "",
  activityLevel: "light",
  physiology: "normal",
  pregnancyWeek: "",
  prePregnancyWeight: "",
  pregnancyNote: "",
};

const LS_KEY = "khauphan_profile_v1";

const ACTIVITY_OPTIONS: { value: Profile["activityLevel"]; label: string; factor: number }[] = [
  { value: "sedentary", label: "Tĩnh tại — văn phòng, ít vận động", factor: 1.2 },
  { value: "light", label: "Nhẹ — đi bộ, 1-3 buổi tập/tuần", factor: 1.375 },
  { value: "moderate", label: "Trung bình — LĐ nhẹ, 3-5 buổi tập", factor: 1.55 },
  { value: "heavy", label: "Nặng — LĐ nặng, 6-7 buổi tập", factor: 1.725 },
  { value: "very_heavy", label: "Rất nặng — LĐ cực nặng, VĐV", factor: 1.9 },
];

const PHYSIOLOGY_OPTIONS: { value: Profile["physiology"]; label: string; bonus: number }[] = [
  { value: "normal", label: "Bình thường", bonus: 0 },
  { value: "pregnant_1", label: "Có thai 3 tháng đầu", bonus: 50 },
  { value: "pregnant_2", label: "Có thai 3 tháng giữa", bonus: 250 },
  { value: "pregnant_3", label: "Có thai 3 tháng cuối", bonus: 450 },
  { value: "lactating_1", label: "Cho con bú 6 tháng đầu", bonus: 500 },
  { value: "lactating_2", label: "Cho con bú 6 tháng sau", bonus: 500 },
];

function toNumber(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function computeMifflinStJeor(
  w: number,
  h: number,
  ageYr: number,
  gender: string,
  activity: Profile["activityLevel"],
  physiology: Profile["physiology"]
) {
  const bmr = gender === "Nữ" ? 10 * w + 6.25 * h - 5 * ageYr - 161 : 10 * w + 6.25 * h - 5 * ageYr + 5;
  const act = ACTIVITY_OPTIONS.find((a) => a.value === activity) ?? ACTIVITY_OPTIONS[1];
  const phys = PHYSIOLOGY_OPTIONS.find((p) => p.value === physiology) ?? PHYSIOLOGY_OPTIONS[0];
  const tdee = bmr * act.factor + phys.bonus;
  return { bmr, activityFactor: act.factor, activityLabel: act.label, physBonus: phys.bonus, physLabel: phys.label, tdee: Math.round(tdee) };
}

function bmiStatus(bmi: number): string {
  if (bmi < 18.5) return "Thiếu cân";
  if (bmi < 23) return "Bình thường";
  if (bmi < 25) return "Thừa cân";
  return "Béo phì";
}

function isPregnancy(physiology: Profile["physiology"]) {
  return physiology === "pregnant_1" || physiology === "pregnant_2" || physiology === "pregnant_3";
}

const round = (n: number) => Math.round(n * 10) / 10;

export default function PersonalProfile({ onChange }: { onChange?: (p: Profile) => void }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [growthEntries, setGrowthEntries] = useState<WhoGrowthEntry[]>([]);

  useEffect(() => {
    // Chờ sau hydration để dữ liệu local không làm HTML server/client lệch nhau.
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (raw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
      } catch {
        // localStorage không dùng được — bỏ qua, dùng giá trị mặc định
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(profile));
    } catch {
      // đầy/khóa localStorage — không chặn UI
    }
    onChange?.(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, hydrated]);

  useEffect(() => {
    // DB lưu giới tính không dấu ("Nu"), profile lưu có dấu ("Nữ") — quy đổi khi gọi API
    const genderParam = profile.gender === "Nữ" ? "Nu" : "Nam";
    fetch(`/api/growth-standards?gender=${genderParam}`)
      .then((r) => r.json())
      .then((d) => setGrowthEntries(d.items ?? []))
      .catch(() => setGrowthEntries([]));
  }, [profile.gender]);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  const ageYr = profile.ageUnit === "thang" ? toNumber(profile.age) / 12 : toNumber(profile.age);
  const ageMonth = profile.ageUnit === "thang" ? toNumber(profile.age) : toNumber(profile.age) * 12;
  const w = toNumber(profile.weight);
  const h = toNumber(profile.height);
  const isChild = ageMonth > 0 && ageMonth <= 228;
  const hasBasics = ageYr > 0 && w > 0 && h > 0;

  const bmi = hasBasics ? w / Math.pow(h / 100, 2) : null;
  const mifflin = hasBasics && !isChild ? computeMifflinStJeor(w, h, ageYr, profile.gender, profile.activityLevel, profile.physiology) : null;
  const prePregnancyWeight = toNumber(profile.prePregnancyWeight);
  const weightChange = isPregnancy(profile.physiology) && prePregnancyWeight > 0 && w > 0 ? w - prePregnancyWeight : null;

  let summary = "Bấm để nhập tuổi/cao/cân — dùng cho BMI, TDEE và các đối chiếu khuyến nghị.";
  if (mifflin) summary = `✓ Ước tính cá nhân Mifflin ${mifflin.tdee} kcal/ngày · BMI ${round(bmi!)} (${bmiStatus(bmi!)})`;
  else if (isChild && hasBasics) summary = `✓ Trẻ em ${round(ageMonth)} tháng tuổi — xem biểu đồ tăng trưởng bên dưới`;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className="text-sm font-semibold text-neutral-700">Hồ sơ cá nhân</h2>
        <span className="text-xs text-neutral-400">{open ? "▴" : "▾"}</span>
      </button>
      {!open && <p className="mt-1 text-xs text-neutral-500">{summary}</p>}

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tuổi">
              <input
                type="number"
                min={0}
                value={profile.age}
                onChange={(e) => set("age", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Đơn vị tuổi">
              <select
                value={profile.ageUnit}
                onChange={(e) => set("ageUnit", e.target.value as Profile["ageUnit"])}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="tuoi">Năm tuổi</option>
                <option value="thang">Tháng tuổi</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Giới tính">
              <select
                value={profile.gender}
                onChange={(e) => set("gender", e.target.value as Profile["gender"])}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </Field>
            <Field label="Tình trạng">
              <select
                value={profile.physiology}
                onChange={(e) => set("physiology", e.target.value as Profile["physiology"])}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {PHYSIOLOGY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Mức lao động (chỉ áp dụng cho người lớn ≥18 tuổi)">
            <select
              value={profile.activityLevel}
              onChange={(e) => set("activityLevel", e.target.value as Profile["activityLevel"])}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} (×{o.factor})
                </option>
              ))}
            </select>
          </Field>

          {profile.gender === "Nữ" && isPregnancy(profile.physiology) && <div className="rounded-md border-2 border-[#a77b10] bg-[#fff8df] p-3"><div><p className="font-semibold text-neutral-950">Theo dõi thai kỳ</p><p className="mt-1 text-sm text-neutral-900">Ghi nhận để theo dõi khẩu phần cùng bác sĩ hoặc dinh dưỡng viên; không thay thế khám thai.</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Tuần thai hiện tại"><input type="number" min={1} max={42} value={profile.pregnancyWeek} onChange={(e) => set("pregnancyWeek", e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" /></Field><Field label="Cân nặng trước mang thai (kg)"><input type="number" min={0} step="0.1" value={profile.prePregnancyWeight} onChange={(e) => set("prePregnancyWeight", e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" /></Field><label className="sm:col-span-2"><span className="mb-1 block text-xs text-neutral-900">Ghi chú thai kỳ / chỉ định chuyên môn</span><textarea value={profile.pregnancyNote} onChange={(e) => set("pregnancyNote", e.target.value)} rows={2} placeholder="VD: nghén, đái tháo đường thai kỳ, thiếu máu, chỉ định của bác sĩ..." className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" /></label></div>{weightChange !== null && <p className="mt-3 rounded border border-[#d3b45d] bg-white px-3 py-2 text-sm text-neutral-950">Chênh lệch cân nặng ghi nhận: <b>{round(weightChange)} kg</b> so với trước mang thai. Cần đối chiếu theo hồ sơ khám thai, không tự kết luận chỉ từ chỉ số này.</p>}</div>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Chiều cao (cm)">
              <input
                type="number"
                min={0}
                value={profile.height}
                onChange={(e) => set("height", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Cân nặng (kg)">
              <input
                type="number"
                min={0}
                value={profile.weight}
                onChange={(e) => set("weight", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>

          {hasBasics && (
            <div className={isChild ? "" : "rounded-md bg-neutral-50 p-3 text-sm"}>
              {isChild ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-neutral-600">
                    Trẻ em ({round(ageMonth)} tháng tuổi) — BMI người lớn không áp dụng, đối chiếu
                    theo chuẩn tăng trưởng WHO bên dưới.
                  </p>
                  {growthEntries.length > 0 ? (
                    <WhoGrowthAssessment entries={growthEntries} ageMonths={ageMonth} weightKg={w} heightCm={h} />
                  ) : (
                    <p className="text-xs text-neutral-400">Đang tải chuẩn tăng trưởng WHO...</p>
                  )}
                </div>
              ) : (
                <>
                  <p>
                    BMI: <b>{round(bmi!)}</b> — <b>{bmiStatus(bmi!)}</b>
                  </p>
                  {mifflin && (
                    <div className="mt-2 text-xs leading-relaxed text-neutral-500">
                      <div className="font-medium text-neutral-600">
                        🧮 Công thức Mifflin-St Jeor:
                      </div>
                      <div>• BMR = {round(mifflin.bmr)} kcal (chuyển hóa cơ bản)</div>
                      <div>
                        • × {mifflin.activityFactor} ({mifflin.activityLabel}) ={" "}
                        {round(mifflin.bmr * mifflin.activityFactor)} kcal
                      </div>
                      {mifflin.physBonus > 0 && (
                        <div>
                          • + {mifflin.physBonus} kcal ({mifflin.physLabel})
                        </div>
                      )}
                      <div className="mt-1 font-medium text-neutral-700">
                        → Tổng: {mifflin.tdee} kcal/ngày
                      </div>
                      <p className="mt-2 border-l-2 border-[#a77b10] bg-[#fff8df] px-2 py-1 text-neutral-900">Đây là ước tính cá nhân. Ở phần Kết quả, đối chiếu khuyến nghị chính thức ưu tiên bảng <i>Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam</i> của Viện Dinh dưỡng.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      {children}
    </div>
  );
}
