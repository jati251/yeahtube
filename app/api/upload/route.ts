import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getS3Client, getStorageConfig, StoragePaths } from "@/lib/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { validateMagicBytes, validateExtension } from "@/lib/magic-bytes";
import { requireCsrf } from "@/lib/csrf";
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
): Promise<{ thumbnailBuffer: Buffer; previewBuffer: Buffer | null; duration: number }> {
  const tmpDir = os.tmpdir();
  const tmpInput = path.join(tmpDir, `yt-${uuidv4()}${ext}`);
  const tmpOutput = path.join(tmpDir, `yt-thumb-${uuidv4()}.webp`);
  const tmpPreview = path.join(tmpDir, `yt-preview-${uuidv4()}.mp4`);

  try {
    await fs.writeFile(tmpInput, buffer);

    let actualDuration = 0;

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = require("fluent-ffmpeg") as any;

      ffmpeg.ffprobe(tmpInput, (err: any, metadata: any) => {
        if (err) return reject(err);

        actualDuration = metadata.format.duration || 0;
        // Use 10% into video, but clamp to 0..duration-0.5 so we never seek past end
        const seekTime = Math.max(0, Math.min(actualDuration * 0.1, Math.max(0, actualDuration - 0.5), 10));

        const generatePreview = (onDone: () => void) => {
          ffmpeg(tmpInput)
            .setStartTime(seekTime)
            .setDuration(Math.min(3, Math.max(0.5, actualDuration - seekTime)))
            .outputOptions([
              // Ensure dimensions are divisible by 2 (required by libx264)
              "-vf", "scale='min(480,iw)':'-2',pad='iw:ih:(ow-iw)/2:(oh-ih)/2'",
              "-an",
              "-c:v libx264",
              "-preset ultrafast",
              "-crf 28",
              "-movflags +faststart",
            ])
            .save(tmpPreview)
            .on("end", onDone)
            .on("error", (previewErr: any) => {
              console.error("Preview generation failed:", previewErr.message);
              onDone(); // still resolve so thumbnail is saved
            });
        };

        // Generate Thumbnail — try at seekTime, fall back to 0 if it fails
        ffmpeg(tmpInput)
          .screenshots({
            count: 1,
            folder: tmpDir,
            filename: path.basename(tmpOutput),
            timemarks: [seekTime > 0 ? seekTime : 0],
            size: "400x?",
          })
          .on("end", () => {
            generatePreview(() => resolve());
          })
          .on("error", (thumbErr: any) => {
            console.error("Thumbnail at seekTime failed, retrying at 0:", thumbErr.message);
            // Fallback: try thumbnail at t=0
            ffmpeg(tmpInput)
              .screenshots({
                count: 1,
                folder: tmpDir,
                filename: path.basename(tmpOutput),
                timemarks: [0],
                size: "400x?",
              })
              .on("end", () => {
                generatePreview(() => resolve());
              })
              .on("error", (fallbackErr: any) => {
                console.error("Fallback thumbnail also failed:", fallbackErr.message);
                resolve(); // give up gracefully
              });
          });
      });
    });

    const thumbnailBuffer = await fs.readFile(tmpOutput);
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
    };
  } finally {
    try { await fs.unlink(tmpInput); } catch {}
    try { await fs.unlink(tmpOutput); } catch {}
    try { await fs.unlink(tmpPreview); } catch {}
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
    } catch (thumbError) {
      console.error("Thumbnail generation failed:", thumbError);
    }
  } else {
    try {
      const { thumbnailBuffer, previewBuffer, duration: dur } =
        await generateVideoAssets(fileBuffer, ext);
      duration = dur;

      thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
        }),
      );

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
      }
    } catch (assetError) {
      console.error("Video asset generation failed:", assetError);
    }

    // Try ffprobe for duration if thumbnail didn't provide it
    if (duration === null) {
      try {
        const tmpDir = os.tmpdir();
        const tmpInput = path.join(tmpDir, `yt-${uuidv4()}${ext}`);
        await fs.writeFile(tmpInput, fileBuffer);
        const ffmpeg = require("fluent-ffmpeg") as any;
        duration = await new Promise<number>((resolve, reject) => {
          ffmpeg.ffprobe(tmpInput, (err: any, metadata: any) => {
            try { fs.unlink(tmpInput); } catch {}
            if (err) return resolve(0);
            resolve(metadata.format.duration || 0);
          });
        });
      } catch {}
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

    // Validate title (not required for quick post — uses filename)
    if (!quickPost) {
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

    // ── Quick Post Mode: individual post per file ─────────
    // Uses filename (without extension) as title, no tags/category sent
    if (quickPost) {
      const createdPosts = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const fileTitle = files.length > 1
          ? `${filenameWithoutExt}`
          : filenameWithoutExt;

        // Create post (omit categoryId for quick post — no form fields used)
        const [newPost] = await db
          .insert(schema.posts)
          .values({
            userId: user.id,
            title: fileTitle,
          })
          .returning();

        const postId = newPost.id;

        try {
          const mediaRecord = await processSingleFile(
            file, 0, db, s3, storageConfig, postId,
          );
          processTags(db, postId, tagNames);

          createdPosts.push({
            id: postId,
            title: fileTitle,
            media: [mediaRecord],
            tags: tagNames,
          });
        } catch (err) {
          // Clean up the post if file processing failed
          await db.delete(schema.posts).where(eq(schema.posts.id, postId));
          const message = err instanceof Error ? err.message : "File processing failed";
          return NextResponse.json(
            { error: `File "${file.name}": ${message}` },
            { status: 400 },
          );
        }
      }

      return NextResponse.json(
        {
          success: true,
          quickPost: true,
          posts: createdPosts,
          count: createdPosts.length,
        },
        { status: 201 },
      );
    }

    // ── Normal Mode: one post, multiple media ────────────

    let postId: number;
    const postIdStr = formData.get("postId") as string | null;
    
    if (postIdStr) {
      postId = parseInt(postIdStr, 10);
      const [existingPost] = await db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, postId));
        
      if (!existingPost || existingPost.userId !== user.id) {
        return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
      }
    } else {
      const postValues = {
        userId: user.id,
        title: title.trim(),
        ...(categoryId !== null ? { categoryId } : {}),
      } as const;
      const [newPost] = await db
        .insert(schema.posts)
        .values(postValues)
        .returning();
      postId = newPost.id;
    }

    // Process each file
    const mediaRecords = [];

    // Get the current max orderIndex if appending
    let startIndex = 0;
    if (postIdStr) {
      const existingMedia = await db
        .select()
        .from(schema.media)
        .where(eq(schema.media.postId, postId));
      startIndex = existingMedia.length;
    }

    for (let i = 0; i < files.length; i++) {
      try {
        const mediaRecord = await processSingleFile(
          files[i], startIndex + i, db, s3, storageConfig, postId,
        );
        mediaRecords.push(mediaRecord);
      } catch (err) {
        // If it's a new post, clean it up. If appending, leave the post intact.
        if (!postIdStr) {
          await db.delete(schema.posts).where(eq(schema.posts.id, postId));
        }
        const message = err instanceof Error ? err.message : "File processing failed";
        return NextResponse.json(
          { error: `File "${files[i].name}": ${message}` },
          { status: 400 },
        );
      }
    }

    // Process tags (will quietly ignore duplicates because processTags handles it or we can just run it)
    if (!postIdStr) {
      processTags(db, postId, tagNames);
    }

    return NextResponse.json(
      {
        success: true,
        post: {
          id: postId,
          title: title.trim(),
          media: mediaRecords,
          tags: tagNames,
        },
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
