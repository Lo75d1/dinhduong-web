"use client";

// Biểu đồ phân tích khẩu phần — dùng cho trang Tính khẩu phần.
// Palette categorical đã validate CVD-safe (blue/aqua/yellow), nhãn/bảng đi kèm
// theo relief-rule (contrast dưới 3:1). Ink dùng token trung tính, không dùng màu series.

type Item = {
  food: { id: string; name: string; energyKcal?: number | null | string };
  grams: number;
};

const SERIES = {
  protein: "#2a78d6", // blue  (slot 1)
  lipid: "#1baf7a", // aqua  (slot 2)
  glucid: "#eda100", // yellow (slot 3)
};

// Khuyến nghị người trưởng thành (Việt Nam / WHO): % năng lượng từ mỗi chất sinh năng lượng
const RECOMMENDED = {
  protein: { min: 13, max: 20, label: "13–20%" },
  lipid: { min: 20, max: 30, label: "20–30%" },
  glucid: { min: 55, max: 65, label: "55–65%" },
};

function round(n: number, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

export default function RationCharts({
  items,
  totalProtein,
  totalLipid,
  totalGlucid,
}: {
  items: Item[];
  totalProtein: number;
  totalLipid: number;
  totalGlucid: number;
}) {
  // Năng lượng từ mỗi chất sinh năng lượng (Atwater: đạm 4, béo 9, bột đường 4)
  const kcalP = totalProtein * 4;
  const kcalL = totalLipid * 9;
  const kcalG = totalGlucid * 4;
  const macroKcal = kcalP + kcalL + kcalG;

  if (macroKcal <= 0) return null;

  const pctP = (kcalP / macroKcal) * 100;
  const pctL = (kcalL / macroKcal) * 100;
  const pctG = (kcalG / macroKcal) * 100;

  const macroRows = [
    { key: "protein", name: "Chất đạm", grams: totalProtein, kcal: kcalP, pct: pctP, color: SERIES.protein, rec: RECOMMENDED.protein },
    { key: "lipid", name: "Chất béo", grams: totalLipid, kcal: kcalL, pct: pctL, color: SERIES.lipid, rec: RECOMMENDED.lipid },
    { key: "glucid", name: "Bột đường", grams: totalGlucid, kcal: kcalG, pct: pctG, color: SERIES.glucid, rec: RECOMMENDED.glucid },
  ];

  // Đóng góp năng lượng theo thực phẩm (magnitude → thanh ngang 1 sắc)
  const contrib = items
    .map((it) => ({
      id: it.food.id,
      name: it.food.name,
      kcal: typeof it.food.energyKcal === "number" ? (it.food.energyKcal * it.grams) / 100 : 0,
    }))
    .filter((c) => c.kcal > 0)
    .sort((a, b) => b.kcal - a.kcal);

  const totalContribKcal = contrib.reduce((s, c) => s + c.kcal, 0);
  const TOP = 8;
  let contribRows = contrib.slice(0, TOP);
  const rest = contrib.slice(TOP);
  if (rest.length > 0) {
    const restKcal = rest.reduce((s, c) => s + c.kcal, 0);
    contribRows = [...contribRows, { id: "__khac__", name: `Khác (${rest.length} món)`, kcal: restKcal }];
  }
  const maxKcal = Math.max(...contribRows.map((c) => c.kcal), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Biểu đồ 1: tỷ lệ năng lượng P:L:G ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">
          Cân đối năng lượng (Đạm : Béo : Bột đường)
        </h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Theo % năng lượng, quy đổi Atwater (đạm 4, béo 9, bột đường 4 kcal/g).
        </p>

        {/* thanh 100% xếp chồng — gap 2px giữa các đoạn, bo góc 2 đầu */}
        <div className="mt-3 flex h-6 w-full gap-[2px] overflow-hidden rounded-md">
          {macroRows.map((r) => (
            <div
              key={r.key}
              style={{ width: `${r.pct}%`, backgroundColor: r.color }}
              title={`${r.name}: ${round(r.pct)}%`}
              className="h-full first:rounded-l-md last:rounded-r-md"
            />
          ))}
        </div>

        {/* bảng: swatch + tên + gram + kcal + % + khuyến nghị + trạng thái */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-400">
              <tr>
                <th className="py-1 font-medium">Chất</th>
                <th className="py-1 text-right font-medium">Khối lượng</th>
                <th className="py-1 text-right font-medium">Năng lượng</th>
                <th className="py-1 text-right font-medium">Tỷ lệ</th>
                <th className="py-1 text-right font-medium">Khuyến nghị</th>
                <th className="py-1 text-right font-medium">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {macroRows.map((r) => {
                const inRange = r.pct >= r.rec.min && r.pct <= r.rec.max;
                return (
                  <tr key={r.key} className="border-t border-neutral-100">
                    <td className="py-1.5">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-600">{round(r.grams)} g</td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-600">{round(r.kcal)} kcal</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{round(r.pct)}%</td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-400">{r.rec.label}</td>
                    <td className="py-1.5 text-right">
                      {inRange ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          ● Cân đối
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          ▲ {r.pct < r.rec.min ? "Thấp" : "Cao"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Biểu đồ 2: đóng góp năng lượng theo thực phẩm ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Đóng góp năng lượng theo thực phẩm</h2>
        <p className="mt-0.5 text-xs text-neutral-400">Tổng {round(totalContribKcal)} kcal.</p>

        <div className="mt-3 flex flex-col gap-2">
          {contribRows.map((c) => {
            const pct = totalContribKcal > 0 ? (c.kcal / totalContribKcal) * 100 : 0;
            const barW = (c.kcal / maxKcal) * 100;
            return (
              <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xs text-neutral-600" title={c.name}>
                    {c.name}
                  </div>
                  <div className="mt-1 h-2.5 w-full rounded-sm bg-neutral-100">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${barW}%`, backgroundColor: SERIES.protein }}
                      title={`${round(c.kcal)} kcal`}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs tabular-nums text-neutral-500">
                  {round(c.kcal)} kcal · {round(pct)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
