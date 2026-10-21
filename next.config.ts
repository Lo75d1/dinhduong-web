import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tạo server Node tự chứa để chạy ổn định trong Docker/VPS.
  output: "standalone",
  async headers() {
    return [{ source: "/ket-noi-ai/authorize/:path*", headers: [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cache-Control", value: "no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ] }, {
      source: "/quan-tri/kho-thuc-don/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }, {
      source: "/quan-tri/ket-noi-ai/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }];
  },
};

export default nextConfig;
