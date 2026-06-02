/**
 * YeahTube — S3/MinIO Storage Client
 *
 * Provides a configured S3 client for the MinIO instance running on the
 * Proxmox VM at 192.168.1.206:9000. All file operations (upload, download,
 * delete, presigned URLs) go through this module.
 *
 * ⚠️ IMPORTANT: All config is LAZY — validated only when getS3Client() or
 * getStorageConfig() is called, NOT at module import time. This allows
 * `next build` to collect page data without S3 env vars being present
 * (they're only available at runtime via --env-file in Docker).
 *
 * Bucket structure:
 *   yeahtube/
 *   ├── uploads/
 *   │   ├── videos/
 *   │   └── images/
 *   ├── thumbnails/
 *   └── processed/
 */

import { S3Client } from "@aws-sdk/client-s3";

// ── Helpers ───────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ── Lazy Configuration ────────────────────────────────────────────
// NOT a module-level constant — validated only when explicitly called.

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
}

let cachedConfig: StorageConfig | null = null;

export function getStorageConfig(): StorageConfig {
  if (!cachedConfig) {
    cachedConfig = {
      endpoint: requireEnv("S3_ENDPOINT"),
      region: requireEnv("S3_REGION"),
      bucket: requireEnv("S3_BUCKET"),
      accessKey: requireEnv("S3_ACCESS_KEY"),
      secretKey: requireEnv("S3_SECRET_KEY"),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    };
  }
  return cachedConfig;
}

// ── S3 Client (singleton) ────────────────────────────────────────

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getStorageConfig();
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }
  return s3Client;
}

// ── Bucket key helpers ───────────────────────────────────────────

export const StoragePaths = {
  /** Raw uploaded videos */
  uploadVideo(filename: string): string {
    return `uploads/videos/${filename}`;
  },

  /** Raw uploaded images */
  uploadImage(filename: string): string {
    return `uploads/images/${filename}`;
  },

  /** Generated thumbnails (WebP, 400px) */
  thumbnail(filename: string): string {
    return `thumbnails/${filename}`;
  },

  /** Processed/transcoded files */
  processed(filename: string): string {
    return `processed/${filename}`;
  },
} as const;

// ── Public URL builder ───────────────────────────────────────────

/**
 * Builds a public URL for an object in the bucket.
 * Uses lazy config — safe to import at build time.
 */
export function getStorageUrl(key: string): string {
  const { endpoint, bucket } = getStorageConfig();
  return `${endpoint}/${bucket}/${key}`;
}
