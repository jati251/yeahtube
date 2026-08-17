import { getRedisClient } from "./redis";

/**
 * Get deserialized cached value from Redis.
 * Returns null if not found or Redis is unavailable.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Store serialized value in Redis with TTL in seconds.
 * Silently fails if Redis is unavailable.
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = 60,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
  } catch {
    // Fail silently
  }
}

/**
 * Delete a specific key from Redis.
 */
export async function deleteCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch {
    // Fail silently
  }
}

/**
 * Delete all keys matching a glob pattern using SCAN to avoid blocking Redis.
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Fail silently
  }
}

/**
 * Invalidate all feed caches and recommendation caches (e.g. after upload, edit, delete).
 */
export async function invalidateFeedCache(): Promise<void> {
  await Promise.all([
    deleteCachePattern("cache:feed:*"),
    deleteCachePattern("cache:recommendations:*"),
    deleteCache("cache:shorts:initial"),
  ]);
}

/**
 * Invalidate a specific post's cache, recommendation cache, and all feed queries.
 */
export async function invalidatePostCache(postId: number): Promise<void> {
  await Promise.all([
    deleteCachePattern(`cache:post:detail:*:${postId}`),
    deleteCachePattern(`cache:post:detail:*:${postId}:*`),
    deleteCachePattern(`cache:recommendations:*:${postId}`),
    deleteCachePattern(`cache:recommendations:*:${postId}:*`),
    invalidateFeedCache(),
  ]);
}

/**
 * Invalidate taxonomy caches (tags and categories).
 */
export async function invalidateTaxonomyCache(): Promise<void> {
  await Promise.all([
    deleteCache("cache:tags:all"),
    deleteCache("cache:categories:all"),
    invalidateFeedCache(),
  ]);
}
