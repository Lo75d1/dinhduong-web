import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tạo server Node tự chứa để chạy ổn định trong Docker/VPS.
  output: "standalone",
};

export default nextConfig;
