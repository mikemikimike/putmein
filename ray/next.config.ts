import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  async redirects() {
    return [
      {
        source: "/register",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
