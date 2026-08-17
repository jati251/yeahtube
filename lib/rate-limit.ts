import "server-only";
import { getRedisClient } from "./redis";
import { NextRequest, NextResponse } from "next/server";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  total: number;
}

// In-memory fallback if Redis is unavailable
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

// Periodic cleanup for memory store every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryStore.entries()) {
      if (val.expiresAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * High-performance sliding window rate limiter using Redis atomic INCR + EXPIRE
 * with automatic in-memory fallback.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const redisKey = `ratelimit:${key}`;

  if (redis) {
    try {
      const current = await redis.incr(redisKey);
      if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      const ttl = await redis.ttl(redisKey);
      const resetSeconds = ttl > 0 ? ttl : windowSeconds;

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetSeconds,
        total: current,
      };
    } catch {
      // Fall through to memory store if Redis fails
    }
  }

  // In-memory fallback
  const now = Date.now();
  const record = memoryStore.get(redisKey);

  if (!record || record.expiresAt <= now) {
    memoryStore.set(redisKey, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
      total: 1,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const resetSeconds = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));

  return {
    allowed: record.count <= limit,
    remaining,
    resetSeconds,
    total: record.count,
  };
}

/**
 * Extract client IP address securely considering common reverse proxies (Cloudflare, X-Forwarded-For)
 */
export function getClientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",");
    return ips[0].trim();
  }

  return "127.0.0.1";
}

/**
 * Helper to construct a standard HTTP 429 Too Many Requests response
 */
export function rateLimitExceededResponse(resetSeconds: number, message = "Too many requests. Please try again later."): NextResponse {
  return NextResponse.json(
    {
      error: message,
      retryAfter: resetSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetSeconds),
        "X-RateLimit-Reset": String(resetSeconds),
      },
    },
  );
}

/**
 * Preconfigured rate limiter for Auth operations (Login, Password Change)
 * 5 attempts per 60 seconds per IP + username
 */
export async function checkAuthRateLimit(ip: string, identifier?: string): Promise<RateLimitResult> {
  const key = `auth:${ip}${identifier ? `:${identifier.toLowerCase()}` : ""}`;
  return checkRateLimit(key, 5, 60);
}

/**
 * Preconfigured rate limiter for media uploads
 * 40 uploads per 60 seconds per user
 */
export async function checkUploadRateLimit(userId: number | string): Promise<RateLimitResult> {
  return checkRateLimit(`upload:${userId}`, 40, 60);
}

/**
 * Preconfigured rate limiter for user interactions (Likes, Comments)
 * 30 interactions per 60 seconds per user/IP
 */
export async function checkInteractionRateLimit(userOrIp: string, action: string): Promise<RateLimitResult> {
  return checkRateLimit(`interact:${action}:${userOrIp}`, 30, 60);
}
