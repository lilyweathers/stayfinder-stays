import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const backendUrl = process.env.API_BACKEND_URL?.replace(/\/$/, "");
    return backendUrl
      ? [{ source: "/api/:path*", destination: `${backendUrl}/:path*` }]
      : [];
  },
};

export default nextConfig;
