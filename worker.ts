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
import { spawn } from "child_process";
import { Pool } from "pg";

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

interface TranscodeTarget {
  label: string;
  height: number;
}

const TARGETS: TranscodeTarget[] = [
  { label: "720p", height: 720 },
  { label: "480p", height: 480 },
];

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

    console.log(`[Worker] Processing transcode for media #${mediaId} (post #${postId})`);

    const s3 = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle,
    });

    const tmpDir = os.tmpdir();
    const uniqueId = uuidv4();
    const ext = path.extname(filename);
    const tmpInput = path.join(tmpDir, `yt-transcode-${uniqueId}${ext}`);

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

      // Get original dimensions via ffprobe
      const originalHeight = await getVideoHeight(tmpInput);
      console.log(`[Worker] Original height: ${originalHeight}px`);

      const applicableTargets = TARGETS.filter((t) => t.height < originalHeight);

      if (applicableTargets.length === 0) {
        console.log(`[Worker] Video is already low-res (${originalHeight}px), skipping`);
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const folderPath = `${year}/${month}`;

      for (const target of applicableTargets) {
        const transcodeId = uuidv4();
        const outputFilename = `${transcodeId}.mp4`;
        const outputKey = `uploads/videos/${folderPath}/${outputFilename}`;
        const tmpOutput = path.join(tmpDir, `yt-transcode-${transcodeId}.mp4`);

        console.log(`[Worker] Transcoding ${target.label} (${target.height}p)...`);

        await transcodeVideo(tmpInput, tmpOutput, target.height);

        const outputBuffer = await fs.readFile(tmpOutput);
        const fileSize = outputBuffer.length;

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: outputKey,
            Body: outputBuffer,
            ContentType: "video/mp4",
          }),
        );

        // Get next orderIndex
        const { rows } = await pool.query(
          `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_index FROM media WHERE post_id = $1`,
          [postId],
        );
        const nextIndex = rows[0]?.next_index ?? 0;

        // Insert new media record
        await pool.query(
          `INSERT INTO media (post_id, storage_key, filename, mime_type, media_type, file_size, width, height, duration, thumbnail_key, preview_key, order_index, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            postId, outputKey, `${target.label} - ${filename}`, "video/mp4",
            "video", fileSize, Math.round((target.height / 9) * 16), target.height,
            null, null, null, nextIndex,
          ],
        );

        console.log(`[Worker] ✅ ${target.label} done — ${(fileSize / 1024 / 1024).toFixed(1)}MB`);

        try { await fs.unlink(tmpOutput); } catch {}
      }
    } catch (err) {
      console.error(`[Worker] ❌ Transcode failed for media #${mediaId}:`, err);
      throw err;
    } finally {
      try { await fs.unlink(tmpInput); } catch {}
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 1,
    stalledInterval: 30000,
  },
);

// ── Helpers ───────────────────────────────────────────

function getVideoHeight(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=height", "-of", "csv=p=0", filePath,
    ]);
    let output = "";
    ffprobe.stdout.on("data", (d: Buffer) => { output += d.toString(); });
    ffprobe.on("close", () => resolve(parseInt(output.trim(), 10) || 0));
    ffprobe.on("error", () => resolve(0));
  });
}

function transcodeVideo(inputPath: string, outputPath: string, targetHeight: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i", inputPath,
      "-vf", `setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709,scale=-2:${targetHeight}`,
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", "-pix_fmt", "yuv420p",
      "-y", outputPath,
    ]);

    let stderr = "";
    ffmpeg.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    ffmpeg.on("close", (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-200)}`));
    });
    ffmpeg.on("error", reject);
  });
}

// ── Shutdown ──────────────────────────────────────────
async function shutdown() {
  console.log("[Worker] Shutting down...");
  await worker.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[Worker] YeahTube transcode worker started, waiting for jobs...");
