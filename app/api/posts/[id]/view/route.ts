import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getRedisClient } from "@/lib/redis";
import { invalidatePostDetailCache } from "@/lib/cache";
import crypto from "crypto";

// Fallback in-memory set for deduplication when Redis is offline
const memoryDedup = new Map<string, number>();

// Clean up memory dedup periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, expiresAt] of memoryDedup.entries()) {
      if (expiresAt <= now) {
        memoryDedup.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const clientIp = getClientIp(req);

    // 1. Anti-abuse rate limit per IP (max 30 view attempts per minute per IP)
    const rateLimit = await checkRateLimit(`view-ip:${clientIp}`, 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: true, counted: false, reason: "rate_limited" },
        { status: 429 }
      );
    }

    const db = getDb();

    // 2. Fetch post author to verify existence and check self-view
    const [post] = await db
      .select({ id: schema.posts.id, userId: schema.posts.userId })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const currentUser = await getCurrentUser();

    // 3. Prevent author self-view from inflating count
    if (currentUser && currentUser.id === post.userId) {
      return NextResponse.json({ success: true, counted: false, reason: "author" });
    }

    // 4. Viewer deduplication key (30-minute window)
    let viewerKey: string;
    if (currentUser) {
      viewerKey = `u:${currentUser.id}`;
    } else {
      const userAgent = req.headers.get("user-agent") || "unknown";
      const hash = crypto
        .createHash("sha256")
        .update(`${clientIp}:${userAgent}`)
        .digest("hex")
        .slice(0, 16);
      viewerKey = `g:${hash}`;
    }

    const dedupKey = `view:dedup:${postId}:${viewerKey}`;
    const DEDUP_TTL_SECONDS = 1800; // 30 minutes

    const redis = getRedisClient();
    let isNewView = false;

    if (redis) {
      try {
        // Atomic SET with NX and EX: only sets if key does not exist
        const result = await redis.set(dedupKey, "1", "EX", DEDUP_TTL_SECONDS, "NX");
        isNewView = result === "OK";
      } catch {
        // Fall back to memory
        const now = Date.now();
        const expiresAt = memoryDedup.get(dedupKey);
        if (!expiresAt || expiresAt <= now) {
          memoryDedup.set(dedupKey, now + DEDUP_TTL_SECONDS * 1000);
          isNewView = true;
        }
      }
    } else {
      const now = Date.now();
      const expiresAt = memoryDedup.get(dedupKey);
      if (!expiresAt || expiresAt <= now) {
        memoryDedup.set(dedupKey, now + DEDUP_TTL_SECONDS * 1000);
        isNewView = true;
      }
    }

    if (!isNewView) {
      return NextResponse.json({ success: true, counted: false, reason: "duplicate" });
    }

    // 5. Increment view count in database
    await db
      .update(schema.posts)
      .set({ views: sql`${schema.posts.views} + 1` })
      .where(eq(schema.posts.id, postId));

    // 6. Invalidate post detail cache
    await invalidatePostDetailCache(postId);

    return NextResponse.json({ success: true, counted: true });
  } catch (error) {
    console.error("Failed to update view count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

