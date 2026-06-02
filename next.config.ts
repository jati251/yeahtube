import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment (see Dockerfile)
  output: "standalone",

  serverExternalPackages: ["better-sqlite3", "sharp"],

  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "192.168.1.206",
        port: "9000",
      },
    ],
  },

  async headers() {
    // In development, be permissive for HMR and dev tools
    if (isDev) {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ],
        },
      ];
    }

    return [
      {
        source: "/(.*)",
        headers: [
          // ── Security Headers ──────────────────────────────
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          // ── Content Security Policy (production only) ─────
          // Dev mode is intentionally permissive for HMR/WebSocket.
          // In production, restrict resources to self-hosted origins.
          // 'unsafe-inline' on style-src is required for Next.js
          // style injection. Media can be served from local MinIO.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: http://192.168.1.206:9000",
              "media-src 'self' blob: http://192.168.1.206:9000",
              "connect-src 'self' http://192.168.1.206:9000",
              "font-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
