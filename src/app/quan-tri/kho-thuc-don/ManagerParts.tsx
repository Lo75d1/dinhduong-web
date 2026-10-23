"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import Icon from "@/components/ui/Icon";
import { energyLabel, mealCountLabel, menuTags, type CatalogMenu, type MealSelection, type MealTarget } from "@/lib/menu-library/manager-contracts";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";
import { ingredientQuantity } from "@/lib/menu-library/production";
import styles from "./manager.module.css";
export function ManagerDialog({
  title,
  children,
  onClose,
  busy = false,
  wide = false
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`${styles.dialog} ${wide ? styles.wideDialog : ""}`} onCancel={event => {
    event.preventDefault();
    if (!busy) onClose();
  }} aria-label={title}>
    <header className={styles.dialogHeading}><h2>{title}</h2><button type="button" aria-label="Đóng" disabled={busy} onClick={onClose}><Icon name="x" /></button></header>{children}
  </dialog>;
}
export function SectionButton({
  value,
  hospitalUse,
  label,
  selected,
  onSelect,
  disabled
}: {
  value: string;
  hospitalUse?: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: `section:${value}:${hospitalUse ?? ""}`,
    data: {
      kind: "section",
      section: value,
      hospitalUse: hospitalUse ?? null
    },
    disabled
  });
  return <button ref={setNodeRef} type="button" className={isOver ? styles.dropOver : undefined} aria-pressed={selected} disabled={disabled} onClick={onSelect}>{label}</button>;
}
export function MenuCard({
  item,
  checked,
  opened,
  onSelect,
  onOpen,
  onTrash,
  busy
}: {
  item: CatalogMenu;
  checked: boolean;
  opened: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onTrash: () => void;
  busy: boolean;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    isDragging
  } = useDraggable({
    id: `template:${item.id}`,
    data: {
      kind: "template",
      item
    },
    disabled: busy || item.availability === "archived"
  });
  return <li ref={setNodeRef} className={`${styles.menuCard} ${opened ? styles.openCard : ""} ${checked ? styles.checkedCard : ""}`} data-template-id={item.id} style={{
    opacity: isDragging ? .45 : 1
  }}>
    <div className={styles.cardTop}><label className={styles.checkLabel}><input type="checkbox" checked={checked} onChange={onSelect} disabled={busy} aria-label={`Chọn thực đơn ${item.title}`} /><span>{item.days.length} ngày</span></label><span className={styles.reviewState}>{item.reviewState === "approved" ? "Đã duyệt" : item.reviewState === "changes_requested" ? "Cần sửa" : "Nháp"}</span><button ref={setActivatorNodeRef} {...listeners} {...attributes} type="button" className={styles.dragHandle} aria-label={`Kéo thực đơn ${item.title} sang kho khác`} disabled={busy || item.availability === "archived"}><Icon name="menu" /></button></div>
    <button type="button" className={styles.cardTitle} onClick={onOpen}>{item.title}</button>
    <p className={styles.cardDescription}>{item.description || "Chưa có mô tả. Mở chỉnh sửa để bổ sung."}</p>
    <dl className={styles.cardFacts}><div><dt>Năng lượng mục tiêu</dt><dd>{energyLabel(item.groups)}</dd></div><div><dt>Số bữa đã khai báo</dt><dd>{mealCountLabel(item.days)}</dd></div><div className={styles.audienceFact}><dt>Dành cho</dt><dd>{item.groups.map(group => group.label).join(" / ") || "Chưa nhập đối tượng"}</dd></div></dl>
    {!!menuTags(item).length && <div className={styles.tags}>{menuTags(item).map(tag => <span key={tag}>#{tag}</span>)}</div>}
    <div className={styles.cardActions}><button type="button" onClick={onOpen}>Xem nhanh <Icon name="chevron-right" /></button><button type="button" onClick={onTrash} disabled={busy} className={styles.deleteButton}><Icon name={item.availability === "archived" ? "refresh-cw" : "trash-2"} />{item.availability === "archived" ? "Khôi phục" : "Xóa"}</button></div>
  </li>;
}
export function DayTarget({
  target,
  dayIndex,
  mealCount,
  selected,
  onSelect,
  disabled
}: {
  target: MealTarget;
  dayIndex: number;
  mealCount: number;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: `day:${target.id}:${target.dayId}:${target.groupId}`,
    data: {
      kind: "day",
      target
    },
    disabled
  });
  return <button type="button" ref={setNodeRef} onClick={onSelect} aria-pressed={selected} className={`${styles.dayTarget} ${isOver ? styles.dropOver : ""}`}><strong>Ngày {dayIndex}</strong><span>{mealCount} bữa</span></button>;
}
export function SelectedMealTray({
  items,
  onRemove,
  onClear,
  onPaste,
  onDelete,
  busy
}: {
  items: MealSelection[];
  onRemove: (item: MealSelection) => void;
  onClear: () => void;
  onPaste: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners
  } = useDraggable({
    id: "meal-tray",
    data: {
      kind: "tray"
    },
    disabled: busy || !items.length
  });
  if (!items.length) return null;
  return <section ref={setNodeRef} className={styles.mealTray} aria-label="Bữa đã chọn"><div className={styles.trayHeading}><button ref={setActivatorNodeRef} {...attributes} {...listeners} className={styles.dragHandle} aria-label={`Kéo ${items.length} bữa đã chọn`} type="button"><Icon name="menu" /></button><strong>{items.length} bữa đã chọn</strong><button type="button" onClick={onClear} disabled={busy}>Bỏ chọn</button></div><ul>{items.map(item => <li key={`${item.id}:${item.dayId}:${item.mealId}:${item.groupId}`}><span><strong>{item.label}</strong><small>{item.title} · Ngày {item.dayIndex}</small></span><button type="button" aria-label={`Bỏ chọn ${item.label}, ${item.title}, ngày ${item.dayIndex}`} onClick={() => onRemove(item)} disabled={busy}><Icon name="x" /></button></li>)}</ul><div className={styles.trayActions}><button className={styles.primary} type="button" onClick={onPaste} disabled={busy}>Sao chép / chuyển bữa</button><button className={styles.deleteButton} type="button" onClick={onDelete} disabled={busy}><Icon name="trash-2" />Xóa bữa</button></div></section>;
}
export function MealBlock({
  meal,
  selection,
  checked,
  onSelect,
  foods,
  disabled
}: {
  meal: MenuLibraryDraft["days"][number]["meals"][number];
  selection: MealSelection;
  checked: boolean;
  onSelect: () => void;
  foods: {
    id: string;
    name: string;
  }[];
  disabled: boolean;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    isDragging,
    isOver
  } = useSortable({
    id: `meal:${selection.id}:${selection.dayId}:${meal.id}:${selection.groupId}`,
    data: {
      kind: "meal",
      selection
    },
    disabled
  });
  const portion = meal.groupPortions.find(p => p.groupId === selection.groupId);
  return <section ref={setNodeRef} className={`${styles.mealBlock} ${checked ? styles.selectedMeal : ""} ${isOver ? styles.dropOver : ""}`} style={{
    opacity: isDragging ? .4 : 1
  }}>
    <header><label className={styles.checkLabel}><input type="checkbox" checked={checked} onChange={onSelect} disabled={disabled} aria-label={`Chọn ${meal.label}, ${selection.title}, ngày ${selection.dayIndex}`} /><strong>{meal.label}</strong></label><button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button" className={styles.dragHandle} aria-label={`Kéo ${meal.label} để sắp xếp hoặc sao chép`} disabled={disabled}><Icon name="menu" /></button></header>
    <ul className={styles.dishList}>{portion?.dishes.length ? portion.dishes.map(dish => <li key={dish.id}>{dish.label}</li>) : <li className={styles.muted}>Chưa có món cho nhóm này</li>}</ul>
    <details className={styles.ingredients}><summary>Xem nguyên liệu &amp; cách nấu</summary>{portion?.dishes.map(dish => <div key={dish.id}><h4>{dish.label}</h4><ul>{dish.ingredients.map((ingredient, index) => <li key={index}><span>{foods.find(food => food.id === ingredient.foodId)?.name ?? "Chưa đọc được tên thực phẩm"}</span><b>{ingredientQuantity(ingredient.quantityPerPortion)} {ingredient.unit}</b></li>)}</ul>{!!dish.preparation?.steps.length && <ol>{dish.preparation.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>}{dish.preparation?.notes.map((note, index) => <p key={index}>{note}</p>)}</div>)}</details>
  </section>;
}
