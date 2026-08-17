import crypto from "crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";

/**
 * Generates an 11-character URL-safe alphanumeric string (YouTube-style ID).
 */
export function generateYouTubeId(length = 11): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % 64];
  }
  return result;
}

/**
 * Returns the standardized YouTube-style watch URL for a post (/watch?v=...).
 */
export function getWatchUrl(post: { id: number; slug?: string | null }): string {
  return `/watch?v=${post.slug || post.id}`;
}
