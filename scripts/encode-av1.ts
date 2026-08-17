/**
 * YeahTube SVT-AV1 Full Video Transcoder & Storage Optimizer (Replace Mode)
 *
 * Full-video transcoding to modern AV1 (libsvtav1) with 10-bit color depth
 * and AAC audio, saving ~40-50% storage on MinIO/S3 and boosting streaming speed.
 *
 * Usage:
 *   npx tsx scripts/encode-av1.ts --id 1786          # Test single video by media ID
 *   npx tsx scripts/encode-av1.ts --limit 1          # Test on 1 video
 *   npx tsx scripts/encode-av1.ts --preset 8 --crf 30 # Batch process with custom settings
 */

import "../db/env";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { Pool } from "pg";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";

// Parse CLI flags
const idIndex = process.argv.indexOf("--id");
const targetId = idIndex !== -1 ? parseInt(process.argv[idIndex + 1], 10) : undefined;

const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : (targetId ? undefined : 1);

const presetIndex = process.argv.indexOf("--preset");
const preset = presetIndex !== -1 ? process.argv[presetIndex + 1] : "8";

const crfIndex = process.argv.indexOf("--crf");
const crf = crfIndex !== -1 ? process.argv[crfIndex + 1] : "30";

const keepOriginal = process.argv.includes("--keep-original");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  keepAlive: true,
  idleTimeoutMillis: 30000,
});
pool.on("error", (err) => {
  console.warn("[Script] PostgreSQL idle pool error:", err.message);
});

function getS3Client(): { s3: S3Client; bucket: string } {
  const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
  const region = process.env.S3_REGION || "us-east-1";
  const bucket = process.env.S3_BUCKET || "yeahtube";
  const accessKey = process.env.S3_ACCESS_KEY || "minioadmin";
  const secretKey = process.env.S3_SECRET_KEY || "minioadmin";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle,
  });

  return { s3, bucket };
}

interface MediaRow {
  id: number;
  post_id: number;
  storage_key: string;
  filename: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnail_key: string | null;
  preview_key: string | null;
}

async function transcodeToAv1(row: MediaRow, s3: S3Client, bucket: string) {
  const tmpDir = os.tmpdir();
  const uniqueId = uuidv4();
  const tmpAv1Output = path.join(tmpDir, `yt-av1-${uniqueId}.mp4`);
  const tmpThumbPng = path.join(tmpDir, `yt-thumb-${uniqueId}.png`);
  const tmpPreview = path.join(tmpDir, `yt-preview-${uniqueId}.mp4`);

  const now = new Date();
  const folderPath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newStorageKey = `uploads/videos/${folderPath}/${uniqueId}_av1.mp4`;
  const thumbnailKey = `thumbnails/${folderPath}/${uniqueId}_thumb.webp`;
  const previewKey = `previews/${folderPath}/${uniqueId}_preview.mp4`;

  console.log(`\n======================================================`);
  console.log(`🎬 Processing Media #${row.id} (Post #${row.post_id}): "${row.filename}"`);
  console.log(`   Original Storage Key: ${row.storage_key}`);
  console.log(`   Original Size: ${row.file_size ? (row.file_size / (1024 * 1024)).toFixed(2) + " MB" : "Unknown"}`);
  console.log(`======================================================`);

  try {
    // 1. Generate Presigned URL for source video streaming
    const presignedSourceUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: row.storage_key }),
      { expiresIn: 3600 }
    );

    // 2. Extract Metadata via ffprobe
    console.log(`[1/5] 🔍 Probing video metadata...`);
    const metadata: FfprobeData = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(presignedSourceUrl, (err, meta) => (err ? reject(err) : resolve(meta)));
    });

    const duration = metadata.format.duration || row.duration || 0;
    const videoStream = metadata.streams?.find((s) => s.codec_type === "video");
    const audioStream = metadata.streams?.find((s) => s.codec_type === "audio");
    const width = videoStream?.width || row.width || null;
    const height = videoStream?.height || row.height || null;

    console.log(`      Dimensions: ${width}x${height}, Duration: ${duration.toFixed(1)}s, Codec: ${videoStream?.codec_name || "unknown"}`);

    // 3. Full Transcoding to SVT-AV1
    console.log(`[2/5] ⚡ Encoding full video to SVT-AV1 (preset: ${preset}, crf: ${crf})...`);
    const startTime = Date.now();

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(presignedSourceUrl)
        .videoCodec("libsvtav1")
        .outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`,
          "-pix_fmt yuv420p10le",
          "-svtav1-params tune=0:fast-decode=1",
          "-movflags +faststart",
        ]);

      if (audioStream) {
        command.audioCodec("aac").audioBitrate("128k");
      } else {
        command.noAudio();
      }

      command
        .output(tmpAv1Output)
        .on("progress", (p) => {
          if (p.percent) {
            process.stdout.write(`      Encoding: ${Math.floor(p.percent)}% (${p.timemark || ""})\r`);
          }
        })
        .on("end", () => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`\n      ✅ AV1 Encoding completed in ${elapsed}s!`);
          resolve();
        })
        .on("error", (err) => {
          console.error(`\n      ❌ AV1 Encoding failed:`, err.message);
          reject(err);
        })
        .run();
    });

    // 4. Generate WebP Thumbnail & 3s Preview Clip
    console.log(`[3/5] 🖼️  Generating WebP Thumbnail & Preview...`);
    const seekTime = Math.max(0, Math.min(duration * 0.1, duration - 0.5, 10));

    // Thumbnail extraction
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
      const pngBuf = await fs.readFile(tmpThumbPng);
      thumbnailBuffer = await sharp(pngBuf).webp({ quality: 80 }).toBuffer();
    } catch {
      thumbnailBuffer = await sharp({
        create: { width: 400, height: 225, channels: 3, background: { r: 30, g: 30, b: 30 } },
      }).webp({ quality: 50 }).toBuffer();
    }

    // Preview clip extraction
    const previewDuration = Math.min(3, Math.max(0.5, duration - seekTime));
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

    // 5. Upload New AV1 Master Video, Thumbnail & Preview to S3
    console.log(`[4/5] ☁️  Uploading AV1 master video to MinIO/S3...`);
    const av1Stat = await fs.stat(tmpAv1Output);
    const av1Buffer = await fs.readFile(tmpAv1Output);
    const newFileSize = av1Stat.size;

    const oldSizeMb = row.file_size ? (row.file_size / (1024 * 1024)).toFixed(2) : "0";
    const newSizeMb = (newFileSize / (1024 * 1024)).toFixed(2);
    const savingPercent = row.file_size ? (((row.file_size - newFileSize) / row.file_size) * 100).toFixed(1) : "0";

    console.log(`      Old Size: ${oldSizeMb} MB ➔ New AV1 Size: ${newSizeMb} MB (Saved ${savingPercent}%)`);

    // Upload AV1 video
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: newStorageKey,
        Body: av1Buffer,
        ContentType: "video/mp4",
      })
    );

    // Verify upload on S3
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: newStorageKey }));

    // Upload Thumbnail
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/webp",
      })
    );

    // Upload Preview
    let finalPreviewKey: string | null = null;
    try {
      const prevBuf = await fs.readFile(tmpPreview);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: previewKey,
          Body: prevBuf,
          ContentType: "video/mp4",
        })
      );
      finalPreviewKey = previewKey;
    } catch {}

    // 6. Update PostgreSQL & Cleanup Old S3 Key (Replace Mode)
    console.log(`[5/5] 🗄️  Updating database & cleaning up old S3 file...`);

    // Delete old S3 master video if replacing and keys differ
    if (!keepOriginal && row.storage_key !== newStorageKey) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.storage_key }));
        console.log(`      🗑️ Deleted old file from S3: ${row.storage_key}`);
      } catch (delErr) {
        console.warn(`      ⚠️ Could not delete old S3 key:`, delErr);
      }
    }

    // Update database
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
      [newStorageKey, newFileSize, width, height, duration, thumbnailKey, finalPreviewKey, row.id]
    );

    // Invalidate Redis Cache
    try {
      const { invalidatePostCache, invalidateFeedCache } = await import("../lib/cache");
      await invalidatePostCache(row.post_id);
      await invalidateFeedCache();
    } catch {}

    console.log(`🎉 Media #${row.id} successfully transcoded to AV1 and replaced!`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Transcode failed for Media #${row.id}:`, errorMsg);
    throw err;
  } finally {
    // Cleanup temporary files
    for (const f of [tmpAv1Output, tmpThumbPng, tmpPreview]) {
      try { await fs.unlink(f); } catch {}
    }
  }
}

async function main() {
  const { s3, bucket } = getS3Client();

  let query = "";
  let params: (number | string)[] = [];

  if (targetId) {
    query = `SELECT * FROM media WHERE id = $1 AND media_type = 'video'`;
    params = [targetId];
  } else {
    query = `SELECT * FROM media WHERE media_type = 'video' ORDER BY id DESC ${limit ? `LIMIT ${limit}` : ""}`;
  }

  const { rows } = await pool.query(query, params);

  if (rows.length === 0) {
    console.log("No video records found matching criteria.");
    await pool.end();
    return;
  }

  console.log(`Found ${rows.length} video(s) to transcode to AV1.`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as MediaRow;
    console.log(`\n[Progress: ${i + 1}/${rows.length}]`);
    await transcodeToAv1(row, s3, bucket);
  }

  console.log("\n======================================================");
  console.log("🏁 All requested video(s) have been processed!");
  console.log("======================================================");

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
