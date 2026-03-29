import type { NextConfig } from "next";

// Trigger rebuild to fix CSS unstyled issues
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
