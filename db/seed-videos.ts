/* eslint-disable */
import "./env";
import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { eq, asc } from "drizzle-orm";

import readline from "readline/promises";
import { getDb, schema } from "./index";
import { getS3Client, getStorageConfig } from "../lib/storage";

import { generateYouTubeId } from "../lib/slug";

// Helper to check video mime/type
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mp2t",
  "video/ts",
  "video/x-mpegts",
];

async function generateVideoAssets(
  buffer: Buffer,
  ext: string,
): Promise<{
  av1Buffer: Buffer;
  av1FileSize: number;
  thumbnailBuffer: Buffer;
  previewBuffer: Buffer | null;
  duration: number;
  width: number | null;
  height: number | null;
}> {
  const tmpDir = os.tmpdir();
  const uniqueId = uuidv4();
  const tmpInput = path.join(tmpDir, `yt-${uniqueId}${ext}`);
  const tmpAv1 = path.join(tmpDir, `yt-av1-${uniqueId}.mp4`);
  const thumbBasename = `yt-thumb-${uniqueId}`;
  const tmpThumbPng = path.join(tmpDir, `${thumbBasename}.png`);
  const tmpPreview = path.join(tmpDir, `yt-preview-${uniqueId}.mp4`);

  try {
    await fs.writeFile(tmpInput, buffer);

    let actualDuration = 0;
    let videoWidth: number | null = null;
    let videoHeight: number | null = null;
    let hasAudio = false;

    const ffmpeg = require("fluent-ffmpeg") as typeof import("fluent-ffmpeg");

    await new Promise<void>((resolve, reject) => {
      ffmpeg.ffprobe(tmpInput, (err: any, metadata: any) => {
        if (err) return reject(err);

        actualDuration = metadata.format.duration || 0;
        const videoStream = metadata.streams?.find(
          (s: any) => s.codec_type === "video",
        );
        const audioStream = metadata.streams?.find(
          (s: any) => s.codec_type === "audio",
        );
        if (videoStream) {
          if (videoStream.width) videoWidth = videoStream.width;
          if (videoStream.height) videoHeight = videoStream.height;
        }
        hasAudio = Boolean(audioStream);
        resolve();
      });
    });

    console.log(`    ⚡ Encoding to SVT-AV1 (preset 8, CRF 30)...`);
    const startEncode = Date.now();

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(tmpInput)
        .videoCodec("libsvtav1")
        .outputOptions([
          "-preset 8",
          "-crf 30",
          "-pix_fmt yuv420p10le",
          "-svtav1-params tune=0:fast-decode=1",
          "-movflags +faststart",
        ]);

      if (hasAudio) {
        cmd.audioCodec("aac").audioBitrate("128k");
      } else {
        cmd.noAudio();
      }

      cmd
        .output(tmpAv1)
        .on("end", () => {
          const elapsed = ((Date.now() - startEncode) / 1000).toFixed(1);
          console.log(`    ✅ SVT-AV1 encode finished in ${elapsed}s`);
          resolve();
        })
        .on("error", (err: any) => {
          console.error(`    ❌ SVT-AV1 encode error:`, err.message);
          reject(err);
        })
        .run();
    });

    console.log(`    🖼️  Generating thumbnail & preview clip...`);
    const seekTime = Math.max(
      0,
      Math.min(actualDuration * 0.1, actualDuration - 0.5, 10),
    );

    // Thumbnail
    await new Promise<void>((resolve) => {
      ffmpeg(tmpAv1)
        .seekInput(seekTime)
        .frames(1)
        .videoFilters("scale=400:-2")
        .output(tmpThumbPng)
        .outputOptions(["-update", "1"])
        .on("end", () => resolve())
        .on("error", () => resolve())
        .run();
    });

    let thumbnailBuffer: Buffer;
    try {
      const pngBuffer = await fs.readFile(tmpThumbPng);
      thumbnailBuffer = await sharp(pngBuffer).webp({ quality: 80 }).toBuffer();
    } catch {
      thumbnailBuffer = await sharp({
        create: {
          width: 400,
          height: 225,
          channels: 3,
          background: { r: 30, g: 30, b: 30 },
        },
      })
        .webp({ quality: 50 })
        .toBuffer();
    }

    // Preview
    const previewDuration = Math.min(
      3,
      Math.max(0.5, actualDuration - seekTime),
    );
    await new Promise<void>((resolve) => {
      ffmpeg(tmpAv1)
        .setStartTime(seekTime)
        .setDuration(previewDuration)
        .videoFilters("scale='min(360,iw)':-2")
        .noAudio()
        .videoCodec("libx264")
        .outputOptions([
          "-preset veryfast",
          "-crf 30",
          "-movflags +faststart",
          "-pix_fmt yuv420p",
        ])
        .output(tmpPreview)
        .on("end", () => resolve())
        .on("error", () => resolve())
        .run();
    });

    let previewBuffer: Buffer | null = null;
    try {
      previewBuffer = await fs.readFile(tmpPreview);
    } catch {}

    const av1Stat = await fs.stat(tmpAv1);
    const av1Buffer = await fs.readFile(tmpAv1);

    return {
      av1Buffer,
      av1FileSize: av1Stat.size,
      thumbnailBuffer,
      previewBuffer,
      duration: actualDuration,
      width: videoWidth,
      height: videoHeight,
    };
  } finally {
    for (const f of [tmpInput, tmpAv1, tmpThumbPng, tmpPreview]) {
      try {
        await fs.unlink(f);
      } catch {}
    }
  }
}

async function cleanDuplicates() {
  console.log("\n🔍 Checking for duplicate posts before seeding...");
  const db = getDb();
  const s3 = getS3Client();
  const storageConfig = getStorageConfig();

  const allPosts = await db
    .select()
    .from(schema.posts)
    .orderBy(asc(schema.posts.id));
  const titleGroups = new Map<string, typeof allPosts>();

  for (const post of allPosts) {
    const title = post.title.trim().toLowerCase();
    if (!titleGroups.has(title)) titleGroups.set(title, []);
    titleGroups.get(title)!.push(post);
  }

  let deletedCount = 0;
  for (const [title, posts] of titleGroups.entries()) {
    if (posts.length > 1) {
      console.log(
        `Found duplicate title: "${posts[0].title}" (${posts.length} copies)`,
      );
      const keepPost = posts[0];
      const duplicatesToDelete = posts.slice(1);
      console.log(`  Keeping Post ID: ${keepPost.id}`);

      for (const dup of duplicatesToDelete) {
        console.log(`  Deleting Post ID: ${dup.id}...`);
        const mediaFiles = await db
          .select()
          .from(schema.media)
          .where(eq(schema.media.postId, dup.id));
        for (const m of mediaFiles) {
          try {
            console.log(`    - Deleting S3 key: ${m.storageKey}`);
            await s3.send(
              new DeleteObjectCommand({
                Bucket: storageConfig.bucket,
                Key: m.storageKey,
              }),
            );
            if (m.thumbnailKey) {
              console.log(`    - Deleting S3 key: ${m.thumbnailKey}`);
              await s3.send(
                new DeleteObjectCommand({
                  Bucket: storageConfig.bucket,
                  Key: m.thumbnailKey,
                }),
              );
            }
            if (m.previewKey) {
              console.log(`    - Deleting S3 key: ${m.previewKey}`);
              await s3.send(
                new DeleteObjectCommand({
                  Bucket: storageConfig.bucket,
                  Key: m.previewKey,
                }),
              );
            }
          } catch (s3Err) {
            console.error(
              `    ❌ S3 Delete failed for media ID ${m.id}:`,
              s3Err,
            );
          }
        }
        await db.delete(schema.posts).where(eq(schema.posts.id, dup.id));
        console.log(`    ✅ Deleted Post ID: ${dup.id} from DB`);
        deletedCount++;
      }
    }
  }

  if (deletedCount > 0) {
    console.log(
      `🎉 Duplicate cleanup finished. Deleted ${deletedCount} duplicate post(s).\n`,
    );
  } else {
    console.log("✅ No duplicates found.\n");
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
    return (
      [".mp4", ".webm", ".mov", ".avi", ".ts"].includes(ext) &&
      !f.endsWith(".part")
    );
  });

  if (videoFiles.length === 0) {
    console.log("ℹ️ No valid video files found to seed.");
    process.exit(0);
  }

  console.log(`🌱 Found ${videoFiles.length} video files to seed.`);

  await cleanDuplicates();

  const db = getDb();
  const s3 = getS3Client();
  const storageConfig = getStorageConfig();

  // Resolve channel: CLI args or Interactive prompt
  let channel: "public" | "private" = "public";
  const hasExplicitPublic =
    process.argv.includes("--public") ||
    process.argv.includes("--non-logged") ||
    process.argv.some((arg) => arg.toLowerCase() === "--channel=public");
  const hasExplicitPrivate =
    process.argv.includes("--private") ||
    process.argv.some((arg) => arg.toLowerCase() === "--channel=private");

  if (hasExplicitPrivate) {
    channel = "private";
  } else if (hasExplicitPublic) {
    channel = "public";
  } else if (process.stdout.isTTY && !process.env.CI) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log(`
📺 Pilih Channel / Visibilitas Video Seed:
  1) Public / Non-Logged Channel (Bisa ditonton pengunjung tanpa login) [Default]
  2) Private Personal Channel (Hanya akun login / pemilik yang bisa akses)
`);
    const ans = (
      await rl.question("Pilih nomor [1-2, default: 1]: ")
    ).trim();
    rl.close();
    channel = ans === "2" ? "private" : "public";
  }

  console.log(`\n📺 Seeding to channel: [${channel.toUpperCase()}] (${channel === "public" ? "Non-Logged & Public" : "Private"})\n`);

  // Find admin or first user in the system
  const [adminUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.isAdmin, 1))
    .limit(1);

  const [firstUser] = adminUser
    ? [adminUser]
    : await db.select().from(schema.users).limit(1);

  if (!firstUser) {
    console.error("❌ No users found in database. Please run db:seed first.");
    process.exit(1);
  }

  console.log(
    `👤 Using user: ${firstUser.username} (ID: ${firstUser.id}) to create posts.`,
  );

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
    const [fallbackCategory] = await db
      .select()
      .from(schema.categories)
      .limit(1);
    if (fallbackCategory) {
      categoryId = fallbackCategory.id;
    }
  }

  for (let i = 0; i < videoFiles.length; i++) {
    const filename = videoFiles[i];
    const filepath = path.join(seedDir, filename);
    const title = filename.replace(/\.[^/.]+$/, "");

    console.log(`\n🚀 [${i + 1}/${videoFiles.length}] Seeding: "${title}"...`);

    // Check for duplicates
    const [existingMedia] = await db
      .select()
      .from(schema.media)
      .where(eq(schema.media.filename, filename))
      .limit(1);

    if (existingMedia) {
      console.log(`  ⏭️  Skipping: "${filename}" already exists in database.`);
      continue;
    }

    let uploadedS3Keys: string[] = [];

    try {
      const fileBuffer = await fs.readFile(filepath);
      const ext = path.extname(filename).toLowerCase();

      let mimeType = "video/mp4";
      if (ext === ".webm") mimeType = "video/webm";
      if (ext === ".mov") mimeType = "video/quicktime";
      if (ext === ".avi") mimeType = "video/x-msvideo";
      if (ext === ".ts") mimeType = "video/mp2t";

      const storageId = uuidv4();
      const thumbnailFilename = `${storageId}_thumb.webp`;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const folderPath = `${year}/${month}`;

      const storageKey = `uploads/videos/${folderPath}/${storageId}_av1.mp4`;
      const thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
      const previewKey = `previews/${folderPath}/${storageId}_preview.mp4`;

      console.log(`  - Transcoding to AV1 & generating assets...`);
      const {
        av1Buffer,
        av1FileSize,
        thumbnailBuffer,
        previewBuffer,
        duration,
        width,
        height,
      } = await generateVideoAssets(fileBuffer, ext);

      console.log(
        `  - Uploading AV1 video to S3 (${(av1FileSize / (1024 * 1024)).toFixed(2)} MB)...`,
      );
      await s3.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: storageKey,
          Body: av1Buffer,
          ContentType: "video/mp4",
        }),
      );
      uploadedS3Keys.push(storageKey);

      console.log(`  - Uploading thumbnail to S3...`);
      await s3.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
        }),
      );
      uploadedS3Keys.push(thumbnailKey);

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
        uploadedS3Keys.push(previewKey);
      }

      console.log(`  - Inserting database records...`);
      const slug = generateYouTubeId(11);
      const [newPost] = await db
        .insert(schema.posts)
        .values({
          userId: firstUser.id,
          slug,
          title,
          categoryId,
          channel,
        })
        .returning();

      const [mediaResult] = await db
        .insert(schema.media)
        .values({
          postId: newPost.id,
          storageKey,
          filename,
          mimeType: "video/mp4",
          mediaType: "video",
          fileSize: av1FileSize,
          width,
          height,
          duration,
          thumbnailKey,
          previewKey: previewBuffer ? previewKey : null,
          orderIndex: 0,
        })
        .returning();

      console.log(
        `  ✅ Successfully seeded: "${title}" (Post ID: ${newPost.id})`,
      );
    } catch (err) {
      console.error(`  ❌ Failed to seed "${filename}":`, err);

      // Cleanup S3 on failure
      if (typeof uploadedS3Keys !== "undefined" && uploadedS3Keys.length > 0) {
        console.log(`  🧹 Cleaning up partial S3 uploads...`);
        for (const key of uploadedS3Keys) {
          try {
            await s3.send(
              new DeleteObjectCommand({
                Bucket: storageConfig.bucket,
                Key: key,
              }),
            );
          } catch (e) {
            console.error(`    ⚠️ Failed to delete ${key} during cleanup`);
          }
        }
      }
    }
  }

  // Invalidate Redis feed & taxonomy cache so newly seeded posts appear immediately
  try {
    const { invalidateFeedCache, invalidateTaxonomyCache } =
      await import("../lib/cache");
    await invalidateFeedCache();
    await invalidateTaxonomyCache();
    console.log("  ⚡ Redis cache purged successfully.");
  } catch {
    // Silently continue if Redis is not running
  }

  console.log("\n🎉 Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding script crashed:", err);
  process.exit(1);
});
