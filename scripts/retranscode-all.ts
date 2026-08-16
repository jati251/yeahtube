/**
 * YeahTube Batch Video Asset Re-processor / Transcoder
 *
 * Scans all videos in PostgreSQL and enqueues them into BullMQ
 * to generate modern WebP thumbnails, preview clips, and accurate metadata.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/retranscode-all.ts [--force] [--limit 50]
 */

import "../db/env";
import { Pool } from "pg";
import { Queue } from "bullmq";

const force = process.argv.includes("--force");
const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : undefined;

function getRedisConnection() {
  const url = process.env.REDIS_URL || "redis://:strongpassword123@cekcok-redis:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  keepAlive: true,
  idleTimeoutMillis: 30000,
});
pool.on("error", (err) => {
  console.warn("[Script] PostgreSQL idle pool error:", err.message);
});

const transcodeQueue = new Queue("yeahtube-transcode", {
  connection: getRedisConnection(),
});

async function main() {
  console.log("🚀 Scanning videos for modern asset processing...");
  console.log(`- Force re-process all: ${force ? "YES" : "NO (only missing/incomplete)"}`);
  if (limit) console.log(`- Limit: ${limit}`);

  const query = force
    ? `SELECT id, post_id, storage_key, filename, mime_type, thumbnail_key, preview_key, width, height, duration 
       FROM media WHERE media_type = 'video' ORDER BY id ASC ${limit ? `LIMIT ${limit}` : ""}`
    : `SELECT id, post_id, storage_key, filename, mime_type, thumbnail_key, preview_key, width, height, duration 
       FROM media WHERE media_type = 'video' AND (thumbnail_key IS NULL OR preview_key IS NULL OR width IS NULL OR duration IS NULL) 
       ORDER BY id ASC ${limit ? `LIMIT ${limit}` : ""}`;

  const { rows } = await pool.query(query);
  console.log(`Found ${rows.length} video(s) to process.`);

  if (rows.length === 0) {
    console.log("✅ All videos already have complete modern assets!");
    await transcodeQueue.close();
    await pool.end();
    return;
  }

  const endpoint = process.env.S3_ENDPOINT || "http://api.s3.homelab.local";
  const region = process.env.S3_REGION || "us-east-1";
  const bucket = process.env.S3_BUCKET || "yeahtube";
  const accessKey = process.env.S3_ACCESS_KEY || "minioadmin";
  const secretKey = process.env.S3_SECRET_KEY || "minioadmin";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  let enqueued = 0;
  for (const row of rows) {
    await transcodeQueue.add(
      `transcode-${row.id}`,
      {
        mediaId: row.id,
        postId: row.post_id,
        storageKey: row.storage_key,
        filename: row.filename,
        mimeType: row.mime_type,
        bucket,
        endpoint,
        region,
        accessKey,
        secretKey,
        forcePathStyle,
      },
      {
        jobId: `retranscode-${row.id}-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );
    enqueued++;
    if (enqueued % 50 === 0 || enqueued === rows.length) {
      console.log(`Enqueued ${enqueued}/${rows.length} jobs...`);
    }
  }

  console.log(`🎉 Successfully enqueued ${enqueued} video(s) into yeahtube-transcode queue!`);
  console.log(`To start processing, run the worker:`);
  console.log(`  npx tsx --env-file=.env.local worker.ts`);

  await transcodeQueue.close();
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
