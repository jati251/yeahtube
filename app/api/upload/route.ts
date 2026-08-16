import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getS3Client, getStorageConfig } from "@/lib/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { validateExtension } from "@/lib/magic-bytes";
import { requireCsrf } from "@/lib/csrf";
import { enqueueTranscode } from "@/lib/transcode-queue";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";
import { eq } from "drizzle-orm";
import { invalidateFeedCache, invalidateTaxonomyCache } from "@/lib/cache";

// ── Validation ─────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mp2t",
  "video/ts",
  "video/x-mpegts",
  "video/mp2p",
];

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

function determineMediaType(mimeType: string): "image" | "video" {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  throw new Error(`Unsupported file type: ${mimeType}`);
}

function getExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext || ".bin";
}

// ── Thumbnail Generation ───────────────────────────────

async function generateImageThumbnail(
  buffer: Buffer,
): Promise<{ thumbnailBuffer: Buffer; width: number; height: number }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const thumbnailBuffer = await image
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    thumbnailBuffer,
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

// ── Tag processing helper ──────────────────────────────

async function processTags(
  db: ReturnType<typeof getDb>,
  postId: number,
  tagNames: string[],
) {
  for (const tagName of tagNames) {
    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) continue;

    const [existingTag] = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.slug, slug));

    let tag;
    if (existingTag) {
      tag = existingTag;
    } else {
      const [newTag] = await db
        .insert(schema.tags)
        .values({ name: tagName.trim(), slug })
        .returning();
      tag = newTag;
    }

    await db.insert(schema.postTags).values({ postId, tagId: tag.id });
  }
}

// ── Route Handler ──────────────────────────────────────

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Header extraction
    const filename = decodeURIComponent(request.headers.get("x-file-name") || "");
    let mimeType = request.headers.get("x-file-type") || "application/octet-stream";
    if (
      filename.toLowerCase().endsWith(".ts") &&
      (mimeType === "application/octet-stream" ||
        mimeType.includes("typescript") ||
        !mimeType ||
        mimeType === "text/plain")
    ) {
      mimeType = "video/mp2t";
    }
    const title = decodeURIComponent(request.headers.get("x-post-title") || "");
    const categorySlug = request.headers.get("x-post-category") || null;
    const tagsRaw = decodeURIComponent(request.headers.get("x-post-tags") || "[]");
    const quickPost = request.headers.get("x-quick-post") === "true";
    const postIdStr = request.headers.get("x-post-id") || null;
    const orderIndexStr = request.headers.get("x-order-index") || "0";
    const fileSizeStr = request.headers.get("content-length") || "0";
    
    const isAppending = !!postIdStr;
    const orderIndex = parseInt(orderIndexStr, 10);
    const fileSize = parseInt(fileSizeStr, 10);

    if (!filename) {
      return NextResponse.json({ error: "Filename is required via x-file-name header" }, { status: 400 });
    }

    if (!request.body) {
      return NextResponse.json({ error: "Request body is missing" }, { status: 400 });
    }

    if (!validateExtension(filename, mimeType)) {
      return NextResponse.json({ error: `File extension does not match its content type.` }, { status: 400 });
    }

    let mediaType: "image" | "video";
    try {
      mediaType = determineMediaType(mimeType);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid media type";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (fileSize > maxSize) {
       return NextResponse.json({ error: `File exceeds ${mediaType === "image" ? "20MB" : "2GB"} limit` }, { status: 400 });
    }

    // Parse tags
    let tagNames: string[] = [];
    try {
      tagNames = JSON.parse(tagsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid tags format" }, { status: 400 });
    }

    const db = getDb();
    const s3 = getS3Client();
    const storageConfig = getStorageConfig();

    // Resolve category
    let categoryId: number | null = null;
    if (categorySlug) {
      const [cat] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, categorySlug));
      if (cat) categoryId = cat.id;
    }

    // ── Create or reuse post ────────────────────────────
    let postId: number;
    let isNew = true;

    // Check if we are appending via postId directly
    if (isAppending) {
      postId = parseInt(postIdStr!, 10);
      const [existingPost] = await db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, postId));
      if (!existingPost || existingPost.userId !== user.id) {
        return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
      }
      isNew = false;
    } else {
      const postTitle = quickPost
        ? (title?.trim() || filename.replace(/\.[^/.]+$/, "") || "Quick Post")
        : title!.trim();

      const [newPost] = await db
        .insert(schema.posts)
        .values({
          userId: user.id,
          title: postTitle,
          ...(categoryId !== null ? { categoryId } : {}),
        } as const)
        .returning();
      postId = newPost.id;
    }

    // ── Generate Paths ──────────────────────────────────
    const ext = getExtension(filename);
    const storageId = uuidv4();
    const storageFilename = `${storageId}${ext}`;
    const thumbnailFilename = `${storageId}_thumb.webp`;

    const now = new Date();
    const folderPath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

    const storageKey = mediaType === "image" 
      ? `uploads/images/${folderPath}/${storageFilename}`
      : `uploads/videos/${folderPath}/${storageFilename}`;
      
    let thumbnailKey: string | null = null;
    let width: number | null = null;
    let height: number | null = null;

    const uploadedKeys: string[] = [];

    // ── Stream to S3 ────────────────────────────────────
    try {
      if (mediaType === "image") {
        // Images (<20MB) are small enough to buffer in memory for sharp thumbnail generation
        const arrayBuffer = await new Response(request.body).arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Upload original
        await s3.send(
          new PutObjectCommand({
            Bucket: storageConfig.bucket,
            Key: storageKey,
            Body: fileBuffer,
            ContentType: mimeType,
          })
        );
        uploadedKeys.push(storageKey);

        // Generate and upload thumbnail
        try {
          const { thumbnailBuffer, width: w, height: h } = await generateImageThumbnail(fileBuffer);
          width = w;
          height = h;

          thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
          await s3.send(
            new PutObjectCommand({
              Bucket: storageConfig.bucket,
              Key: thumbnailKey,
              Body: thumbnailBuffer,
              ContentType: "image/webp",
            })
          );
          uploadedKeys.push(thumbnailKey);
        } catch (thumbError) {
          console.error("Thumbnail generation failed:", thumbError);
        }
      } else {
        // Videos are streamed directly via lib-storage Upload to prevent OOM spikes
        console.log(`[Upload] Streaming video ${filename} to S3...`);
        const upload = new Upload({
          client: s3,
          params: {
            Bucket: storageConfig.bucket,
            Key: storageKey,
            Body: request.body as unknown as ReadableStream,
            ContentType: mimeType,
          },
        });

        await upload.done();
        uploadedKeys.push(storageKey);
        console.log(`[Upload] Video ${filename} stream complete. Assets will be generated by worker.`);
      }

      // Insert media record
      const [mediaResult] = await db
        .insert(schema.media)
        .values({
          postId,
          storageKey,
          filename: filename,
          mimeType: mimeType,
          mediaType,
          fileSize: fileSize,
          width,
          height,
          thumbnailKey,
          orderIndex: orderIndex,
        })
        .returning();

      // Enqueue transcode job for video files
      if (mediaType === "video" && storageConfig.bucket) {
        enqueueTranscode({
          mediaId: mediaResult.id,
          postId,
          storageKey,
          filename: filename,
          mimeType: mimeType,
          bucket: storageConfig.bucket,
          endpoint: storageConfig.endpoint,
          region: storageConfig.region,
          accessKey: storageConfig.accessKey,
          secretKey: storageConfig.secretKey,
          forcePathStyle: storageConfig.forcePathStyle ?? false,
        }).catch((err) => {
          console.error("[Upload] Failed to enqueue transcode:", err.message);
        });
      }

      // Process tags (only for new posts, on first file)
      if (isNew) {
        await processTags(db, postId, tagNames);
        await invalidateTaxonomyCache();
      }

      // Invalidate Redis feed cache
      await invalidateFeedCache();

      return NextResponse.json(
        {
          success: true,
          ...(quickPost ? { quickPost: true } : {}),
          post: { 
            id: postId, 
            title: title || filename, 
            media: [mediaResult], 
            tags: tagNames 
          },
        },
        { status: 201 },
      );

    } catch (err) {
      // Cleanup S3 on failure
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      for (const key of uploadedKeys) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
        } catch (delErr) {
          console.error(`[Upload] Failed to clean up S3 key ${key}:`, delErr);
        }
      }
      if (isNew) {
        await db.delete(schema.posts).where(eq(schema.posts.id, postId));
      }
      const message = err instanceof Error ? err.message : "File processing failed";
      return NextResponse.json({ error: `File "${filename}": ${message}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
