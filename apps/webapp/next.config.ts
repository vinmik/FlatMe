import path from "node:path";
import type { NextConfig } from "next";

// Set by scripts/bundle-standalone.mjs, which builds a self-contained copy of this app for hosting.
const standalone = process.env.WEBAPP_STANDALONE === "1";
// In the monorepo the workspace root is two levels up; the standalone copy is its own root.
const root = standalone ? __dirname : path.join(__dirname, "../..");

const config: NextConfig = {
  // @flatme/shared ships TypeScript source.
  transpilePackages: ["@flatme/shared"],
  output: standalone ? "standalone" : undefined,
  turbopack: { root },
  outputFileTracingRoot: root,
  poweredByHeader: false,
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default config;
