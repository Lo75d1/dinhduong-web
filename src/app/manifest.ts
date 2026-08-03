import type { MetadataRoute } from "next";

// Cho phép "Thêm vào màn hình chính" trên Android chạy như app (toàn màn hình).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dinh dưỡng 2598 — Phân loại nhanh",
    short_name: "Phân loại 2598",
    description: "Lướt thẻ phân loại nhanh dữ liệu thực phẩm — Dinh dưỡng 2598.",
    start_url: "/quan-tri/phan-loai",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f0e7",
    theme_color: "#123c36",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
