// Seed cấu hình + tài khoản DEMO cho hệ suất ăn (idempotent, upsert).
// KHÔNG đụng dữ liệu Food/Dish. Chỉ tạo khoa/bữa/chế độ ăn + vài tài khoản để
// đăng nhập trải nghiệm. Mật khẩu chung ghi ở DEMO_PASSWORD (đổi nếu công khai).
import { prisma } from "../src/lib/prisma.js";
import { hashPassword, normalizeEmail } from "../src/lib/auth.js";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "DemoNutri2026";

const USERS = [
  { email: "admin@demo.dinhduong2598", displayName: "Quản trị (Trưởng khoa DD)", role: "ADMIN" },
  { email: "dinhduong@demo.dinhduong2598", displayName: "Khoa Dinh dưỡng", role: "DIETITIAN" },
  { email: "dieuduong@demo.dinhduong2598", displayName: "Điều dưỡng Khoa Nội", role: "DEPARTMENT_STAFF" },
  { email: "bep@demo.dinhduong2598", displayName: "Nhân viên bếp", role: "KITCHEN_STAFF" },
  { email: "bacsi@demo.dinhduong2598", displayName: "Bác sĩ Khoa Nội", role: "CLINICIAN" },
];

const DEPTS = [
  { code: "NOI", name: "Khoa Nội" },
  { code: "NGOAI", name: "Khoa Ngoại" },
];

const MEALS = [
  { code: "SANG", name: "Bữa sáng", serviceLocalTime: "07:00", cutoffLocalTime: "05:30" },
  { code: "TRUA", name: "Bữa trưa", serviceLocalTime: "11:00", cutoffLocalTime: "09:00" },
  { code: "CHIEU", name: "Bữa chiều", serviceLocalTime: "17:00", cutoffLocalTime: "15:00" },
];

const DIETS = [
  { code: "THUONG", name: "Cơm thường" },
  { code: "CHAO", name: "Cháo" },
  { code: "DTD", name: "Đái tháo đường" },
];

async function main() {
  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    const email = normalizeEmail(u.email);
    if (!email) throw new Error(`Email demo không hợp lệ: ${u.email}`);
    const row = await prisma.user.upsert({
      where: { email },
      update: { displayName: u.displayName, role: u.role },
      create: { email, displayName: u.displayName, role: u.role, passwordHash: hashPassword(DEMO_PASSWORD) },
    });
    userIds[u.role] = row.id;
  }

  const deptIds: Record<string, string> = {};
  for (const [i, d] of DEPTS.entries()) {
    const row = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: { code: d.code, name: d.name, sortOrder: i },
    });
    deptIds[d.code] = row.id;
  }

  for (const [i, m] of MEALS.entries()) {
    await prisma.mealType.upsert({
      where: { code: m.code },
      update: { name: m.name, serviceLocalTime: m.serviceLocalTime, cutoffLocalTime: m.cutoffLocalTime },
      create: { code: m.code, name: m.name, serviceLocalTime: m.serviceLocalTime, cutoffLocalTime: m.cutoffLocalTime, cutoffDaysBefore: 0, sortOrder: i },
    });
  }

  for (const [i, d] of DIETS.entries()) {
    await prisma.kitchenDietType.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: { code: d.code, name: d.name, sortOrder: i },
    });
  }

  // Điều dưỡng + bác sĩ thuộc Khoa Nội (để thao tác khoa mình).
  for (const role of ["DEPARTMENT_STAFF", "CLINICIAN"]) {
    await prisma.departmentMembership.upsert({
      where: { userId_departmentId: { userId: userIds[role], departmentId: deptIds["NOI"] } },
      update: { status: "ACTIVE", canSubmit: true },
      create: { userId: userIds[role], departmentId: deptIds["NOI"], canSubmit: true },
    });
  }

  console.log(`Seed demo xong. Đăng nhập bằng mật khẩu "${DEMO_PASSWORD}":`);
  for (const u of USERS) console.log(`  ${u.role.padEnd(17)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
