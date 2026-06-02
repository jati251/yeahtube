/**
 * YeahTube — S3/MinIO Storage Client
 *
 * Provides a configured S3 client for the MinIO instance running on the
 * Proxmox VM at 192.168.1.206:9000. All file operations (upload, download,
 * delete, presigned URLs) go through this module.
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

// ── Configuration ────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const STORAGE_CONFIG = {
  endpoint: requireEnv("S3_ENDPOINT"),
  region: requireEnv("S3_REGION"),
  bucket: requireEnv("S3_BUCKET"),
  accessKey: requireEnv("S3_ACCESS_KEY"),
  secretKey: requireEnv("S3_SECRET_KEY"),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
} as const;

// ── S3 Client (singleton) ────────────────────────────────────────

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: STORAGE_CONFIG.endpoint,
      region: STORAGE_CONFIG.region,
      credentials: {
        accessKeyId: STORAGE_CONFIG.accessKey,
        secretAccessKey: STORAGE_CONFIG.secretKey,
      },
      forcePathStyle: STORAGE_CONFIG.forcePathStyle,
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
 * Since this is a local-network-only app, we construct direct
 * S3 endpoint URLs (no CDN / CloudFront).
 *
 * For private/proxied access, use API routes that call getObject
 * and stream the response (Range support for videos).
 */
export function getStorageUrl(key: string): string {
  const { endpoint, bucket } = STORAGE_CONFIG;
  return `${endpoint}/${bucket}/${key}`;
}
