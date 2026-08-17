import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";
import { requireCsrf } from "@/lib/csrf";
import { checkInteractionRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const db = getDb();
    
    // Get total likes and dislikes
    const statsResult = await db
      .select({
        isLike: schema.likes.isLike,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.likes)
      .where(eq(schema.likes.postId, postId))
      .groupBy(schema.likes.isLike);

    let likes = 0;
    let dislikes = 0;
    for (const stat of statsResult) {
      if (stat.isLike === 1) likes = stat.count;
      if (stat.isLike === 0) dislikes = stat.count;
    }

    // Get current user status
    let userAction: "like" | "dislike" | null = null;
    const user = await getCurrentUser();
    if (user) {
      const [userLike] = await db
        .select()
        .from(schema.likes)
        .where(
          and(
            eq(schema.likes.userId, user.id),
            eq(schema.likes.postId, postId)
          )
        );
      if (userLike) {
        userAction = userLike.isLike === 1 ? "like" : "dislike";
      }
    }

    return NextResponse.json({ likes, dislikes, userAction });
  } catch (error) {
    console.error("Like GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimit = await checkInteractionRateLimit(String(user.id), "like");
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.resetSeconds, "Like action rate limit exceeded. Please wait a moment.");
    }

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const body = await request.json();
    const action = body.action as "like" | "dislike" | "none";
    if (!["like", "dislike", "none"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = getDb();

    // Check existing
    const [existing] = await db
      .select()
      .from(schema.likes)
      .where(
        and(
          eq(schema.likes.userId, user.id),
          eq(schema.likes.postId, postId)
        )
      );

    if (action === "none") {
      if (existing) {
        await db.delete(schema.likes).where(eq(schema.likes.id, existing.id));
      }
    } else {
      const isLikeVal = action === "like" ? 1 : 0;
      if (existing) {
        if (existing.isLike !== isLikeVal) {
          await db
            .update(schema.likes)
            .set({ isLike: isLikeVal })
            .where(eq(schema.likes.id, existing.id));
        }
      } else {
        await db.insert(schema.likes).values({
          userId: user.id,
          postId,
          isLike: isLikeVal,
        });
      }
    }

    // Get updated total likes and dislikes
    const statsResult = await db
      .select({
        isLike: schema.likes.isLike,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.likes)
      .where(eq(schema.likes.postId, postId))
      .groupBy(schema.likes.isLike);

    let likes = 0;
    let dislikes = 0;
    for (const stat of statsResult) {
      if (stat.isLike === 1) likes = stat.count;
      if (stat.isLike === 0) dislikes = stat.count;
    }

    const userAction: "like" | "dislike" | null = action === "none" ? null : action;
    return NextResponse.json({ likes, dislikes, userAction });
  } catch (error) {
    console.error("Like POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
