import type { NextConfig } from "next";

const basePath = process.env.GITHUB_ACTIONS === "true"
  ? "/game-theory-system"
  : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
