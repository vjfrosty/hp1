import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // packages/shared ships TypeScript source; Next compiles it.
  transpilePackages: ["@hp1/shared"],
  async headers() {
    return [
      {
        // The service worker must always be revalidated, or users keep an old one.
        source: "/serwist/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
