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
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

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

async function generateVideoAssets(
  buffer: Buffer,
  ext: string,
): Promise<{ thumbnailBuffer: Buffer; previewBuffer: Buffer | null; duration: number; width: number | null; height: number | null }> {
  const tmpDir = os.tmpdir();
  const uniqueId = uuidv4();
  const tmpInput = path.join(tmpDir, `yt-${uniqueId}${ext}`);
  // ffmpeg .screenshots() outputs PNG with its own naming — we use a known prefix
  const thumbBasename = `yt-thumb-${uniqueId}`;
  const tmpThumbPng = path.join(tmpDir, `${thumbBasename}.png`);
  const tmpThumbWebp = path.join(tmpDir, `${thumbBasename}.webp`);
  const tmpPreview = path.join(tmpDir, `yt-preview-${uniqueId}.mp4`);

  try {
    await fs.writeFile(tmpInput, buffer);

    let actualDuration = 0;
    let videoWidth: number | null = null;
    let videoHeight: number | null = null;

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = require("fluent-ffmpeg") as any;

      ffmpeg.ffprobe(tmpInput, (err: any, metadata: any) => {
        if (err) return reject(err);

        actualDuration = metadata.format.duration || 0;
        // Extract video dimensions
        const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
        if (videoStream) {
          if (videoStream.width) videoWidth = videoStream.width;
          if (videoStream.height) videoHeight = videoStream.height;
        }
        // Use 10% into video, clamped so we never seek past end
        const seekTime = Math.max(0, Math.min(actualDuration * 0.1, actualDuration - 0.5, 10));

        const generatePreview = (onDone: () => void) => {
          if (actualDuration < 0.5) {
            // Video too short for a meaningful preview
            onDone();
            return;
          }

          const previewDuration = Math.min(3, Math.max(0.5, actualDuration - seekTime));

          ffmpeg(tmpInput)
            .setStartTime(seekTime)
            .setDuration(previewDuration)
            .videoFilters("setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709,scale='min(360,iw)':-2")
            .noAudio()
            .videoCodec("libx264")
            .outputOptions([
              "-preset ultrafast",
              "-crf 32",
              "-movflags +faststart",
              "-pix_fmt yuv420p",
            ])
            .save(tmpPreview)
            .on("end", onDone)
            .on("error", (previewErr: any) => {
              console.error("Preview generation failed:", previewErr.message);
              onDone(); // still resolve so thumbnail is saved
            });
        };

        const tryThumbnail = (time: number, onSuccess: () => void, onFail: () => void) => {
          ffmpeg(tmpInput)
            .seekInput(time)
            .frames(1)
            .videoFilters("setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709,scale=400:-2")
            .output(tmpThumbPng)
            .outputOptions(["-update", "1"])
            .on("end", onSuccess)
            .on("error", (e: any) => {
              console.error(`Thumbnail at t=${time} failed:`, e.message);
              onFail();
            })
            .run();
        };

        // Try thumbnail at seekTime, fallback to t=0
        tryThumbnail(
          seekTime,
          () => generatePreview(() => resolve()),
          () => {
            tryThumbnail(
              0,
              () => generatePreview(() => resolve()),
              () => {
                console.error("All thumbnail attempts failed");
                resolve(); // give up gracefully
              },
            );
          },
        );
      });
    });

    // Convert PNG thumbnail to WebP using sharp for smaller file size
    let thumbnailBuffer: Buffer;
    try {
      const pngBuffer = await fs.readFile(tmpThumbPng);
      thumbnailBuffer = await sharp(pngBuffer)
        .webp({ quality: 75 })
        .toBuffer();
    } catch (e) {
      // If PNG doesn't exist, try reading any file matching our thumb pattern
      console.error("Could not read/convert thumbnail PNG, generating fallback");
      // Generate a minimal placeholder so we don't crash
      thumbnailBuffer = await sharp({
        create: { width: 400, height: 225, channels: 3, background: { r: 30, g: 30, b: 30 } },
      }).webp({ quality: 50 }).toBuffer();
    }

    let previewBuffer: Buffer | null = null;
    try {
      previewBuffer = await fs.readFile(tmpPreview);
    } catch (e) {
      console.error("Could not read preview buffer (preview may not have been generated)");
    }

    return {
      thumbnailBuffer,
      previewBuffer,
      duration: actualDuration,
      width: videoWidth,
      height: videoHeight,
    };
  } finally {
    for (const f of [tmpInput, tmpThumbPng, tmpThumbWebp, tmpPreview]) {
      try { await fs.unlink(f); } catch {}
    }
  }
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
    try {
      const { thumbnailBuffer, previewBuffer, duration: dur, width: vw, height: vh } =
        await generateVideoAssets(fileBuffer, ext);
      duration = dur;
      if (!width) width = vw;
      if (!height) height = vh;

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

      if (previewBuffer) {
        previewKey = `previews/${folderPath}/${storageId}_preview.mp4`;
        await s3.send(
          new PutObjectCommand({
            Bucket: storageConfig.bucket,
            Key: previewKey,
            Body: previewBuffer,
            ContentType: "video/mp4",
          }),
        );
        uploadedKeys.push(previewKey);
      }
    } catch (assetError) {
      console.error("Video asset generation failed:", assetError);
    }
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
