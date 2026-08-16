/**
 * YeahTube Transcode Worker CLI
 *
 * Runs alongside Next.js — picks up transcode jobs from Redis (BullMQ)
 * and generates modern optimized video variants, WebP thumbnails & preview clips.
 *
 * Usage:  npm run worker [options]
 */

import "./db/env";
import readline from "readline/promises";
import { Worker, Job, Queue } from "bullmq";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { Pool } from "pg";
import sharp from "sharp";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";

// ── Help Banner ───────────────────────────────────────
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                🎬 YeahTube Transcode Worker CLI                 ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
  npm run worker -- [options]

Options:
  -c, --concurrency <number>   Jumlah video diproses paralel (1-16, Default: 2)
  -e, --encoder <type>         Pilihan encoder video:
                               • svtav1      : SVT-AV1 CPU (Paling hemat storage) [Default]
                               • nvenc       : NVIDIA GPU HEVC (RTX/GTX - Super kilat)
                               • qsv         : Intel QuickSync GPU (Intel Core i3/i5/i7/i9)
                               • videotoolbox: Apple Silicon Mac GPU (M1/M2/M3/M4)
                               • x264        : Universal H.264 CPU
  -i, --interactive            Jalankan wizard interaktif (tanya setting langkah demi langkah)
  -h, --help                   Tampilkan panduan bantuan ini

Examples:
  npm run worker                             # Default: SVT-AV1 CPU, 2 Concurrency
  npm run worker -- -c 4 --encoder nvenc     # 4 Video Paralel via GPU RTX 3080 Ti
  npm run worker -- -c 2 --encoder qsv       # Intel QuickSync di server Intel i5
  npm run worker -- -i                       # Mode Wizard Interaktif
`);
  process.exit(0);
}

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  showHelp();
}

type EncoderType = "svtav1" | "nvenc" | "qsv" | "videotoolbox" | "x264";

interface WorkerConfig {
  concurrency: number;
  encoder: EncoderType;
}

// ── Interactive Wizard / CLI Args Parser ──────────────
async function resolveConfig(): Promise<WorkerConfig> {
  const isInteractive = process.argv.includes("-i") || process.argv.includes("--interactive");

  if (isInteractive && process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║               🧙 YeahTube Worker Setup Wizard                    ║
╚══════════════════════════════════════════════════════════════════╝
`);

    console.log("Pilih Hardware / Encoder Video:");
    console.log("  1) SVT-AV1 (CPU) - Paling hemat storage 30-50% [Direkomendasikan]");
    console.log("  2) NVIDIA NVENC (GPU RTX/GTX) - Super kilat 400-800 FPS");
    console.log("  3) Intel QuickSync QSV (Intel Core i3/i5/i7/i9 Hardware Encoder)");
    console.log("  4) Apple VideoToolbox (Mac M1/M2/M3/M4 GPU)");
    console.log("  5) Universal H.264 (libx264 CPU)");

    const encoderAns = (await rl.question("\nPilih nomor [1-5, Default: 1]: ")).trim();
    let encoder: EncoderType = "svtav1";
    if (encoderAns === "2") encoder = "nvenc";
    else if (encoderAns === "3") encoder = "qsv";
    else if (encoderAns === "4") encoder = "videotoolbox";
    else if (encoderAns === "5") encoder = "x264";

    const defaultConcurrency = encoder === "nvenc" || encoder === "qsv" ? 4 : 2;
    const concAns = (await rl.question(`Berapa video diproses paralel? [1-16, Default: ${defaultConcurrency}]: `)).trim();
    const parsedConc = parseInt(concAns, 10);
    const concurrency = !isNaN(parsedConc) && parsedConc > 0 ? Math.min(parsedConc, 16) : defaultConcurrency;

    rl.close();
    return { concurrency, encoder };
  }

  // Parse CLI args or ENV
  let encoder: EncoderType = "svtav1";
  const eIndex = process.argv.indexOf("-e");
  const encoderIndex = process.argv.indexOf("--encoder");
  const rawEncoder = encoderIndex !== -1 ? process.argv[encoderIndex + 1] : eIndex !== -1 ? process.argv[eIndex + 1] : process.env.WORKER_ENCODER;

  if (rawEncoder) {
    const norm = rawEncoder.toLowerCase().trim();
    if (norm === "nvenc" || norm === "gpu") encoder = "nvenc";
    else if (norm === "qsv" || norm === "intel") encoder = "qsv";
    else if (norm === "videotoolbox" || norm === "apple") encoder = "videotoolbox";
    else if (norm === "x264" || norm === "h264") encoder = "x264";
    else encoder = "svtav1";
  }

  let concurrency = 2;
  const cIndex = process.argv.indexOf("-c");
  const concIndex = process.argv.indexOf("--concurrency");
  const rawConc = concIndex !== -1 ? process.argv[concIndex + 1] : cIndex !== -1 ? process.argv[cIndex + 1] : process.env.WORKER_CONCURRENCY;

  if (rawConc) {
    const val = parseInt(rawConc, 10);
    if (!isNaN(val) && val > 0) concurrency = Math.min(val, 16);
  }

  return { concurrency, encoder };
}

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

interface SlotState {
  mediaId: number;
  filename: string;
  step: string;
  percent: number;
  currentTime: number;
  duration: number;
  fps: string;
  etaSec: number;
  active: boolean;
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

// ── Progress Bar & Time Utilities ─────────────────────
function parseTimemark(tm: string): number {
  if (!tm) return 0;
  const parts = tm.split(":");
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec) || !isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function renderProgressBar(percent: number, width = 12): string {
  const safePercent = Math.max(0, Math.min(100, percent));
  const filled = Math.round((safePercent / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${safePercent.toFixed(1).padStart(5, " ")}%`;
}

function truncateLine(str: string, maxCols: number): string {
  if (str.length <= maxCols) return str;
  return str.slice(0, maxCols - 1);
}

// ── Main Startup ──────────────────────────────────────
async function main() {
  const config = await resolveConfig();
  const CONCURRENCY = config.concurrency;
  const ENCODER = config.encoder;

  const encoderLabels: Record<EncoderType, string> = {
    svtav1: "SVT-AV1 (CPU)",
    nvenc: "NVIDIA NVENC (GPU)",
    qsv: "Intel QuickSync (GPU)",
    videotoolbox: "Apple VideoToolbox (GPU)",
    x264: "H.264 / x264 (CPU)",
  };

  const transcodeQueue = new Queue<TranscodeJobData>("yeahtube-transcode", {
    connection: getRedisConnection(),
  });

  async function getRemainingCount(): Promise<number> {
    try {
      const counts = await transcodeQueue.getJobCounts("waiting", "active", "delayed");
      return (counts.waiting || 0) + (counts.delayed || 0);
    } catch {
      return 0;
    }
  }

  // ── Multi-Line Terminal Dashboard Manager ─────────────
  const slots: (SlotState | null)[] = Array.from({ length: CONCURRENCY }, () => null);
  let lastDashboardLineCount = 0;
  let cachedRemainingCount = 0;

  function acquireSlot(mediaId: number, filename: string): number {
    for (let i = 0; i < CONCURRENCY; i++) {
      if (!slots[i] || !slots[i]!.active) {
        slots[i] = {
          mediaId,
          filename,
          step: "Probing",
          percent: 0,
          currentTime: 0,
          duration: 0,
          fps: "",
          etaSec: 0,
          active: true,
        };
        return i;
      }
    }
    return 0;
  }

  function releaseSlot(slotIdx: number) {
    if (slots[slotIdx]) {
      slots[slotIdx]!.active = false;
    }
  }

  function clearDashboard() {
    if (process.stdout.isTTY && lastDashboardLineCount > 0) {
      process.stdout.write(`\x1b[${lastDashboardLineCount}F\x1b[0J`);
      lastDashboardLineCount = 0;
    }
  }

  function logMessage(msg: string) {
    clearDashboard();
    console.log(msg);
  }

  function renderDashboard() {
    if (!process.stdout.isTTY) return;

    const cols = Math.max(40, (process.stdout.columns || 80) - 2);
    const lines: string[] = [];

    const header = `── ⚡ YeahTube Worker (${CONCURRENCY} Worker | ${encoderLabels[ENCODER]}) | ⏳ Sisa: ${cachedRemainingCount} ──`;
    lines.push(truncateLine(header.padEnd(cols, "─"), cols));

    for (let i = 0; i < CONCURRENCY; i++) {
      const slot = slots[i];
      if (slot && slot.active) {
        const bar = renderProgressBar(slot.percent, 12);
        const cur = formatDuration(slot.currentTime);
        const dur = formatDuration(slot.duration);
        const fps = slot.fps ? `| ${slot.fps} ` : "";
        const eta = slot.etaSec > 0 ? `| ETA:${formatDuration(slot.etaSec)}` : "";
        
        const line1 = `[Slot ${i + 1} #${slot.mediaId}] "${slot.filename}"`;
        const line2 = `  ${slot.step} ${bar} (${cur}/${dur}) ${fps}${eta}`;
        
        lines.push(truncateLine(line1, cols));
        lines.push(truncateLine(line2, cols));
      } else {
        lines.push(truncateLine(`[Slot ${i + 1}] 💤 Idle...`, cols));
        lines.push(truncateLine(`  ─────────────────────────────`, cols));
      }
    }
    lines.push(truncateLine("─".repeat(cols), cols));

    if (lastDashboardLineCount > 0) {
      process.stdout.write(`\x1b[${lastDashboardLineCount}F`);
    }

    for (const line of lines) {
      process.stdout.write(`\x1b[2K${line}\n`);
    }

    lastDashboardLineCount = lines.length;
  }

  // ── Refresh stats & dashboard interval ────────────────
  const timer = setInterval(async () => {
    cachedRemainingCount = await getRemainingCount();
    renderDashboard();
  }, 250);

  // ── DB Pool ───────────────────────────────────────────
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Math.max(5, CONCURRENCY + 2),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
  });

  pool.on("error", (err) => {
    console.warn("[Worker] PostgreSQL idle connection event (auto-recovering):", err.message);
  });

  // ── Worker ────────────────────────────────────────────
  const worker = new Worker<TranscodeJobData>(
    "yeahtube-transcode",
    async (job: Job<TranscodeJobData>) => {
      const {
        mediaId, postId, storageKey, filename,
        bucket, endpoint, region, accessKey, secretKey, forcePathStyle,
      } = job.data;

      const slotIdx = acquireSlot(mediaId, filename);
      cachedRemainingCount = await getRemainingCount();
      logMessage(`🎬 [Slot ${slotIdx + 1} | Job #${job.id}] Mulai proses Media #${mediaId}: "${filename}"`);

      const s3 = new S3Client({
        endpoint,
        region,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle,
      });

      const tmpDir = os.tmpdir();
      const uniqueId = uuidv4();
      
      const now = new Date();
      const folderPath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
      const thumbnailFilename = `${uniqueId}_thumb.webp`;
      const thumbnailKey = `thumbnails/${folderPath}/${thumbnailFilename}`;
      const previewKey = `previews/${folderPath}/${uniqueId}_preview.mp4`;

      const thumbBasename = `yt-thumb-${uniqueId}`;
      const tmpThumbPng = path.join(tmpDir, `${thumbBasename}.png`);
      const tmpPreview = path.join(tmpDir, `yt-preview-${uniqueId}.mp4`);
      const tmpOutput = path.join(tmpDir, `yt-out-${uniqueId}.mp4`);

      const newStorageKey = `uploads/videos/${folderPath}/${uniqueId}_av1.mp4`;

      try {
        if (slots[slotIdx]) slots[slotIdx]!.step = "🔍 [1/5] Probing";

        const presignedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
          { expiresIn: 3600 }
        );

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

        if (slots[slotIdx]) {
          slots[slotIdx]!.step = `⚡ [2/5] ${ENCODER.toUpperCase()}`;
          slots[slotIdx]!.duration = actualDuration;
        }

        const startEncode = Date.now();

        await new Promise<void>((resolve, reject) => {
          const cmd = ffmpeg(presignedUrl);

          // Configure chosen encoder options
          if (ENCODER === "nvenc") {
            cmd.videoCodec("hevc_nvenc")
              .outputOptions([
                "-preset p5",
                "-cq 28",
                "-pix_fmt yuv420p",
                "-movflags +faststart",
              ]);
          } else if (ENCODER === "qsv") {
            cmd.videoCodec("hevc_qsv")
              .outputOptions([
                "-preset medium",
                "-global_quality 25",
                "-pix_fmt nv12",
                "-movflags +faststart",
              ]);
          } else if (ENCODER === "videotoolbox") {
            cmd.videoCodec("hevc_videotoolbox")
              .outputOptions([
                "-q:v 60",
                "-pix_fmt yuv420p",
                "-movflags +faststart",
              ]);
          } else if (ENCODER === "x264") {
            cmd.videoCodec("libx264")
              .outputOptions([
                "-preset medium",
                "-crf 23",
                "-pix_fmt yuv420p",
                "-movflags +faststart",
              ]);
          } else {
            // Default SVT-AV1
            cmd.videoCodec("libsvtav1")
              .outputOptions([
                "-preset 8",
                "-crf 30",
                "-pix_fmt yuv420p10le",
                "-svtav1-params tune=0:fast-decode=1",
                "-movflags +faststart",
              ]);
          }

          if (hasAudio) {
            cmd.audioCodec("aac").audioBitrate("128k");
          } else {
            cmd.noAudio();
          }

          cmd
            .output(tmpOutput)
            .on("progress", (p) => {
              const now = Date.now();
              const currentTime = parseTimemark(p.timemark);
              const percent = actualDuration > 0
                ? Math.min(100, Math.max(0, (currentTime / actualDuration) * 100))
                : (p.percent || 0);
              
              const elapsedSec = (now - startEncode) / 1000;
              const etaSec = percent > 0 ? Math.max(0, (elapsedSec / (percent / 100)) - elapsedSec) : 0;

              if (slots[slotIdx]) {
                slots[slotIdx]!.percent = percent;
                slots[slotIdx]!.currentTime = currentTime;
                slots[slotIdx]!.fps = p.currentFps ? `${p.currentFps} fps` : "";
                slots[slotIdx]!.etaSec = etaSec;
              }
            })
            .on("end", () => {
              resolve();
            })
            .on("error", (err) => {
              reject(err);
            })
            .run();
        });

        if (slots[slotIdx]) slots[slotIdx]!.step = "🖼️ [3/5] Thumb & Preview";
        const seekTime = Math.max(0, Math.min(actualDuration * 0.1, actualDuration - 0.5, 10));

        // Extract Thumbnail
        await new Promise<void>((resolve) => {
          ffmpeg(tmpOutput)
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
          ffmpeg(tmpOutput)
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

        if (slots[slotIdx]) slots[slotIdx]!.step = "☁️ [4/5] Upload S3";
        const outStat = await fs.stat(tmpOutput);
        const outBuffer = await fs.readFile(tmpOutput);
        const newFileSize = outStat.size;

        // Upload Video
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: newStorageKey,
            Body: outBuffer,
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
          // Preview upload skipped
        }

        if (slots[slotIdx]) slots[slotIdx]!.step = "🗄️ [5/5] Save Database";

        // Safely delete old raw uncompressed upload from S3 if key changed
        if (storageKey !== newStorageKey) {
          try {
            const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
            await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
          } catch (delErr) {
            console.warn(`[Worker] Could not delete old raw upload:`, delErr);
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
          // Silently continue
        }

        const elapsed = ((Date.now() - startEncode) / 1000).toFixed(1);
        cachedRemainingCount = await getRemainingCount();
        logMessage(`✅ [Slot ${slotIdx + 1}] Media #${mediaId} selesai dalam ${elapsed}s! (${(newFileSize / (1024 * 1024)).toFixed(2)} MB)`);
      } catch (err) {
        logMessage(`❌ [Slot ${slotIdx + 1}] Media #${mediaId} gagal: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      } finally {
        releaseSlot(slotIdx);
        for (const f of [tmpOutput, tmpThumbPng, tmpPreview]) {
          try { await fs.unlink(f); } catch {}
        }
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: CONCURRENCY,
      stalledInterval: 60000,
    },
  );

  // ── Shutdown ──────────────────────────────────────────
  async function shutdown() {
    clearInterval(timer);
    clearDashboard();
    if (process.stdout.isTTY) process.stdout.write("\x1b[?25h");
    console.log("\n[Worker] Shutting down...");
    await worker.close();
    await transcodeQueue.close();
    await pool.end();
    process.exit(0);
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  if (process.stdout.isTTY) process.stdout.write("\x1b[?25h");
  console.log(`⚡ YeahTube Worker started [Concurrency: ${CONCURRENCY}, Encoder: ${encoderLabels[ENCODER]}]\n`);
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
