import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL || "redis://192.168.1.41:6379";

  if (!redisClient) {
    try {
      redisClient = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) return null; // stop reconnecting if down
          return Math.min(times * 200, 1000);
        },
      });

      redisClient.on("error", (err) => {
        // Suppress unhandled error log spam if Redis is unreachable
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Redis] Connection error:", err.message);
        }
      });
    } catch {
      redisClient = null;
    }
  }

  return redisClient;
}
