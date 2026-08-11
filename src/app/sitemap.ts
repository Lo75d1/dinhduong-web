import type { MetadataRoute } from "next";

const siteUrl = "https://dinhduong2598.food";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/thuc-pham",
    "/mon-an",
    "/tinh-khau-phan",
    "/huong-dan",
    "/tri-thuc-dinh-duong",
    "/thuoc-va-dinh-duong",
    "/tai-lieu-tham-khao",
    "/ve-he-thong",
    "/cam-on",
    "/lien-he",
    "/de-xuat-thuc-pham",
    "/chinh-sach-bao-mat",
    "/dieu-khoan-su-dung",
  ];

  return routes.map((route, index) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
