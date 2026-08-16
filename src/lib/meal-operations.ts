import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { dietOrderSuggestions } from "@/lib/diet-orders";
import { buildKitchenShoppingList } from "@/lib/kitchen-menu-snapshot";
import { dietOrdersEnabled } from "@/lib/feature-flags";
import { mealPhotoPublicUrl } from "@/lib/meal-photo";

export const OPS_ROLES = [
  "ADMIN",
  "CLINICIAN",
  "DIETITIAN",
  "KITCHEN_MANAGER",
  "KITCHEN_STAFF",
  "DEPARTMENT_STAFF",
] as const;
const MANAGER_ROLES = new Set(["ADMIN", "DIETITIAN", "KITCHEN_MANAGER"]);

export function localDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Ngày không hợp lệ.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Ngày không hợp lệ.");
  return date;
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function cutoffAt(
  mealDate: Date,
  cutoffLocalTime: string,
  daysBefore: number,
) {
  const [hour, minute] = cutoffLocalTime.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute))
    throw new Error("Giờ chốt chưa được cấu hình đúng.");
  return new Date(
    Date.UTC(
      mealDate.getUTCFullYear(),
      mealDate.getUTCMonth(),
      mealDate.getUTCDate() - daysBefore,
      hour - 7,
      minute,
    ),
  );
}

export async function operationsContext(user: SessionUser, date: Date) {
  const enableDietOrders = dietOrdersEnabled();
  const manager = MANAGER_ROLES.has(user.role);
  const kitchenViewer = manager || user.role === "KITCHEN_STAFF";
  const memberships = await prisma.departmentMembership.findMany({
    where: { userId: user.id, status: "ACTIVE", canSubmit: true },
    include: { department: true },
    orderBy: { department: { sortOrder: "asc" } },
  });
  const departmentIds = memberships.map((item) => item.departmentId);
  const [
    departments,
    mealTypes,
    dietTypes,
    orders,
    menus,
    shifts,
    users,
    publicNotes,
    dietOrders,
  ] = await Promise.all([
    manager
      ? prisma.department.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : Promise.resolve(memberships.map((item) => item.department)),
    prisma.mealType.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.kitchenDietType.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.mealOrder.findMany({
      where: {
        mealDate: date,
        ...(kitchenViewer ? {} : { departmentId: { in: departmentIds } }),
      },
      include: {
        department: true,
        mealType: true,
        submittedBy: { select: { displayName: true } },
        items: { include: { dietType: true } },
        changeRequests: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
        },
        audits: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    kitchenViewer
      ? prisma.kitchenMenu.findMany({
          where: { mealDate: date },
          include: {
            mealType: true,
            approvedBy: { select: { displayName: true } },
            items: {
              where: { approvedAt: { not: null } },
              include: { dietType: true, approvedBy: { select: { displayName: true } } },
              orderBy: { sortOrder: "asc" },
            },
          },
        })
      : Promise.resolve([]),
    prisma.kitchenShift.findMany({
      where: {
        shiftDate: date,
        ...(manager
          ? {}
          : user.role === "KITCHEN_STAFF"
            ? { members: { some: { userId: user.id, status: "ASSIGNED" } } }
            : { id: "__none__" }),
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, role: true } },
          },
        },
        tasks: {
          include: { assignedTo: { select: { id: true, displayName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    manager
      ? prisma.user.findMany({
          select: { id: true, displayName: true, email: true, role: true },
          orderBy: { displayName: "asc" },
        })
      : Promise.resolve([]),
    prisma.publicMealReport.findMany({
      where: {
        mealDate: date,
        ...(manager
          ? {}
          : user.role === "KITCHEN_STAFF"
            ? { status: "APPROVED" }
            : { departmentId: { in: departmentIds } }),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    enableDietOrders ? prisma.dietOrder.findMany({
      where: {
        ...(manager ? {} : { departmentId: { in: departmentIds } }),
        status: "ACTIVE",
        ...(user.role === "CLINICIAN"
          ? {}
          : {
              effectiveDate: { lte: date },
              OR: [{ endDate: null }, { endDate: { gte: date } }],
            }),
      },
      include: {
        department: { select: { id: true, name: true } },
        dietType: { select: { id: true, name: true } },
        prescribedBy: { select: { id: true, displayName: true } },
      },
      orderBy: [{ critical: "desc" }, { createdAt: "desc" }],
      take: 500,
    }) : Promise.resolve([]),
  ]);
  const quantities = orders.flatMap((order) => order.items.map((item) => ({ mealTypeId: order.mealTypeId, dietTypeId: item.dietTypeId, quantity: item.quantity })));
  const menuByMeal = new Map(menus.map((menu) => [menu.mealTypeId, menu]));
  const shoppingLists = kitchenViewer ? mealTypes.map((mealType) => {
    const menu = menuByMeal.get(mealType.id);
    return { mealType, ...buildKitchenShoppingList(menu?.id ?? ("missing-" + mealType.id), mealType.id, menu?.items ?? [], quantities) };
  }) : [];
  const menusWithPhotos = menus.map((menu) => ({
    ...menu,
    items: menu.items.map((item) => ({
      ...item,
      photoUrl: mealPhotoPublicUrl(item.photoStoragePath),
    })),
  }));
  return {
    user,
    manager,
    departments,
    memberships,
    mealTypes,
    dietTypes,
    orders,
    menus: menusWithPhotos,
    shoppingLists,
    shifts,
    users,
    publicNotes,
    dietOrdersEnabled: enableDietOrders,
    dietOrders,
    dietOrderSuggestions: dietOrderSuggestions(dietOrders, date),
  };
}

export async function requireDepartment(
  user: SessionUser,
  departmentId: string,
) {
  if (MANAGER_ROLES.has(user.role)) return;
  const membership = await prisma.departmentMembership.findUnique({
    where: { userId_departmentId: { userId: user.id, departmentId } },
  });
  if (!membership || membership.status !== "ACTIVE" || !membership.canSubmit)
    throw new Error("Bạn không được báo suất cho khoa này.");
}

export function requireManager(
  user: SessionUser,
  roles: string[] = ["ADMIN", "DIETITIAN", "KITCHEN_MANAGER"],
) {
  if (!roles.includes(user.role))
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
}

export function cleanText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function cleanQuantity(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10000)
    throw new Error("Số suất phải là số nguyên không âm.");
  return n;
}

export async function audit(input: {
  orderId?: string;
  entityType: string;
  entityId: string;
  action: string;
  user: SessionUser;
  before?: unknown;
  after?: unknown;
  reason?: string;
}) {
  await prisma.mealOperationAudit.create({
    data: {
      mealOrderId: input.orderId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.user.id,
      actorName: input.user.displayName,
      beforeJson: input.before as never,
      afterJson: input.after as never,
      reason: cleanText(input.reason, 300) || input.action,
    },
  });
}

export function publicCode(date: Date) {
  return `MA-${dateKey(date).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
