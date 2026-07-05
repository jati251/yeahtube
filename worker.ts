/**
 * YeahTube Transcode Worker
 *
 * Runs alongside Next.js — picks up transcode jobs from Redis (BullMQ)
 * and generates lower-resolution video variants (720p, 480p) via ffmpeg.
 *
 * Usage:  npx tsx worker.ts
 */

import { Worker, Job } from "bullmq";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { Pool } from "pg";
import sharp from "sharp";

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
});

// ── Worker ────────────────────────────────────────────
const worker = new Worker<TranscodeJobData>(
  "yeahtube-transcode",
  async (job: Job<TranscodeJobData>) => {
    const {
      mediaId, postId, storageKey, filename, mimeType,
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
    const ext = path.extname(filename);
    const tmpInput = path.join(tmpDir, `yt-asset-${uniqueId}${ext}`);
    
    // Derived keys for S3
    const now = new Date();
    const folderPath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thumbnailFilename = `${uniqueId}_thumb.webp`;
    const thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
    const previewKey = `previews/${folderPath}/${uniqueId}_preview.mp4`;

    const thumbBasename = `yt-thumb-${uniqueId}`;
    const tmpThumbPng = path.join(tmpDir, `${thumbBasename}.png`);
    const tmpPreview = path.join(tmpDir, `yt-preview-${uniqueId}.mp4`);

    try {
      // Download original from S3
      console.log(`[Worker] Downloading ${storageKey}...`);
      const { Body } = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
      );
      if (!Body) throw new Error("Empty body from S3");

      const chunks: Buffer[] = [];
      const reader = Body as AsyncIterable<Uint8Array>;
      for await (const chunk of reader) {
        chunks.push(Buffer.from(chunk));
      }
      await fs.writeFile(tmpInput, Buffer.concat(chunks));

      console.log(`[Worker] Extracting metadata and generating assets...`);
      
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
                console.error("[Worker] Preview generation failed:", previewErr.message);
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
                console.error(`[Worker] Thumbnail at t=${time} failed:`, e.message);
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
                  console.error("[Worker] All thumbnail attempts failed");
                  resolve();
                },
              );
            },
          );
        });
      });

      // Convert PNG to WebP
      let thumbnailBuffer: Buffer;
      try {
        const pngBuffer = await fs.readFile(tmpThumbPng);
        thumbnailBuffer = await sharp(pngBuffer)
          .webp({ quality: 75 })
          .toBuffer();
      } catch (e) {
        console.error("[Worker] Could not read/convert thumbnail PNG, generating fallback");
        thumbnailBuffer = await sharp({
          create: { width: 400, height: 225, channels: 3, background: { r: 30, g: 30, b: 30 } },
        }).webp({ quality: 50 }).toBuffer();
      }

      console.log(`[Worker] Uploading thumbnail...`);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
        }),
      );

      let finalPreviewKey: string | null = null;
      try {
        const previewBuffer = await fs.readFile(tmpPreview);
        console.log(`[Worker] Uploading preview...`);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: previewKey,
            Body: previewBuffer,
            ContentType: "video/mp4",
          }),
        );
        finalPreviewKey = previewKey;
      } catch (e) {
        console.error("[Worker] Could not read preview buffer (preview may not have been generated)");
      }

      console.log(`[Worker] Updating media record #${mediaId}...`);
      await pool.query(
        `UPDATE media SET width = $1, height = $2, duration = $3, thumbnail_key = $4, preview_key = $5 WHERE id = $6`,
        [videoWidth, videoHeight, actualDuration, thumbnailKey, finalPreviewKey, mediaId]
      );

      console.log(`[Worker] ✅ Video assets generated successfully for media #${mediaId}`);
    } catch (err) {
      console.error(`[Worker] ❌ Asset generation failed for media #${mediaId}:`, err);
      throw err;
    } finally {
      for (const f of [tmpInput, tmpThumbPng, tmpPreview]) {
        try { await fs.unlink(f); } catch {}
      }
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 1,
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

console.log("[Worker] YeahTube video asset worker started, waiting for jobs...");
