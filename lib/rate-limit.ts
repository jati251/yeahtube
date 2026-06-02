import "server-only";

// ── In-Memory Rate Limiter ──────────────────────────────
// Tracks failed attempts per IP using a simple Map.
// No external dependencies required.

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp in ms when the window resets
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent memory leaks.
const CLEANUP_INTERVAL_MS = 60_000; // every 60 seconds
let lastCleanup = Date.now();

function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Check whether `key` (typically an IP address) has exceeded the rate limit.
 *
 * @param key      - Unique identifier for the client (e.g. IP address).
 * @param maxAttempts - Maximum allowed attempts within the window.
 * @param windowMs    - Rolling window duration in milliseconds.
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000, // 15 minutes
): boolean {
  cleanupExpired();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // First attempt or window has expired — reset
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    // Rate limit exceeded
    return false;
  }

  // Increment attempt count
  entry.count += 1;
  return true;
}

/**
 * Get remaining attempts and reset time for a given key.
 * Useful for adding Retry-After headers.
 */
export function getRateLimitStatus(key: string): {
  remaining: number;
  resetAt: number;
} {
  const entry = store.get(key);
  if (!entry) {
    return { remaining: 5, resetAt: 0 };
  }

  const now = Date.now();
  if (now >= entry.resetAt) {
    return { remaining: 5, resetAt: 0 };
  }

  return {
    remaining: Math.max(0, 5 - entry.count),
    resetAt: entry.resetAt,
  };
}
