const validId = (value: string) => /^[A-Za-z0-9_-]{1,100}$/.test(value);

export function savedCalculatorUrl(id: string) {
  if (!validId(id)) throw new Error("Mã thực đơn không hợp lệ.");
  return `/tinh-khau-phan?banLuu=${encodeURIComponent(id)}`;
}

export function legacyCalculatorUrl(id: string) {
  if (!validId(id)) throw new Error("Mã thực đơn không hợp lệ.");
  return `/tinh-khau-phan?banCu=${encodeURIComponent(id)}`;
}

export function libraryCalculatorUrl(kind?: "food" | "dish", id?: string) {
  if (!kind || !id) return "/tinh-khau-phan?moi=1";
  if (!validId(id)) throw new Error("Mã thư viện không hợp lệ.");
  return `/tinh-khau-phan?thuVien=${kind}&item=${encodeURIComponent(id)}`;
}
