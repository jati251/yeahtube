import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getS3Client, getStorageConfig, StoragePaths } from "@/lib/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { validateMagicBytes, validateExtension } from "@/lib/magic-bytes";
import { requireCsrf } from "@/lib/csrf";
import { enqueueTranscode } from "@/lib/transcode-queue";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { eq } from "drizzle-orm";

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


// ── Single file processing (shared between normal + quick post) ─────

async function processSingleFile(
  file: File,
  index: number,
  db: ReturnType<typeof getDb>,
  s3: ReturnType<typeof getS3Client>,
  storageConfig: ReturnType<typeof getStorageConfig>,
  postId: number,
  uploadedKeys: string[],
): Promise<{
  id: number;
  storageKey: string;
  filename: string;
  mimeType: string;
  mediaType: "image" | "video";
  fileSize: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailKey: string | null;
  previewKey: string | null;
  orderIndex: number;
}> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // ── Magic byte validation ─────────────────────────
  if (!validateMagicBytes(fileBuffer, file.type)) {
    throw new Error(`File "${file.name}" has invalid content signature. Expected ${file.type}.`);
  }

  // ── Extension validation ──────────────────────────
  if (!validateExtension(file.name, file.type)) {
    throw new Error(`File "${file.name}" has an extension that does not match its content type.`);
  }

  // Validate file type
  const mediaType = determineMediaType(file.type);

  // Validate file size
  const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (fileBuffer.length > maxSize) {
    throw new Error(
      `File "${file.name}" exceeds ${mediaType === "image" ? "20MB" : "500MB"} limit`,
    );
  }

  const ext = getExtension(file.name);
  const storageId = uuidv4();
  const storageFilename = `${storageId}${ext}`;
  const thumbnailFilename = `${storageId}_thumb.webp`;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const folderPath = `${year}/${month}`;

  let storageKey: string;
  let thumbnailKey: string | null = null;
  let previewKey: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;

  if (mediaType === "image") {
    storageKey = `uploads/images/${folderPath}/${storageFilename}`;
  } else {
    storageKey = `uploads/videos/${folderPath}/${storageFilename}`;
  }

  // Upload original to S3
  await s3.send(
    new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: file.type,
    }),
  );
  uploadedKeys.push(storageKey);

  // Generate and upload thumbnail
  if (mediaType === "image") {
    try {
      const { thumbnailBuffer, width: w, height: h } =
        await generateImageThumbnail(fileBuffer);
      width = w;
      height = h;

      thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
        }),
      );
      uploadedKeys.push(thumbnailKey);
    } catch (thumbError) {
      console.error("Thumbnail generation failed:", thumbError);
    }
  } else {
    // For videos, asset generation (thumbnail, preview, dimensions) 
    // is offloaded to the background worker to avoid upload timeouts.
    console.log(`[Upload] Video ${file.name} uploaded, assets will be generated by worker`);
  }

  // Insert media record
  const [mediaResult] = await db
    .insert(schema.media)
    .values({
      postId,
      storageKey,
      filename: file.name,
      mimeType: file.type,
      mediaType,
      fileSize: fileBuffer.length,
      width,
      height,
      duration,
      thumbnailKey,
      previewKey,
      orderIndex: index,
    })
    .returning();

  // Enqueue transcode job for video files (fire-and-forget, don't block response)
  if (mediaType === "video" && storageConfig.bucket) {
    enqueueTranscode({
      mediaId: mediaResult.id,
      postId,
      storageKey,
      filename: file.name,
      mimeType: file.type,
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

  return {
    id: mediaResult.id,
    storageKey,
    filename: file.name,
    mimeType: file.type,
    mediaType,
    fileSize: fileBuffer.length,
    width,
    height,
    duration,
    thumbnailKey,
    previewKey,
    orderIndex: index,
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

    await db.insert(schema.postTags)
      .values({ postId, tagId: tag.id })
      ;
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

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const title = formData.get("title") as string;
    const categorySlug = formData.get("category") as string | null;
    const tagsRaw = formData.get("tags") as string;
    const quickPost = formData.get("quickPost") === "true";
    const postIdStr = formData.get("postId") as string | null;
    const isAppending = !!postIdStr;

    // Validate title (skip if quick post or appending to existing post)
    if (!quickPost && !isAppending) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 },
        );
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: "Title must be 200 characters or less" },
          { status: 400 },
        );
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 },
      );
    }

    // Parse tags
    let tagNames: string[] = [];
    try {
      tagNames = tagsRaw ? JSON.parse(tagsRaw) : [];
    } catch {
      return NextResponse.json(
        { error: "Invalid tags format" },
        { status: 400 },
      );
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
    const postTitle = quickPost
      ? (title?.trim() || files[0].name.replace(/\.[^/.]+$/, "") || "Quick Post")
      : title!.trim();

    let postId: number;
    let isNew = true;

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

    // ── Process files ───────────────────────────────────
    const startIndex = isNew ? 0 : (await db.select().from(schema.media).where(eq(schema.media.postId, postId))).length;
    const mediaRecords = [];
    const uploadedKeys: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const mediaRecord = await processSingleFile(files[i], startIndex + i, db, s3, storageConfig, postId, uploadedKeys);
        mediaRecords.push(mediaRecord);
      } catch (err) {
        // Delete uploaded files from S3 to prevent orphaned files
        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        for (const key of uploadedKeys) {
          try {
            await s3.send(
              new DeleteObjectCommand({
                Bucket: storageConfig.bucket,
                Key: key,
              }),
            );
          } catch (delErr) {
            console.error(`[Upload] Failed to clean up S3 key ${key} after error:`, delErr);
          }
        }

        if (isNew) {
          await db.delete(schema.posts).where(eq(schema.posts.id, postId));
        }
        const message = err instanceof Error ? err.message : "File processing failed";
        return NextResponse.json({ error: `File "${files[i].name}": ${message}` }, { status: 400 });
      }
    }

    // ── Tags (only for new posts) ────────────────────────
    if (isNew) {
      processTags(db, postId, tagNames);
    }

    return NextResponse.json(
      {
        success: true,
        ...(quickPost ? { quickPost: true } : {}),
        post: { id: postId, title: postTitle, media: mediaRecords, tags: tagNames },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
