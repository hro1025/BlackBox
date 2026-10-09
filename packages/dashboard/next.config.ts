import type { NextConfig } from "next";

const INGEST_URL = process.env.BLACKBOX_INGEST_URL ?? "http://localhost:7070";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${INGEST_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
