export const defaultSiteSettings = {
  contactName: "Lê Công Bảo Long",
  organization: "Phòng PC07 Công an thành phố Huế · Đội PC & CNCH khu vực 4",
  phone: "0986703396",
  email: "",
  address: "",
  zaloUrl: "https://zalo.me/g/dhgc4wmunry94r4cbxzm",
};

export function cleanPublicText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
