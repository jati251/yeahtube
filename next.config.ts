import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment (see Dockerfile)
  output: "standalone",

  // Allow uploads up to 500MB — matches MAX_VIDEO_SIZE in upload route
  // The proxy clones the request body and buffers it in memory; this limit
  // prevents excessive memory usage for large file uploads.
  experimental: {
    proxyClientMaxBodySize: "500MB",
  },

  serverExternalPackages: ["pg", "sharp"],

  images: {
    dangerouslyAllowLocalIP: true,
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "api.s3.homelab.local",
      },
      {
        protocol: "http",
        hostname: "192.168.1.206",
        port: "9000",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/storage/:path*",
        destination: "http://dev-minio.dev-storage.svc.cluster.local:9000/:path*", // Proxy to MinIO
      },
    ];
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: http://192.168.1.206:9000 http://api.s3.homelab.local",
              "media-src 'self' blob: http://192.168.1.206:9000 http://api.s3.homelab.local",
              "connect-src 'self' http://192.168.1.206:9000 http://api.s3.homelab.local",
              "font-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
