"use client";
import { useRef, useState } from "react";
import { MENU_IMAGE_MAX_BYTES, type MealIllustration as Illustration } from "@/lib/menu-library/illustration";
import MealIllustration from "./MealIllustration";
import styles from "./illustration.module.css";

export default function MealIllustrationEditor({ image, label, csrf, disabled, onChange, onUploading }: {
  image?: Illustration | null; label: string; csrf: string; disabled: boolean;
  onChange: (image: Illustration | null) => void; onUploading: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [sourceKind, setSourceKind] = useState<Illustration["sourceKind"]>(image?.sourceKind ?? "ai");
  const [alt, setAlt] = useState(image?.alt ?? label.slice(0, 300));
  const [over, setOver] = useState(false), input = useRef<HTMLInputElement>(null);
  // Preserve the key after an uncertain network result, so retry cannot duplicate the asset.
  const attempt = useRef<{ file: File; alt: string; sourceKind: string; key: string } | null>(null);
  async function upload(file: File) {
    if (busy || disabled) return;
    setError(""); setCanRetry(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > MENU_IMAGE_MAX_BYTES) { setError("Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB."); return; }
    const caption = alt.trim();
    if (!caption) { setError("Nhập mô tả ảnh trước khi tải lên."); return; }
    if (!attempt.current || attempt.current.file !== file || attempt.current.alt !== caption || attempt.current.sourceKind !== sourceKind) attempt.current = { file, alt: caption, sourceKind, key: `image-${crypto.randomUUID()}` };
    setBusy(true); onUploading(true);
    try {
      const body = new FormData();
      body.set("file", file); body.set("alt", caption); body.set("sourceKind", sourceKind); body.set("requestKey", attempt.current.key);
      const response = await fetch("/api/admin/menu-library/images", { method: "POST", headers: { "x-menu-library-csrf": csrf }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Chưa tải được ảnh.");
      onChange(result.illustration); attempt.current = null;
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa tải được ảnh. Ảnh cũ vẫn được giữ."); setCanRetry(true); }
    finally { setBusy(false); onUploading(false); }
  }
  return <section className={styles.editor} aria-label={`Ảnh minh hoạ ${label}`}>
    <MealIllustration image={image} />
    <div className={styles.fields}>
      <label>Mô tả ảnh<input aria-label={`Mô tả ảnh ${label}`} value={alt} required={!!image} maxLength={300} disabled={disabled || busy} onChange={event => { setAlt(event.target.value); if (image) onChange({ ...image, alt: event.target.value }); }} /></label>
      <label>Nguồn ảnh tải lên<select aria-label={`Nguồn ảnh ${label}`} value={sourceKind} disabled={disabled || busy} onChange={event => setSourceKind(event.target.value as Illustration["sourceKind"])}><option value="ai">Ảnh do AI tạo</option><option value="manual">Ảnh cung cấp thủ công</option></select></label>
    </div>
    <div className={`${styles.drop} ${over ? styles.over : ""}`} onDragOver={event => { event.preventDefault(); if (!disabled && !busy) setOver(true); }} onDragLeave={() => setOver(false)} onDrop={event => { event.preventDefault(); setOver(false); if (event.dataTransfer.files.length === 1) void upload(event.dataTransfer.files[0]); else setError("Mỗi bữa chọn một ảnh minh hoạ."); }}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} aria-label={`Chọn ảnh ${label}`} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()}>{busy ? "Đang tải ảnh…" : image ? "Thay ảnh" : "+ Tải ảnh minh hoạ"}</button><span>hoặc kéo một ảnh vào đây · JPG / PNG / WebP · tối đa 5 MB</span>
    </div>
    {!!image && <button type="button" className={styles.remove} disabled={disabled || busy} onClick={() => onChange(null)}>Bỏ ảnh khỏi bữa này</button>}
    <p className={styles.hint}>Ảnh minh hoạ có liên kết công khai. Chọn ảnh món ăn, không chứa thông tin người bệnh. Bấm Lưu thay đổi để gắn ảnh vào thực đơn.</p>
    {error && <p role="alert" className={styles.error}>{error} {canRetry && <button type="button" disabled={disabled || busy} onClick={() => { if (attempt.current) void upload(attempt.current.file); }}>Thử tải lại</button>}</p>}
    {busy && <p role="status">Đang xử lý và lưu ảnh…</p>}
  </section>;
}
