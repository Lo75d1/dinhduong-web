-- Additive migration: meal ordering and kitchen operations.
-- Does not alter Food, Dish, Patient or Ration source/clinical data.
CREATE TABLE "departments" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "departments_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
CREATE INDEX "departments_status_sortOrder_idx" ON "departments"("status", "sortOrder");

CREATE TABLE "department_memberships" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "departmentId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'REPORTER', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "canSubmit" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "department_memberships_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "department_memberships_userId_departmentId_key" ON "department_memberships"("userId", "departmentId");
CREATE INDEX "department_memberships_departmentId_status_idx" ON "department_memberships"("departmentId", "status");

CREATE TABLE "meal_types" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "serviceLocalTime" TEXT NOT NULL, "cutoffLocalTime" TEXT NOT NULL, "cutoffDaysBefore" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "meal_types_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "meal_types_code_key" ON "meal_types"("code");
CREATE INDEX "meal_types_status_sortOrder_idx" ON "meal_types"("status", "sortOrder");

CREATE TABLE "kitchen_diet_types" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "dietCodeId" TEXT, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "kitchen_diet_types_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "kitchen_diet_types_code_key" ON "kitchen_diet_types"("code");
CREATE INDEX "kitchen_diet_types_status_sortOrder_idx" ON "kitchen_diet_types"("status", "sortOrder");

CREATE TABLE "meal_orders" ("id" TEXT NOT NULL, "publicCode" TEXT NOT NULL, "lastRequestKey" TEXT, "departmentId" TEXT NOT NULL, "mealDate" DATE NOT NULL, "mealTypeId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SUBMITTED', "version" INTEGER NOT NULL DEFAULT 1, "submittedById" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'WEB', "note" TEXT, "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lockedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "meal_orders_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "meal_orders_publicCode_key" ON "meal_orders"("publicCode");
CREATE UNIQUE INDEX "meal_orders_lastRequestKey_key" ON "meal_orders"("lastRequestKey");
CREATE UNIQUE INDEX "meal_orders_departmentId_mealDate_mealTypeId_key" ON "meal_orders"("departmentId", "mealDate", "mealTypeId");
CREATE INDEX "meal_orders_mealDate_mealTypeId_status_idx" ON "meal_orders"("mealDate", "mealTypeId", "status");

CREATE TABLE "meal_order_items" ("id" TEXT NOT NULL, "mealOrderId" TEXT NOT NULL, "dietTypeId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, CONSTRAINT "meal_order_items_pkey" PRIMARY KEY ("id"), CONSTRAINT "meal_order_items_quantity_check" CHECK ("quantity" >= 0));
CREATE UNIQUE INDEX "meal_order_items_mealOrderId_dietTypeId_key" ON "meal_order_items"("mealOrderId", "dietTypeId");

CREATE TABLE "kitchen_menus" ("id" TEXT NOT NULL, "mealDate" DATE NOT NULL, "mealTypeId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "title" TEXT NOT NULL, "note" TEXT, "approvedById" TEXT, "approvedAt" TIMESTAMP(3), "handedOffAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "kitchen_menus_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "kitchen_menus_mealDate_mealTypeId_key" ON "kitchen_menus"("mealDate", "mealTypeId");
CREATE INDEX "kitchen_menus_mealDate_status_idx" ON "kitchen_menus"("mealDate", "status");

CREATE TABLE "kitchen_menu_items" ("id" TEXT NOT NULL, "menuId" TEXT NOT NULL, "dietTypeId" TEXT NOT NULL, "dishName" TEXT NOT NULL, "note" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "kitchen_menu_items_pkey" PRIMARY KEY ("id"));
CREATE INDEX "kitchen_menu_items_menuId_sortOrder_idx" ON "kitchen_menu_items"("menuId", "sortOrder");

CREATE TABLE "kitchen_shifts" ("id" TEXT NOT NULL, "shiftDate" DATE NOT NULL, "name" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'PLANNED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "kitchen_shifts_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "kitchen_shifts_shiftDate_name_key" ON "kitchen_shifts"("shiftDate", "name");
CREATE INDEX "kitchen_shifts_shiftDate_status_idx" ON "kitchen_shifts"("shiftDate", "status");

CREATE TABLE "kitchen_shift_members" ("id" TEXT NOT NULL, "shiftId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'STAFF', "status" TEXT NOT NULL DEFAULT 'ASSIGNED', "note" TEXT, CONSTRAINT "kitchen_shift_members_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "kitchen_shift_members_shiftId_userId_key" ON "kitchen_shift_members"("shiftId", "userId");
CREATE INDEX "kitchen_shift_members_userId_status_idx" ON "kitchen_shift_members"("userId", "status");

CREATE TABLE "kitchen_tasks" ("id" TEXT NOT NULL, "shiftId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "assignedToId" TEXT, "createdById" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'TODO', "acknowledgedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "kitchen_tasks_pkey" PRIMARY KEY ("id"));
CREATE INDEX "kitchen_tasks_shiftId_status_idx" ON "kitchen_tasks"("shiftId", "status");
CREATE INDEX "kitchen_tasks_assignedToId_status_idx" ON "kitchen_tasks"("assignedToId", "status");

CREATE TABLE "meal_operation_audits" ("id" TEXT NOT NULL, "mealOrderId" TEXT, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "beforeJson" JSONB, "afterJson" JSONB, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "meal_operation_audits_pkey" PRIMARY KEY ("id"));
CREATE INDEX "meal_operation_audits_entityType_entityId_createdAt_idx" ON "meal_operation_audits"("entityType", "entityId", "createdAt");
CREATE INDEX "meal_operation_audits_mealOrderId_createdAt_idx" ON "meal_operation_audits"("mealOrderId", "createdAt");

CREATE TABLE "meal_order_change_requests" ("id" TEXT NOT NULL, "mealOrderId" TEXT NOT NULL, "requestedById" TEXT NOT NULL, "reason" TEXT NOT NULL, "proposedJson" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "reviewedById" TEXT, "reviewNote" TEXT, "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "meal_order_change_requests_pkey" PRIMARY KEY ("id"));
CREATE INDEX "meal_order_change_requests_mealOrderId_status_createdAt_idx" ON "meal_order_change_requests"("mealOrderId", "status", "createdAt");
CREATE INDEX "meal_order_change_requests_status_createdAt_idx" ON "meal_order_change_requests"("status", "createdAt");

ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meal_orders" ADD CONSTRAINT "meal_orders_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meal_orders" ADD CONSTRAINT "meal_orders_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meal_orders" ADD CONSTRAINT "meal_orders_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meal_order_items" ADD CONSTRAINT "meal_order_items_mealOrderId_fkey" FOREIGN KEY ("mealOrderId") REFERENCES "meal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meal_order_items" ADD CONSTRAINT "meal_order_items_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "kitchen_diet_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchen_menus" ADD CONSTRAINT "kitchen_menus_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchen_menus" ADD CONSTRAINT "kitchen_menus_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kitchen_menu_items" ADD CONSTRAINT "kitchen_menu_items_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "kitchen_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_menu_items" ADD CONSTRAINT "kitchen_menu_items_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "kitchen_diet_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchen_shift_members" ADD CONSTRAINT "kitchen_shift_members_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "kitchen_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_shift_members" ADD CONSTRAINT "kitchen_shift_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_tasks" ADD CONSTRAINT "kitchen_tasks_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "kitchen_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_tasks" ADD CONSTRAINT "kitchen_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kitchen_tasks" ADD CONSTRAINT "kitchen_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meal_operation_audits" ADD CONSTRAINT "meal_operation_audits_mealOrderId_fkey" FOREIGN KEY ("mealOrderId") REFERENCES "meal_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meal_order_change_requests" ADD CONSTRAINT "meal_order_change_requests_mealOrderId_fkey" FOREIGN KEY ("mealOrderId") REFERENCES "meal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
