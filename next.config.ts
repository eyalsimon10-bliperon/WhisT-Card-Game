import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@letele/playing-cards"],
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid corrupted webpack cache on Windows after file changes
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
