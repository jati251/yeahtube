/* eslint-disable */
import "dotenv/config";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { eq } from "drizzle-orm";

// Load .env.local on top of .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getDb, schema } from "./index";
import { getS3Client, getStorageConfig } from "../lib/storage";
import { enqueueTranscode } from "../lib/transcode-queue";

// Helper to check video mime/type
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

async function generateVideoAssets(
  buffer: Buffer,
  ext: string,
): Promise<{ thumbnailBuffer: Buffer; previewBuffer: Buffer | null; duration: number; width: number | null; height: number | null }> {
  const tmpDir = os.tmpdir();
  const uniqueId = uuidv4();
  const tmpInput = path.join(tmpDir, `yt-${uniqueId}${ext}`);
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
        const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
        if (videoStream) {
          if (videoStream.width) videoWidth = videoStream.width;
          if (videoStream.height) videoHeight = videoStream.height;
        }
        const seekTime = Math.max(0, Math.min(actualDuration * 0.1, actualDuration - 0.5, 10));

        const generatePreview = (onDone: () => void) => {
          if (actualDuration < 0.5) {
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
              onDone();
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

        tryThumbnail(
          seekTime,
          () => generatePreview(() => resolve()),
          () => {
            tryThumbnail(
              0,
              () => generatePreview(() => resolve()),
              () => {
                console.error("All thumbnail attempts failed");
                resolve();
              },
            );
          },
        );
      });
    });

    let thumbnailBuffer: Buffer;
    try {
      const pngBuffer = await fs.readFile(tmpThumbPng);
      thumbnailBuffer = await sharp(pngBuffer)
        .webp({ quality: 75 })
        .toBuffer();
    } catch (e) {
      console.error("Could not read/convert thumbnail PNG, generating fallback");
      thumbnailBuffer = await sharp({
        create: { width: 400, height: 225, channels: 3, background: { r: 30, g: 30, b: 30 } },
      }).webp({ quality: 50 }).toBuffer();
    }

    let previewBuffer: Buffer | null = null;
    try {
      previewBuffer = await fs.readFile(tmpPreview);
    } catch (e) {
      console.error("Could not read preview buffer");
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

async function main() {
  const seedDir = path.resolve(os.homedir(), "Downloads/seed-videos");
  console.log(`📂 Scanning folder: ${seedDir}`);

  if (!existsSync(seedDir)) {
    console.error(`❌ Folder does not exist: ${seedDir}`);
    process.exit(1);
  }

  const files = await fs.readdir(seedDir);
  const videoFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".mp4", ".webm", ".mov", ".avi"].includes(ext) && !f.endsWith(".part");
  });

  if (videoFiles.length === 0) {
    console.log("ℹ️ No valid video files found to seed.");
    process.exit(0);
  }

  console.log(`🌱 Found ${videoFiles.length} video files to seed.`);

  const db = getDb();
  const s3 = getS3Client();
  const storageConfig = getStorageConfig();

  // Find admin or first user in the system
  const [adminUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.isAdmin, 1))
    .limit(1);

  const [firstUser] = adminUser ? [adminUser] : await db.select().from(schema.users).limit(1);

  if (!firstUser) {
    console.error("❌ No users found in database. Please run db:seed first.");
    process.exit(1);
  }

  console.log(`👤 Using user: ${firstUser.username} (ID: ${firstUser.id}) to create posts.`);

  // Find or create "Videos" category
  let categoryId: number | null = null;
  const [videoCategory] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, "videos"))
    .limit(1);

  if (videoCategory) {
    categoryId = videoCategory.id;
  } else {
    // Try to get first available category
    const [fallbackCategory] = await db.select().from(schema.categories).limit(1);
    if (fallbackCategory) {
      categoryId = fallbackCategory.id;
    }
  }

  for (let i = 0; i < videoFiles.length; i++) {
    const filename = videoFiles[i];
    const filepath = path.join(seedDir, filename);
    const title = filename.replace(/\.[^/.]+$/, "");

    console.log(`\n🚀 [${i + 1}/${videoFiles.length}] Seeding: "${title}"...`);

    try {
      const fileBuffer = await fs.readFile(filepath);
      const ext = path.extname(filename).toLowerCase();
      
      let mimeType = "video/mp4";
      if (ext === ".webm") mimeType = "video/webm";
      if (ext === ".mov") mimeType = "video/quicktime";
      if (ext === ".avi") mimeType = "video/x-msvideo";

      const storageId = uuidv4();
      const storageFilename = `${storageId}${ext}`;
      const thumbnailFilename = `${storageId}_thumb.webp`;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const folderPath = `${year}/${month}`;

      const storageKey = `uploads/videos/${folderPath}/${storageFilename}`;
      const thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
      const previewKey = `previews/${folderPath}/${storageId}_preview.mp4`;

      console.log(`  - Uploading original video to S3...`);
      await s3.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: storageKey,
          Body: fileBuffer,
          ContentType: mimeType,
        }),
      );

      console.log(`  - Generating thumbnails & previews...`);
      const { thumbnailBuffer, previewBuffer, duration, width, height } = 
        await generateVideoAssets(fileBuffer, ext);

      console.log(`  - Uploading thumbnail to S3...`);
      await s3.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
        }),
      );

      if (previewBuffer) {
        console.log(`  - Uploading preview to S3...`);
        await s3.send(
          new PutObjectCommand({
            Bucket: storageConfig.bucket,
            Key: previewKey,
            Body: previewBuffer,
            ContentType: "video/mp4",
          }),
        );
      }

      console.log(`  - Inserting database records...`);
      const [newPost] = await db
        .insert(schema.posts)
        .values({
          userId: firstUser.id,
          title,
          categoryId,
        })
        .returning();

      const [mediaResult] = await db
        .insert(schema.media)
        .values({
          postId: newPost.id,
          storageKey,
          filename,
          mimeType,
          mediaType: "video",
          fileSize: fileBuffer.length,
          width,
          height,
          duration,
          thumbnailKey,
          previewKey: previewBuffer ? previewKey : null,
          orderIndex: 0,
        })
        .returning();

      try {
        await enqueueTranscode({
          mediaId: mediaResult.id,
          postId: newPost.id,
          storageKey,
          filename,
          mimeType,
          bucket: storageConfig.bucket,
          endpoint: storageConfig.endpoint,
          region: storageConfig.region,
          accessKey: storageConfig.accessKey,
          secretKey: storageConfig.secretKey,
          forcePathStyle: storageConfig.forcePathStyle ?? false,
        });
      } catch (queueErr: any) {
        console.error(`  ⚠️ Failed to enqueue transcode for media ID ${mediaResult.id}:`, queueErr.message);
      }

      console.log(`  ✅ Successfully seeded: "${title}" (Post ID: ${newPost.id})`);
    } catch (err) {
      console.error(`  ❌ Failed to seed "${filename}":`, err);
    }
  }

  console.log("\n🎉 Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding script crashed:", err);
  process.exit(1);
});
