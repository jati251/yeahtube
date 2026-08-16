/**
 * YeahTube Transcode Worker
 *
 * Runs alongside Next.js — picks up transcode jobs from Redis (BullMQ)
 * and generates lower-resolution video variants (720p, 480p) via ffmpeg.
 *
 * Usage:  npx tsx worker.ts
 */

import "./db/env";
import { Worker, Job } from "bullmq";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { Pool } from "pg";
import sharp from "sharp";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";

// ── Types ─────────────────────────────────────────────
interface TranscodeJobData {
  mediaId: number;
  postId: number;
  storageKey: string;
  filename: string;
  mimeType: string;
  bucket: string;
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
}

// ── Redis Connection ──────────────────────────────────
function getRedisConnection() {
  const url = process.env.REDIS_URL || "redis://:strongpassword123@cekcok-redis:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

// ── DB Pool ───────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
});

pool.on("error", (err) => {
  // Prevent unhandled error event from crashing worker during long transcoding processes
  console.warn("[Worker] PostgreSQL idle connection event (auto-recovering):", err.message);
});

// ── Worker ────────────────────────────────────────────
const worker = new Worker<TranscodeJobData>(
  "yeahtube-transcode",
  async (job: Job<TranscodeJobData>) => {
    const {
      mediaId, postId, storageKey,
      bucket, endpoint, region, accessKey, secretKey, forcePathStyle,
    } = job.data;

    console.log(`[Worker] Processing video assets for media #${mediaId} (post #${postId})`);

    const s3 = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle,
    });

    const tmpDir = os.tmpdir();
    const uniqueId = uuidv4();
    
    // Derived keys for S3
    const now = new Date();
    const folderPath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thumbnailFilename = `${uniqueId}_thumb.webp`;
    const thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
    const previewKey = `previews/${folderPath}/${uniqueId}_preview.mp4`;

    const thumbBasename = `yt-thumb-${uniqueId}`;
    const tmpThumbPng = path.join(tmpDir, `${thumbBasename}.png`);
    const tmpPreview = path.join(tmpDir, `yt-preview-${uniqueId}.mp4`);
    const tmpAv1Output = path.join(tmpDir, `yt-av1-${uniqueId}.mp4`);

    const newStorageKey = `uploads/videos/${folderPath}/${uniqueId}_av1.mp4`;

    try {
      console.log(`[Worker] Generating presigned URL for HTTP Range Streaming...`);
      const presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
        { expiresIn: 3600 }
      );

      console.log(`[Worker] [1/5] Probing video metadata...`);
      
      let actualDuration = 0;
      let videoWidth: number | null = null;
      let videoHeight: number | null = null;
      let hasAudio = false;

      const metadata: FfprobeData = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(presignedUrl, (err, meta) => (err ? reject(err) : resolve(meta)));
      });

      actualDuration = metadata.format.duration || 0;
      const videoStream = metadata.streams?.find((s) => s.codec_type === "video");
      const audioStream = metadata.streams?.find((s) => s.codec_type === "audio");
      if (videoStream) {
        if (videoStream.width) videoWidth = videoStream.width;
        if (videoStream.height) videoHeight = videoStream.height;
      }
      hasAudio = Boolean(audioStream);

      console.log(`[Worker] [2/5] ⚡ Full SVT-AV1 transcoding (preset 8, CRF 30)...`);
      const startEncode = Date.now();

      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg(presignedUrl)
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
          .output(tmpAv1Output)
          .on("end", () => {
            const elapsed = ((Date.now() - startEncode) / 1000).toFixed(1);
            console.log(`[Worker]       ✅ SVT-AV1 encode finished in ${elapsed}s`);
            resolve();
          })
          .on("error", (err) => {
            console.error(`[Worker]       ❌ SVT-AV1 encode error:`, err.message);
            reject(err);
          })
          .run();
      });

      console.log(`[Worker] [3/5] 🖼️  Generating WebP thumbnail & preview clip...`);
      const seekTime = Math.max(0, Math.min(actualDuration * 0.1, actualDuration - 0.5, 10));

      // Extract Thumbnail
      await new Promise<void>((resolve) => {
        ffmpeg(tmpAv1Output)
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
        thumbnailBuffer = await sharp(pngBuffer)
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        thumbnailBuffer = await sharp({
          create: { width: 400, height: 225, channels: 3, background: { r: 30, g: 30, b: 30 } },
        }).webp({ quality: 50 }).toBuffer();
      }

      // Extract Preview Clip
      const previewDuration = Math.min(3, Math.max(0.5, actualDuration - seekTime));
      await new Promise<void>((resolve) => {
        ffmpeg(tmpAv1Output)
          .setStartTime(seekTime)
          .setDuration(previewDuration)
          .videoFilters("scale='min(360,iw)':-2")
          .noAudio()
          .videoCodec("libx264")
          .outputOptions(["-preset veryfast", "-crf 30", "-movflags +faststart", "-pix_fmt yuv420p"])
          .output(tmpPreview)
          .on("end", () => resolve())
          .on("error", () => resolve())
          .run();
      });

      console.log(`[Worker] [4/5] ☁️  Uploading AV1 master video, thumbnail & preview to S3...`);
      const av1Stat = await fs.stat(tmpAv1Output);
      const av1Buffer = await fs.readFile(tmpAv1Output);
      const newFileSize = av1Stat.size;

      // Upload AV1 Video
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: newStorageKey,
          Body: av1Buffer,
          ContentType: "video/mp4",
        }),
      );

      // Upload Thumbnail
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
        }),
      );

      // Upload Preview
      let finalPreviewKey: string | null = null;
      try {
        const previewBuffer = await fs.readFile(tmpPreview);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: previewKey,
            Body: previewBuffer,
            ContentType: "video/mp4",
          }),
        );
        finalPreviewKey = previewKey;
      } catch {
        console.error("[Worker] Preview upload skipped");
      }

      console.log(`[Worker] [5/5] 🗄️  Updating database & purging old raw upload...`);

      // Safely delete old raw uncompressed upload from S3 if key changed
      if (storageKey !== newStorageKey) {
        try {
          const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
          await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
          console.log(`[Worker]       🗑️ Deleted uncompressed raw upload: ${storageKey}`);
        } catch (delErr) {
          console.warn(`[Worker]       ⚠️ Could not delete old raw upload:`, delErr);
        }
      }

      // Update database record
      await pool.query(
        `UPDATE media SET 
          storage_key = $1, 
          file_size = $2, 
          width = $3, 
          height = $4, 
          duration = $5, 
          thumbnail_key = $6, 
          preview_key = $7 
         WHERE id = $8`,
        [newStorageKey, newFileSize, videoWidth, videoHeight, actualDuration, thumbnailKey, finalPreviewKey, mediaId]
      );

      // Invalidate Redis feed & post cache so UI immediately reflects updated metadata
      try {
        const { invalidatePostCache, invalidateFeedCache } = await import("./lib/cache");
        await invalidatePostCache(postId);
        await invalidateFeedCache();
      } catch {
        // Silently continue if Redis helper is unavailable in standalone worker context
      }

      console.log(`[Worker] ✅ Video #${mediaId} successfully transcoded to AV1 and replaced! (Size: ${(newFileSize / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (err) {
      console.error(`[Worker] ❌ Asset generation failed for media #${mediaId}:`, err);
      throw err;
    } finally {
      for (const f of [tmpAv1Output, tmpThumbPng, tmpPreview]) {
        try { await fs.unlink(f); } catch {}
      }
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 4,
    stalledInterval: 30000,
  },
);

// ── Shutdown ──────────────────────────────────────────
async function shutdown() {
  console.log("[Worker] Shutting down...");
  await worker.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[Worker] YeahTube video asset worker started (concurrency: 4), waiting for jobs...");
