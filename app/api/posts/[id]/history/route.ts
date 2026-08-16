import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const db = getDb();

    // Check if entry exists
    const [existing] = await db
      .select()
      .from(schema.watchHistory)
      .where(
        and(
          eq(schema.watchHistory.userId, user.id),
          eq(schema.watchHistory.postId, postId)
        )
      );

    if (existing) {
      // Update watchedAt
      await db
        .update(schema.watchHistory)
        .set({ watchedAt: new Date() })
        .where(eq(schema.watchHistory.id, existing.id));
    } else {
      // Insert new
      await db.insert(schema.watchHistory).values({
        userId: user.id,
        postId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("History tracking error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
