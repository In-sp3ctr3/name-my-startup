import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3107", "http://127.0.0.1:3107", "localhost:3107"],
  devIndicators: false
};

export default nextConfig;
