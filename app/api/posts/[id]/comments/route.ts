import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

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
    
    const commentsData = await db
      .select({
        id: schema.comments.id,
        content: schema.comments.content,
        createdAt: schema.comments.createdAt,
        userId: schema.users.id,
        username: schema.users.username,
      })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
      .where(eq(schema.comments.postId, postId))
      .orderBy(desc(schema.comments.createdAt))
      .limit(100); // Pagination could be added here if needed

    return NextResponse.json({ comments: commentsData });
  } catch (error) {
    console.error("Comments GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const db = getDb();

    const [inserted] = await db
      .insert(schema.comments)
      .values({
        userId: user.id,
        postId,
        content,
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      comment: {
        id: inserted.id,
        content: inserted.content,
        createdAt: inserted.createdAt,
        userId: user.id,
        username: user.username, // From auth, available directly
      } 
    });
  } catch (error) {
    console.error("Comments POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
