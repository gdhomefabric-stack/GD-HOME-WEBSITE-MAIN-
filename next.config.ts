import type { NextConfig } from "next";

// Static export so the site can be hosted on GitHub Pages (gdhomefabric.in).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  agentRules: false,
};

export default nextConfig;
