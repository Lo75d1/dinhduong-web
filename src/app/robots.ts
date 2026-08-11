import type { MetadataRoute } from "next";

const siteUrl = "https://dinhduong2598.food";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/quan-tri/", "/tai-khoan/", "/bep/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
