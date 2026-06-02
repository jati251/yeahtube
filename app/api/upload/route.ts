import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getS3Client, StoragePaths, getStorageConfig } from "@/lib/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { validateMagicBytes, validateExtension } from "@/lib/magic-bytes";
import { requireCsrf } from "@/lib/csrf";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { eq, and } from "drizzle-orm";

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

async function generateVideoThumbnail(
  buffer: Buffer,
  ext: string,
): Promise<{ thumbnailBuffer: Buffer; duration: number }> {
  // For video thumbnails, we need ffmpeg
  // Save to temp file, extract frame, then clean up
  const tmpDir = os.tmpdir();
  const tmpInput = path.join(tmpDir, `yt-${uuidv4()}${ext}`);
  const tmpOutput = path.join(tmpDir, `yt-thumb-${uuidv4()}.webp`);

  try {
    await fs.writeFile(tmpInput, buffer);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = require("fluent-ffmpeg") as any;

      ffmpeg.ffprobe(tmpInput, (err: any, metadata: any) => {
        if (err) return reject(err);

        const durationSecs = metadata.format.duration || 0;
        const seekTime = Math.min(durationSecs * 0.1, 10);

        ffmpeg(tmpInput)
          .screenshots({
            count: 1,
            folder: tmpDir,
            filename: path.basename(tmpOutput),
            timemarks: [seekTime],
            size: "400x?",
          })
          .on("end", () => resolve())
          .on("error", reject);
      });
    });

    const thumbnailBuffer = await fs.readFile(tmpOutput);

    return {
      thumbnailBuffer,
      duration: 0, // Will be set by ffprobe above
    };
  } finally {
    // Cleanup temp files
    try {
      await fs.unlink(tmpInput);
    } catch {}
    try {
      await fs.unlink(tmpOutput);
    } catch {}
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
    const description = (formData.get("description") as string) || "";
    const categorySlug = formData.get("category") as string | null;
    const tagsRaw = formData.get("tags") as string;

    // Validate title
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
      const cat = db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, categorySlug))
        .get();
      if (cat) categoryId = cat.id;
    }

    // Create post
    const postResult = db
      .insert(schema.posts)
      .values({
        userId: user.id,
        categoryId,
        title: title.trim(),
        description: description.trim(),
      })
      .run();

    const postId = Number(postResult.lastInsertRowid);

    // Process each file
    const mediaRecords = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // ── Magic byte validation ───────────────────────────
      // Verify the file's actual content matches the claimed MIME type.
      // This prevents MIME spoofing attacks (e.g. uploading a script
      // disguised as image/jpeg).
      if (!validateMagicBytes(fileBuffer, file.type)) {
        db.delete(schema.posts).where(eq(schema.posts.id, postId)).run();
        return NextResponse.json(
          {
            error: `File "${file.name}" has invalid content signature. Expected ${file.type}.`,
          },
          { status: 400 },
        );
      }

      // ── Extension validation ────────────────────────────
      // Verify the file extension matches the claimed MIME type.
      // Prevents attacks like `shell.php.jpg` being treated as JPEG.
      if (!validateExtension(file.name, file.type)) {
        db.delete(schema.posts).where(eq(schema.posts.id, postId)).run();
        return NextResponse.json(
          {
            error: `File "${file.name}" has an extension that does not match its content type.`,
          },
          { status: 400 },
        );
      }

      // Validate file type
      const mediaType = determineMediaType(file.type);

      // Validate file size
      const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (fileBuffer.length > maxSize) {
        // Clean up post
        db.delete(schema.posts).where(eq(schema.posts.id, postId)).run();
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds ${mediaType === "image" ? "20MB" : "500MB"} limit`,
          },
          { status: 400 },
        );
      }

      const ext = getExtension(file.name);
      const storageId = uuidv4();
      const storageFilename = `${storageId}${ext}`;
      const thumbnailFilename = `${storageId}_thumb.webp`;

      // Determine storage key
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const folderPath = `${year}/${month}`;

      let storageKey: string;
      let thumbnailKey: string | null = null;
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
          // Non-fatal: continue without thumbnail
        }
      } else {
        // Video thumbnail
        try {
          const { thumbnailBuffer, duration: dur } =
            await generateVideoThumbnail(fileBuffer, ext);
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
        } catch (thumbError) {
          console.error("Video thumbnail generation failed:", thumbError);
          // Non-fatal
        }
      }

      // Get media duration from ffprobe (already done in generateVideoThumbnail)
      // For now, try ffprobe separately if we need duration
      if (mediaType === "video" && duration === null) {
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

      // Insert media record
      const mediaResult = db
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
          orderIndex: i,
        })
        .run();

      mediaRecords.push({
        id: Number(mediaResult.lastInsertRowid),
        storageKey,
        filename: file.name,
        mimeType: file.type,
        mediaType,
        fileSize: fileBuffer.length,
        width,
        height,
        duration,
        thumbnailKey,
        orderIndex: i,
      });
    }

    // Process tags
    for (const tagName of tagNames) {
      const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      if (!slug) continue;

      // Find or create tag
      let tag = db
        .select()
        .from(schema.tags)
        .where(eq(schema.tags.slug, slug))
        .get();

      if (!tag) {
        const tagResult = db
          .insert(schema.tags)
          .values({ name: tagName.trim(), slug })
          .run();
        tag = {
          id: Number(tagResult.lastInsertRowid),
          name: tagName.trim(),
          slug,
          createdAt: new Date().toISOString(),
        };
      }

      // Create post-tag association
      db.insert(schema.postTags)
        .values({ postId, tagId: tag.id })
        .run();
    }

    return NextResponse.json(
      {
        success: true,
        post: {
          id: postId,
          title: title.trim(),
          description: description.trim(),
          media: mediaRecords,
          tags: tagNames,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
      },
      { status: 500 },
    );
  }
}
