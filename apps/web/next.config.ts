import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mindmetric/shared", "@mindmetric/ui"],
};

export default nextConfig;
