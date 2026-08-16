export type DietOrderWindow = {
  status: string;
  effectiveDate: Date;
  endDate: Date | null;
  dietTypeId: string;
  departmentId: string;
};

export function canPrescribeDietOrder(role: string) {
  return role === "CLINICIAN";
}
export function canSubmitMealOrder(role: string) {
  return ["ADMIN", "DIETITIAN", "KITCHEN_MANAGER", "DEPARTMENT_STAFF"].includes(
    role,
  );
}
export function canReviewPublicMealNote(role: string) {
  return ["ADMIN", "DEPARTMENT_STAFF"].includes(role);
}
export function canRequestMealOrderChange(role: string) {
  return ["ADMIN", "DEPARTMENT_STAFF"].includes(role);
}

export function dietOrderEffectiveOn(order: DietOrderWindow, date: Date) {
  return (
    order.status === "ACTIVE" &&
    order.effectiveDate <= date &&
    (!order.endDate || order.endDate >= date)
  );
}

export function dietOrderWindowsOverlap(
  a: { effectiveDate: Date; endDate: Date | null },
  b: { effectiveDate: Date; endDate: Date | null },
) {
  const aEnd = a.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const bEnd = b.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
  return a.effectiveDate.getTime() <= bEnd && b.effectiveDate.getTime() <= aEnd;
}

export function dietOrderSuggestions(orders: DietOrderWindow[], date: Date) {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    if (!dietOrderEffectiveOn(order, date)) continue;
    const key = `${order.departmentId}:${order.dietTypeId}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
