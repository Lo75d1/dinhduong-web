export const defaultSiteSettings = {
  contactName: "Lê Công Bảo Long",
  organization: "",
  phone: "0986703396",
  email: "",
  address: "",
  zaloUrl: "https://zalo.me/g/dhgc4wmunry94r4cbxzm",
  offlineDownloadUrl: "",
  thankYouTitle: "Lời cảm ơn",
  thankYouBody: "Dinh dưỡng 2598 trân trọng cảm ơn Ban Giám đốc, các khoa/phòng, nhân viên y tế và đồng nghiệp đã đóng góp ý kiến để hoàn thiện sáng kiến cải tiến này.",
};

export function cleanPublicText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
