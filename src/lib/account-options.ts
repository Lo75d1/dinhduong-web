export const ACCOUNT_ROLES = [
  ["CLINICIAN", "Bác sĩ"],
  ["EDITOR", "Biên tập dữ liệu"],
  ["DEPARTMENT_STAFF", "Điều dưỡng khoa"],
  ["DIETITIAN", "Dinh dưỡng"],
  ["KITCHEN_MANAGER", "Bếp trưởng"],
  ["KITCHEN_STAFF", "Nhân viên bếp"],
  ["ADMIN", "Quản trị viên"],
] as const;
export function accountRoleLabel(role: string) {
  return (
    ACCOUNT_ROLES.find(([value]) => value === role)?.[1] ?? "Tài khoản cá nhân"
  );
}
export function safeAccountReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 512 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return "/tai-khoan";
  try {
    return new URL(value, "https://dinhduong2598.food").origin ===
      "https://dinhduong2598.food"
      ? value
      : "/tai-khoan";
  } catch {
    return "/tai-khoan";
  }
}
export const ACCOUNT_ACTION_LABELS: Record<string, string> = {
  PROFILE_UPDATE: "Cập nhật hồ sơ",
  PASSWORD_CHANGE: "Đổi mật khẩu",
  USER_CREATE: "Tạo tài khoản",
  USER_UPDATE: "Cập nhật thông tin / quyền",
  USER_DISABLE: "Khóa tài khoản",
  USER_ENABLE: "Mở tài khoản",
  PASSWORD_RESET: "Đặt lại mật khẩu",
  SESSIONS_REVOKE: "Thu hồi phiên đăng nhập",
  CONNECTIONS_REVOKE: "Thu hồi kết nối ứng dụng",
  MANUAL_CLIENT_CREATE: "Tạo cấu hình thủ công",
  MANUAL_CLIENT_REVOKE: "Thu hồi cấu hình thủ công",
};
