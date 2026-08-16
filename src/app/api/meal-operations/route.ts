import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  audit,
  cleanQuantity,
  cleanText,
  cutoffAt,
  localDate,
  operationsContext,
  publicCode,
  requireDepartment,
  requireManager,
} from "@/lib/meal-operations";
import {
  canPrescribeDietOrder,
  canReviewPublicMealNote,
  canRequestMealOrderChange,
  canSubmitMealOrder,
  dietOrderSuggestions,
  dietOrderWindowsOverlap,
} from "@/lib/diet-orders";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const date = localDate(
      new URL(request.url).searchParams.get("date") ??
        new Date().toISOString().slice(0, 10),
    );
    return Response.json(await operationsContext(user, date));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tải được dữ liệu vận hành bếp.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return Response.json(
        { error: "Nguồn gửi yêu cầu không hợp lệ." },
        { status: 403 },
      );
    const user = await requireSessionUser();
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = cleanText(body?.action, 50);
    if (!body || !action)
      return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

    if (action === "createDietOrder") {
      if (!canPrescribeDietOrder(user.role))
        throw new Error("Chỉ bác sĩ được tạo chỉ định chế độ ăn.");
      const patientCode = cleanText(body.patientCode, 80).toUpperCase();
      const departmentId = cleanText(body.departmentId);
      const dietTypeId = cleanText(body.dietTypeId);
      const effectiveDate = localDate(body.effectiveDate);
      const endDate = body.endDate ? localDate(body.endDate) : null;
      if (!patientCode || !/^[A-Z0-9._/-]+$/.test(patientCode))
        throw new Error("Mã người bệnh chỉ gồm chữ, số và . _ / -.");
      if (endDate && endDate < effectiveDate)
        throw new Error("Ngày kết thúc không được trước ngày hiệu lực.");
      await requireDepartment(user, departmentId);
      const dietType = await prisma.kitchenDietType.findFirst({
        where: { id: dietTypeId, status: "ACTIVE" },
      });
      if (!dietType) throw new Error("Chế độ ăn không hợp lệ.");
      const item = await prisma.$transaction(async (tx) => {
        const overlapping = await tx.dietOrder.findMany({
          where: { patientCode, status: "ACTIVE" },
          select: { id: true, effectiveDate: true, endDate: true },
        });
        if (
          overlapping.some((current) =>
            dietOrderWindowsOverlap(current, { effectiveDate, endDate }),
          )
        )
          throw new Error(
            "Mã người bệnh đang có chỉ định ACTIVE chồng lấn. Hãy kết thúc chỉ định cũ trước.",
          );
        return tx.dietOrder.create({
          data: {
            patientCode,
            departmentId,
            room: cleanText(body.room, 80) || null,
            dietTypeId,
            effectiveDate,
            endDate,
            clinicalNote: cleanText(body.clinicalNote, 500) || null,
            critical: body.critical === true,
            prescribedById: user.id,
          },
          include: {
            department: true,
            dietType: true,
            prescribedBy: { select: { id: true, displayName: true } },
          },
        });
      });
      await audit({
        entityType: "DIET_ORDER",
        entityId: item.id,
        action: "CREATE",
        user,
        after: item,
        reason: "Tạo chỉ định chế độ ăn",
      });
      return Response.json({ item }, { status: 201 });
    }

    if (action === "endDietOrder") {
      if (!canPrescribeDietOrder(user.role))
        throw new Error("Chỉ bác sĩ được kết thúc chỉ định chế độ ăn.");
      const id = cleanText(body.id);
      const endDate = localDate(body.endDate);
      const before = await prisma.dietOrder.findUnique({ where: { id } });
      if (!before || before.status !== "ACTIVE")
        throw new Error("Chỉ định không còn hoạt động.");
      await requireDepartment(user, before.departmentId);
      if (endDate < before.effectiveDate)
        throw new Error("Ngày kết thúc không được trước ngày hiệu lực.");
      const item = await prisma.dietOrder.update({
        where: { id },
        data: { status: "ENDED", endDate },
      });
      await audit({
        entityType: "DIET_ORDER",
        entityId: id,
        action: "END",
        user,
        before,
        after: item,
        reason: cleanText(body.reason, 300) || "Kết thúc chỉ định chế độ ăn",
      });
      return Response.json({ item });
    }

    if (action === "configure") {
      requireManager(user, ["ADMIN"]);
      const kind = cleanText(body.kind);
      const name = cleanText(body.name);
      const code = cleanText(body.code).toUpperCase();
      if (kind === "department") {
        if (!name || !code) throw new Error("Cần mã và tên khoa.");
        return Response.json({
          item: await prisma.department.upsert({
            where: { code },
            update: { name },
            create: {
              code,
              name,
              publicToken: crypto.randomUUID().replaceAll("-", ""),
            },
          }),
        });
      }
      if (kind === "mealType") {
        if (!name || !code) throw new Error("Cần mã và tên bữa.");
        const cutoffLocalTime = cleanText(body.cutoffLocalTime, 5);
        const serviceLocalTime = cleanText(body.serviceLocalTime, 5);
        if (
          !/^\d{2}:\d{2}$/.test(cutoffLocalTime) ||
          !/^\d{2}:\d{2}$/.test(serviceLocalTime)
        )
          throw new Error("Giờ phải theo HH:mm.");
        return Response.json({
          item: await prisma.mealType.upsert({
            where: { code },
            update: {
              name,
              cutoffLocalTime,
              serviceLocalTime,
              cutoffDaysBefore: Number(body.cutoffDaysBefore) || 0,
            },
            create: {
              code,
              name,
              cutoffLocalTime,
              serviceLocalTime,
              cutoffDaysBefore: Number(body.cutoffDaysBefore) || 0,
            },
          }),
        });
      }
      if (kind === "dietType") {
        if (!name || !code) throw new Error("Cần mã và tên chế độ ăn.");
        return Response.json({
          item: await prisma.kitchenDietType.upsert({
            where: { code },
            update: { name },
            create: { code, name },
          }),
        });
      }
      if (kind === "membership") {
        const userId = cleanText(body.userId);
        const departmentId = cleanText(body.departmentId);
        if (!userId || !departmentId)
          throw new Error("Cần chọn nhân viên và khoa.");
        return Response.json({
          item: await prisma.departmentMembership.upsert({
            where: { userId_departmentId: { userId, departmentId } },
            update: { status: "ACTIVE", canSubmit: true },
            create: { userId, departmentId },
          }),
        });
      }
      throw new Error("Loại cấu hình không hợp lệ.");
    }

    if (action === "submitOrder") {
      if (!canSubmitMealOrder(user.role))
        throw new Error("Vai trò này không được chốt số suất.");
      const departmentId = cleanText(body.departmentId);
      const mealTypeId = cleanText(body.mealTypeId);
      const mealDate = localDate(body.mealDate);
      const requestKey = cleanText(body.requestKey, 80);
      if (!requestKey) throw new Error("Thiếu mã chống gửi trùng.");
      await requireDepartment(user, departmentId);
      const mealType = await prisma.mealType.findUnique({
        where: { id: mealTypeId },
      });
      if (!mealType || mealType.status !== "ACTIVE")
        throw new Error("Bữa ăn không hợp lệ.");
      if (
        new Date() >=
        cutoffAt(mealDate, mealType.cutoffLocalTime, mealType.cutoffDaysBefore)
      )
        throw new Error(
          "Đã qua giờ chốt. Hãy liên hệ bếp trưởng để yêu cầu thay đổi.",
        );
      const rawItems = Array.isArray(body.items) ? body.items : [];
      const items = rawItems
        .map((raw) => {
          const row = raw as Record<string, unknown>;
          return {
            dietTypeId: cleanText(row.dietTypeId),
            quantity: cleanQuantity(row.quantity),
          };
        })
        .filter((row) => row.dietTypeId);
      if (!items.length || items.every((item) => item.quantity === 0))
        throw new Error("Cần nhập ít nhất một suất ăn.");
      const activeDietOrders = await prisma.dietOrder.findMany({
        where: {
          departmentId,
          status: "ACTIVE",
          effectiveDate: { lte: mealDate },
          OR: [{ endDate: null }, { endDate: { gte: mealDate } }],
        },
        select: {
          departmentId: true,
          dietTypeId: true,
          effectiveDate: true,
          endDate: true,
          status: true,
        },
      });
      const suggestions = dietOrderSuggestions(activeDietOrders, mealDate);
      const mismatch = items.some(
        (item) =>
          item.quantity !==
          (suggestions[`${departmentId}:${item.dietTypeId}`] ?? 0),
      );
      if (mismatch && !cleanText(body.note, 500))
        throw new Error(
          "Số suất khác số gợi ý từ chỉ định. Cần ghi chú lý do trước khi xác nhận.",
        );
      const existing = await prisma.mealOrder.findUnique({
        where: {
          departmentId_mealDate_mealTypeId: {
            departmentId,
            mealDate,
            mealTypeId,
          },
        },
        include: { items: true },
      });
      if (existing?.lastRequestKey === requestKey)
        return Response.json({ item: existing, replayed: true });
      if (existing?.status === "LOCKED")
        throw new Error("Phiếu đã được bếp trưởng khóa.");
      const order = await prisma.$transaction(async (tx) => {
        if (existing) {
          await tx.mealOrderItem.deleteMany({
            where: { mealOrderId: existing.id },
          });
          return tx.mealOrder.update({
            where: { id: existing.id },
            data: {
              lastRequestKey: requestKey,
              status: "MODIFIED",
              version: { increment: 1 },
              submittedById: user.id,
              note: cleanText(body.note, 500) || null,
              submittedAt: new Date(),
              items: { create: items },
            },
            include: { items: true },
          });
        }
        return tx.mealOrder.create({
          data: {
            publicCode: publicCode(mealDate),
            lastRequestKey: requestKey,
            departmentId,
            mealDate,
            mealTypeId,
            submittedById: user.id,
            note: cleanText(body.note, 500) || null,
            items: { create: items },
          },
          include: { items: true },
        });
      });
      await audit({
        orderId: order.id,
        entityType: "MEAL_ORDER",
        entityId: order.id,
        action: existing ? "UPDATE" : "CREATE",
        user,
        before: existing,
        after: order,
        reason: cleanText(body.reason, 300) || "Báo suất ăn",
      });
      return Response.json({ item: order }, { status: existing ? 200 : 201 });
    }

    if (action === "lockOrder") {
      requireManager(user, ["ADMIN", "KITCHEN_MANAGER"]);
      const id = cleanText(body.id);
      const before = await prisma.mealOrder.findUnique({ where: { id } });
      if (!before) throw new Error("Không tìm thấy phiếu.");
      const item = await prisma.mealOrder.update({
        where: { id },
        data: {
          status: "LOCKED",
          lockedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await audit({
        orderId: id,
        entityType: "MEAL_ORDER",
        entityId: id,
        action: "LOCK",
        user,
        before,
        after: item,
        reason: cleanText(body.reason, 300) || "Bếp trưởng khóa số suất",
      });
      return Response.json({ item });
    }

    if (action === "requestChange") {
      if (!canRequestMealOrderChange(user.role))
        throw new Error("Vai trò này không được yêu cầu đổi số suất.");
      const orderId = cleanText(body.orderId);
      const order = await prisma.mealOrder.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new Error("Không tìm thấy phiếu.");
      await requireDepartment(user, order.departmentId);
      const reason = cleanText(body.reason, 300);
      if (!reason) throw new Error("Cần ghi lý do thay đổi.");
      const items = (Array.isArray(body.items) ? body.items : [])
        .map((raw) => {
          const row = raw as Record<string, unknown>;
          return {
            dietTypeId: cleanText(row.dietTypeId),
            quantity: cleanQuantity(row.quantity),
          };
        })
        .filter((row) => row.dietTypeId);
      const item = await prisma.mealOrderChangeRequest.create({
        data: {
          mealOrderId: orderId,
          requestedById: user.id,
          reason,
          proposedJson: items,
        },
      });
      await audit({
        orderId,
        entityType: "MEAL_ORDER_CHANGE",
        entityId: item.id,
        action: "REQUEST",
        user,
        after: item,
        reason,
      });
      return Response.json({ item }, { status: 201 });
    }

    if (action === "resolveChange") {
      requireManager(user, ["ADMIN", "KITCHEN_MANAGER"]);
      const id = cleanText(body.id);
      const decision =
        body.decision === "APPROVED"
          ? "APPROVED"
          : body.decision === "REJECTED"
            ? "REJECTED"
            : "";
      if (!decision) throw new Error("Quyết định không hợp lệ.");
      const requestItem = await prisma.mealOrderChangeRequest.findUnique({
        where: { id },
        include: { mealOrder: { include: { items: true } } },
      });
      if (!requestItem || requestItem.status !== "PENDING")
        throw new Error("Yêu cầu không còn chờ xử lý.");
      const proposed = Array.isArray(requestItem.proposedJson)
        ? (requestItem.proposedJson as {
            dietTypeId: string;
            quantity: number;
          }[])
        : [];
      await prisma.$transaction(async (tx) => {
        if (decision === "APPROVED") {
          await tx.mealOrderItem.deleteMany({
            where: { mealOrderId: requestItem.mealOrderId },
          });
          await tx.mealOrder.update({
            where: { id: requestItem.mealOrderId },
            data: { version: { increment: 1 }, items: { create: proposed } },
          });
        }
        await tx.mealOrderChangeRequest.update({
          where: { id },
          data: {
            status: decision,
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewNote: cleanText(body.reviewNote, 300) || null,
          },
        });
      });
      await audit({
        orderId: requestItem.mealOrderId,
        entityType: "MEAL_ORDER_CHANGE",
        entityId: id,
        action: decision,
        user,
        before: requestItem.mealOrder.items,
        after: proposed,
        reason: cleanText(body.reviewNote, 300) || decision,
      });
      return Response.json({ ok: true });
    }

    if (action === "resolvePublicNote") {
      if (!canReviewPublicMealNote(user.role))
        throw new Error("Chỉ điều dưỡng khoa được duyệt ghi chú người bệnh.");
      const id = cleanText(body.id);
      const decision =
        body.decision === "APPROVED"
          ? "APPROVED"
          : body.decision === "REJECTED"
            ? "REJECTED"
            : "";
      if (!decision) throw new Error("Quyết định không hợp lệ.");
      const note = await prisma.publicMealReport.findUnique({ where: { id } });
      if (!note || note.status !== "RECEIVED" || !note.departmentId)
        throw new Error("Ghi chú không còn chờ duyệt.");
      await requireDepartment(user, note.departmentId);
      const item = await prisma.publicMealReport.update({
        where: { id },
        data: {
          status: decision,
          reviewedById: user.id,
          reviewedByName: user.displayName,
          reviewedAt: new Date(),
          reviewNote: cleanText(body.reviewNote, 300) || null,
        },
      });
      await audit({
        entityType: "PUBLIC_MEAL_NOTE",
        entityId: id,
        action: decision,
        user,
        before: note,
        after: item,
        reason: cleanText(body.reviewNote, 300) || decision,
      });
      return Response.json({ item });
    }

    if (action === "saveMenu") {
      requireManager(user, ["ADMIN", "DIETITIAN"]);
      const mealDate = localDate(body.mealDate);
      const mealTypeId = cleanText(body.mealTypeId);
      const requestedRows = (Array.isArray(body.items) ? body.items : [])
        .map((raw, index) => {
          const row = raw as Record<string, unknown>;
          const servingWeightG = Number(row.servingWeightG);
          return {
            dietTypeId: cleanText(row.dietTypeId),
            dishId: cleanText(row.dishId),
            servingWeightG,
            note: cleanText(row.note, 300) || null,
            sortOrder: index,
          };
        })
        .filter((row) => row.dietTypeId && row.dishId);
      if (!requestedRows.length) throw new Error("Thực đơn cần ít nhất một món có cấu trúc.");
      if (requestedRows.some((row) => !Number.isFinite(row.servingWeightG) || row.servingWeightG <= 0 || row.servingWeightG > 5000))
        throw new Error("Khối lượng mỗi suất phải lớn hơn 0 và không quá 5.000 g.");
      const dishes = await prisma.dish.findMany({
        where: { id: { in: requestedRows.map((row) => row.dishId) }, isActive: true },
        select: { id: true, name: true, totalWeightG: true },
      });
      const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
      const rows = requestedRows.map((row) => {
        const dish = dishesById.get(row.dishId);
        if (!dish) throw new Error("Món đã chọn không còn tồn tại hoặc đã ngừng sử dụng.");
        if (!dish.totalWeightG || dish.totalWeightG <= 0)
          throw new Error(`Món “${dish.name}” chưa có tổng khối lượng công thức.`);
        return { ...row, dishName: dish.name };
      });
      const old = await prisma.kitchenMenu.findUnique({
        where: { mealDate_mealTypeId: { mealDate, mealTypeId } },
      });
      const menu = await prisma.$transaction(async (tx) => {
        if (old) {
          await tx.kitchenMenuItem.deleteMany({ where: { menuId: old.id } });
          return tx.kitchenMenu.update({
            where: { id: old.id },
            data: {
              title: cleanText(body.title) || "Thực đơn",
              note: cleanText(body.note, 500) || null,
              status: "DRAFT",
              approvedAt: null,
              approvedById: null,
              items: { create: rows },
            },
            include: { items: true },
          });
        }
        return tx.kitchenMenu.create({
          data: {
            mealDate,
            mealTypeId,
            title: cleanText(body.title) || "Thực đơn",
            note: cleanText(body.note, 500) || null,
            items: { create: rows },
          },
          include: { items: true },
        });
      });
      await audit({
        entityType: "KITCHEN_MENU",
        entityId: menu.id,
        action: old ? "UPDATE" : "CREATE",
        user,
        before: old,
        after: menu,
        reason: "Soạn thực đơn vận hành",
      });
      return Response.json({ item: menu });
    }

    if (action === "approveMenu") {
      requireManager(user, ["ADMIN", "DIETITIAN"]);
      const id = cleanText(body.id);
      const before = await prisma.kitchenMenu.findUnique({ where: { id } });
      if (!before) throw new Error("Không tìm thấy thực đơn.");
      const item = await prisma.kitchenMenu.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });
      await audit({
        entityType: "KITCHEN_MENU",
        entityId: id,
        action: "APPROVE",
        user,
        before,
        after: item,
        reason: "Dinh dưỡng duyệt thực đơn",
      });
      return Response.json({ item });
    }

    if (action === "saveShift") {
      requireManager(user, ["ADMIN", "KITCHEN_MANAGER"]);
      const shiftDate = localDate(body.shiftDate);
      const starts = cleanText(body.startsAt);
      const ends = cleanText(body.endsAt);
      const startsAt = new Date(`${body.shiftDate}T${starts}:00+07:00`);
      const endsAt = new Date(`${body.shiftDate}T${ends}:00+07:00`);
      if (!(endsAt > startsAt))
        throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
      const members = (Array.isArray(body.memberIds) ? body.memberIds : [])
        .map((value) => cleanText(value))
        .filter(Boolean);
      const shift = await prisma.kitchenShift.create({
        data: {
          shiftDate,
          name: cleanText(body.name) || "Ca bếp",
          startsAt,
          endsAt,
          members: {
            create: members.map((userId, index) => ({
              userId,
              role: index === 0 ? "LEAD" : "STAFF",
            })),
          },
        },
        include: { members: true },
      });
      await audit({
        entityType: "KITCHEN_SHIFT",
        entityId: shift.id,
        action: "CREATE",
        user,
        after: shift,
        reason: "Lập lịch trực bếp",
      });
      return Response.json({ item: shift }, { status: 201 });
    }

    if (action === "createTask") {
      requireManager(user, ["ADMIN", "KITCHEN_MANAGER"]);
      const shiftId = cleanText(body.shiftId);
      const title = cleanText(body.title);
      if (!title) throw new Error("Cần tên nhiệm vụ.");
      const item = await prisma.kitchenTask.create({
        data: {
          shiftId,
          title,
          description: cleanText(body.description, 500) || null,
          assignedToId: cleanText(body.assignedToId) || null,
          createdById: user.id,
        },
      });
      await audit({
        entityType: "KITCHEN_TASK",
        entityId: item.id,
        action: "CREATE",
        user,
        after: item,
        reason: "Phân công nhiệm vụ bếp",
      });
      return Response.json({ item }, { status: 201 });
    }

    if (action === "taskStatus") {
      const id = cleanText(body.id);
      const status = cleanText(body.status);
      if (!["ACKNOWLEDGED", "COMPLETED"].includes(status))
        throw new Error("Trạng thái không hợp lệ.");
      const before = await prisma.kitchenTask.findUnique({ where: { id } });
      if (!before) throw new Error("Không tìm thấy nhiệm vụ.");
      if (
        user.role !== "ADMIN" &&
        user.role !== "KITCHEN_MANAGER" &&
        before.assignedToId !== user.id
      )
        throw new Error("Bạn không được cập nhật nhiệm vụ này.");
      const item = await prisma.kitchenTask.update({
        where: { id },
        data: {
          status,
          acknowledgedAt:
            status === "ACKNOWLEDGED" ? new Date() : before.acknowledgedAt,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
      await audit({
        entityType: "KITCHEN_TASK",
        entityId: id,
        action: status,
        user,
        before,
        after: item,
        reason: "Cập nhật nhiệm vụ bếp",
      });
      return Response.json({ item });
    }

    return Response.json(
      { error: "Thao tác chưa được hỗ trợ." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Không xử lý được yêu cầu.",
      },
      { status: 400 },
    );
  }
}
