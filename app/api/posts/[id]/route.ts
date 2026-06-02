import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the requesting user is whitelisted (IDOR protection)
    const db = getDb();
    const requestingUser = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .get();

    if (!requestingUser || !requestingUser.isWhitelisted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const post = db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, Number(id)))
      .get();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const media = db
      .select()
      .from(schema.media)
      .where(eq(schema.media.postId, post.id))
      .orderBy(schema.media.orderIndex)
      .all();

    const postTags = db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
      })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(eq(schema.postTags.postId, post.id))
      .all();

    return NextResponse.json({
      ...post,
      media,
      tags: postTags,
    });
  } catch (error) {
    console.error("Post detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // CSRF protection
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const post = db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, Number(id)))
      .get();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete media files from S3
    const media = db
      .select()
      .from(schema.media)
      .where(eq(schema.media.postId, post.id))
      .all();

    const { getS3Client, STORAGE_CONFIG } = await import("@/lib/storage");
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = getS3Client();

    for (const m of media) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: STORAGE_CONFIG.bucket,
            Key: m.storageKey,
          }),
        );
        if (m.thumbnailKey) {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: STORAGE_CONFIG.bucket,
              Key: m.thumbnailKey,
            }),
          );
        }
      } catch (err) {
        console.error(`Failed to delete S3 object: ${m.storageKey}`, err);
      }
    }

    // Delete post (cascades to media, post_tags)
    db.delete(schema.posts).where(eq(schema.posts.id, Number(id))).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 },
    );
  }
}
