"use client";

import { ALL_NUTRIENT_FIELDS, NUTRIENT_GROUPS } from "@/lib/nutrient-fields";

export const DETAIL_NUTRIENT_KEYS = ALL_NUTRIENT_FIELDS.filter(field => field.key !== "energyKcal").map(field => field.key);
const BASIC_KEYS = ["proteinG", "lipidG", "glucidG", "fiberG"];

export default function NutrientFieldPicker({ selectedKeys, onChange }: { selectedKeys: string[]; onChange: (keys: string[]) => void }) {
  return <div className="flex flex-wrap items-start gap-2" data-nutrient-field-picker>
    <button type="button" onClick={() => onChange([...DETAIL_NUTRIENT_KEYS])} className="rounded-md border border-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-[var(--brand)]">Hiện toàn bộ {ALL_NUTRIENT_FIELDS.length} chỉ tiêu</button>
    <button type="button" onClick={() => onChange([...BASIC_KEYS])} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700">Rút gọn 5 chỉ tiêu</button>
    <details className="rounded-md border border-neutral-300 bg-white text-sm">
      <summary className="cursor-pointer px-3 py-1.5 font-medium text-neutral-700">Chọn chất ({selectedKeys.length + 1}/{ALL_NUTRIENT_FIELDS.length})</summary>
      <div className="max-h-80 w-72 max-w-full overflow-auto border-t border-neutral-200 p-3">
        {NUTRIENT_GROUPS.map(group => <fieldset key={group.title} className="mb-3">
          <legend className="mb-1 text-xs font-semibold text-neutral-600">{group.title}</legend>
          {group.fields.filter(field => field.key !== "energyKcal").map(field => <label key={field.key} className="flex items-center gap-2 text-xs text-neutral-700">
            <input type="checkbox" checked={selectedKeys.includes(field.key)} onChange={() => onChange(selectedKeys.includes(field.key) ? selectedKeys.filter(key => key !== field.key) : [...selectedKeys, field.key])} />
            {field.label} ({field.unit})
          </label>)}
        </fieldset>)}
      </div>
    </details>
  </div>;
}
