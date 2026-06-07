import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { eq, sql } from "drizzle-orm";

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

    const db = getDb();
    
    await db
      .update(schema.posts)
      .set({ views: sql`${schema.posts.views} + 1` })
      .where(eq(schema.posts.id, postId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update view count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
