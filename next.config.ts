import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment (see Dockerfile)
  output: "standalone",

  compress: true,

  // Allow uploads up to 500MB — matches MAX_VIDEO_SIZE in upload route
  // The proxy clones the request body and buffers it in memory; this limit
  // prevents excessive memory usage for large file uploads.
  experimental: {
    proxyClientMaxBodySize: "2GB",
    optimizePackageImports: ["lucide-react"],
  },

  serverExternalPackages: ["pg", "sharp"],

  images: {
    unoptimized: true,
    dangerouslyAllowLocalIP: true,
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  async rewrites() {
    const s3Endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    return [
      {
        source: "/storage/:path*",
        destination: `${s3Endpoint}/:path*`, // Proxy to MinIO
      },
    ];
  },

  async headers() {
    if (isDev) {
      return [
        {
          source: "/embed/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ],
        },
        {
          source: "/((?!embed).*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ],
        },
      ];
    }

    return [
      {
        source: "/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
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
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: http: https:",
              "media-src 'self' blob: http: https:",
              "connect-src 'self' http: https: https://cloudflareinsights.com",
              "font-src 'self'",
              "frame-ancestors *",
            ].join("; "),
          },
        ],
      },
      {
        source: "/((?!embed).*)",
        headers: [
          // ── Security Headers ──────────────────────────────
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: http: https:",
              "media-src 'self' blob: http: https:",
              "connect-src 'self' http: https: https://cloudflareinsights.com",
              "font-src 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
