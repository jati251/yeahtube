/**
 * YeahTube — Media Stream API Route
 *
 * Streams media files (videos) from S3/MinIO with proper HTTP Range request
 * support (206 Partial Content), enabling video seeking and scrubbing.
 *
 * Usage: GET /api/media/stream?key=<url-encoded-s3-key>
 *
 * Replaces the previous approach of presigned URLs proxied through
 * Next.js rewrites() (/storage/:path* -> MinIO), which had issues with
 * video loading on client-side navigation.
 *
 * Images/thumbnails continue to use getPresignedUrl() since they don't
 * need range request support.
 */

import { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { getS3Client, getStorageConfig } from "@/lib/storage";

// ── MIME Type Map ───────────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  m4v: "video/mp4",
  ogv: "video/ogg",
  ts: "video/mp2t",
  // Image (fallback — images should use getPresignedUrl, but support anyway)
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/**
 * Resolves a Content-Type based on the file extension.
 */
function getContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

// ── Route Handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return new Response("Missing 'key' query parameter", { status: 400 });
  }

  const decodedKey = decodeURIComponent(key).trim();

  // Strict S3 key validation to prevent Path Traversal, Null Byte injection, and SSRF attacks
  if (
    decodedKey.includes("\0") ||
    decodedKey.includes("..") ||
    decodedKey.startsWith("/") ||
    decodedKey.startsWith("\\") ||
    !/^[a-zA-Z0-9_\-\.\/]+$/.test(decodedKey)
  ) {
    return new Response("Invalid key parameter", { status: 400 });
  }

  const s3 = getS3Client();
  const { bucket } = getStorageConfig();

  // Forward the Range header if present (for video seeking)
  const rangeHeader = request.headers.get("range") ?? undefined;

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: decodedKey,
      Range: rangeHeader,
    });

    const s3Response = await s3.send(command);

    // Abort if the body is unexpectedly missing
    if (!s3Response.Body) {
      return new Response("Object not found", { status: 404 });
    }

    const contentType = s3Response.ContentType ?? getContentType(decodedKey);
    const contentLength = s3Response.ContentLength;

    // ── Build response headers ──────────────────────────────
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (s3Response.ETag) {
      headers["ETag"] = s3Response.ETag;
    }

    if (s3Response.LastModified) {
      headers["Last-Modified"] = s3Response.LastModified.toUTCString();
    }

    if (contentLength !== undefined) {
      headers["Content-Length"] = String(contentLength);
    }

    if (s3Response.ContentRange) {
      headers["Content-Range"] = s3Response.ContentRange;
    }

    // Determine status: 206 Partial Content for ranged requests, 200 otherwise
    const status = rangeHeader ? 206 : 200;

    // Use native AWS SDK SdkStream.transformToWebStream() for high performance zero-copy streaming
    const streamBody = s3Response.Body;
    const webStream =
      streamBody && "transformToWebStream" in streamBody && typeof streamBody.transformToWebStream === "function"
        ? (streamBody.transformToWebStream as () => ReadableStream)()
        : Readable.toWeb(streamBody as Readable);

    return new Response(webStream as unknown as BodyInit, {
      status,
      headers,
    });
  } catch (error: unknown) {
    // S3 throws NoSuchKey when the object doesn't exist
    if (error instanceof Error && error.name === "NoSuchKey") {
      return new Response("Object not found", { status: 404 });
    }

    // Re-throw unexpected errors so Next.js handles them (500)
    throw error;
  }
}
