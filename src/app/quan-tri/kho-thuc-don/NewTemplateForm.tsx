"use client";

import { useState } from "react";
import { HOSPITAL_USES, LIBRARY_SECTIONS, MEAL_OPTIONS, parseTags } from "@/lib/menu-library/manager-contracts";
import type { MenuLibraryDraft, MealCode } from "@/lib/menu-library/contracts";
import { tidyInstructions } from "@/lib/menu-library/content-policy";
import styles from "./manager.module.css";
export default function NewTemplateForm({
  csrf,
  section,
  hospitalUse,
  onCreated,
  onCancel,
  onSaving
}: {
  csrf: string;
  section: string;
  hospitalUse: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
  onSaving?: (saving: boolean) => void;
}) {
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [tags, setTags] = useState(""),
    [audience, setAudience] = useState(""),
    [energy, setEnergy] = useState("");
  const [shelf, setShelf] = useState(section || "individual"),
    [use, setUse] = useState(hospitalUse || "patient_guidance"),
    [days, setDays] = useState(1),
    [meals, setMeals] = useState<MealCode[]>(["breakfast", "lunch", "dinner"]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [id] = useState(() => `manual-${crypto.randomUUID()}`);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!meals.length) {
      setError("Chọn ít nhất một bữa để bắt đầu.");
      return;
    }
    setBusy(true);
    onSaving?.(true);
    setError("");
    const individual = shelf === "individual" || shelf === "hospital" && use === "patient_guidance";
    if (!Number.isSafeInteger(days) || days < 1 || days > 31) {
      setError("Số ngày từ 1 đến 31.");
      setBusy(false);
      onSaving?.(false);
      return;
    }
    const draft: MenuLibraryDraft = {
      schemaVersion: "1.2.0",
      id,
      version: 1,
      status: "draft",
      title: title.trim(),
      description: description.trim() || null,
      tags: parseTags(tags),
      direction: individual ? "individual" : "collective",
      librarySection: shelf as MenuLibraryDraft["librarySection"],
      hospitalUse: shelf === "hospital" ? use as MenuLibraryDraft["hospitalUse"] : null,
      unit: individual ? null : {
        id: "unit-pending",
        label: "Chưa đặt tên đơn vị",
        type: shelf === "hospital" ? "hospital" : "other"
      },
      coverage: individual ? "full_day" : "served_meals",
      eatingContext: null,
      derivedFrom: null,
      groups: [{
        id: "group-1",
        label: audience.trim(),
        schoolLevel: null,
        ageYears: null,
        gender: "unspecified",
        activity: null,
        goal: null,
        dietCode: null,
        dailyReferences: [],
        designEnergyKcal: energy ? Number(energy) : null
      }],
      days: Array.from({
        length: days
      }, (_, index) => ({
        id: `day-${index + 1}`,
        dayIndex: index + 1,
        date: null,
        meals: MEAL_OPTIONS.filter(option => meals.includes(option.value)).map(option => ({
          id: `day-${index + 1}-${option.value}`,
          code: option.value,
          label: option.label,
          groupPortions: [{
            groupId: "group-1",
            headcount: null,
            mealRuleIds: [],
            dishes: []
          }]
        }))
      }))
    };
    try {
      const response = await fetch("/api/admin/menu-library/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-menu-library-csrf": csrf
        },
        body: JSON.stringify({
          content: tidyInstructions(draft),
          requestKey: id,
          reason: "Admin tạo thực đơn trực tiếp trên website."
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Chưa tạo được thực đơn.");
      onCreated(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa tạo được thực đơn.");
    } finally {
      setBusy(false);
      onSaving?.(false);
    }
  }
  return <form onSubmit={create} className={styles.form}><fieldset disabled={busy}><div className={styles.formGrid}><label className={styles.fullField}>Tên thực đơn<input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} autoFocus /></label><label>Kho<select value={shelf} onChange={event => setShelf(event.target.value)}>{LIBRARY_SECTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{shelf === "hospital" && <label>Mục bệnh viện<select value={use} onChange={event => setUse(event.target.value)}>{HOSPITAL_USES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}<label>Năng lượng mục tiêu (kcal/ngày)<input type="number" min="1" max="20000" step="1" value={energy} onChange={event => setEnergy(event.target.value)} placeholder="Có thể bổ sung sau" /></label><label className={styles.fullField}>Dành cho đối tượng<input required maxLength={200} value={audience} onChange={event => setAudience(event.target.value)} placeholder="Ví dụ: người lớn, trẻ 6–8 tháng…" /></label><label className={styles.fullField}>Mô tả chung<textarea maxLength={1000} rows={2} value={description} onChange={event => setDescription(event.target.value)} /></label><label>Số ngày<input type="number" required min="1" max="31" step="1" value={days} onChange={event => setDays(Number(event.target.value))} /></label><label>Hashtag<input value={tags} onChange={event => setTags(event.target.value)} maxLength={1000} placeholder="Ăn dặm, Cơm mềm…" /></label></div><fieldset className={styles.mealOptions}><legend>Các bữa cần nhập</legend>{MEAL_OPTIONS.map(option => <label key={option.value}><input type="checkbox" checked={meals.includes(option.value)} onChange={() => setMeals(previous => previous.includes(option.value) ? previous.filter(meal => meal !== option.value) : [...previous, option.value])} />{option.label}</label>)}</fieldset>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.dialogActions}><button type="button" onClick={onCancel} disabled={busy}>Hủy</button><button className={styles.primary} disabled={busy}>{busy ? "Đang tạo…" : "Tạo & nhập món"}</button></div></fieldset></form>;
}
