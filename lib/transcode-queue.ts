import { Queue } from "bullmq";

// ── Redis Connection (plain object, no IORedis instance to avoid version conflicts) ───
function getRedisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

// ── Queue ─────────────────────────────────────────────
const TRANSCODE_QUEUE = "yeahtube-transcode";

export interface TranscodeJobData {
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

let queueInstance: Queue<TranscodeJobData> | null = null;

export function getTranscodeQueue(): Queue<TranscodeJobData> {
  if (!queueInstance) {
    queueInstance = new Queue<TranscodeJobData>(TRANSCODE_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
    });
  }
  return queueInstance;
}

// ── Enqueue transcode job after upload ────────────────
export async function enqueueTranscode(data: TranscodeJobData): Promise<void> {
  const queue = getTranscodeQueue();
  await queue.add(`transcode-${data.mediaId}`, data);
  console.log(`[TranscodeQueue] Enqueued transcode for media #${data.mediaId} (post #${data.postId})`);
}
