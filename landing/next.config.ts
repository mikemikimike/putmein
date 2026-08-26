import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "",
  },
  reactCompiler: true,
};

export default nextConfig;
