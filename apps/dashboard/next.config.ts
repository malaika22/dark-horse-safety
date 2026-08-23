import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@dark-horse-safety/ui",
    "@dark-horse-safety/theme",
    "@dark-horse-safety/types",
    "@dark-horse-safety/api-client",
  ],
};

export default nextConfig;
