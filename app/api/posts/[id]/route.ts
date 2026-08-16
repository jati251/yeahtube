import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { eq, sql } from "drizzle-orm";
import { invalidatePostCache } from "@/lib/cache";

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
    const [requestingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));

    if (!requestingUser || !requestingUser.isWhitelisted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, Number(id)));

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const media = await db
      .select()
      .from(schema.media)
      .where(eq(schema.media.postId, post.id))
      .orderBy(schema.media.orderIndex);

    const postTags = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
      })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(eq(schema.postTags.postId, post.id));

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

    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, Number(id)));

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete media files from S3
    const media = await db
      .select()
      .from(schema.media)
      .where(eq(schema.media.postId, post.id));

    const { getS3Client, getStorageConfig } = await import("@/lib/storage");
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = getS3Client();
    const storageConfig = getStorageConfig();

    for (const m of media) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageConfig.bucket,
            Key: m.storageKey,
          }),
        );
        if (m.thumbnailKey) {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: storageConfig.bucket,
              Key: m.thumbnailKey,
            }),
          );
        }
        if (m.previewKey) {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: storageConfig.bucket,
              Key: m.previewKey,
            }),
          );
        }
      } catch (err) {
        console.error(`Failed to delete S3 object: ${m.storageKey}`, err);
      }
    }

    // Delete post (cascades to media, post_tags)
    await db.delete(schema.posts).where(eq(schema.posts.id, Number(id)));
    await invalidatePostCache(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, Number(id)));

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, categoryId } = body;

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    const updateData: {
      title?: string;
      description?: string | null;
      categoryId?: number | null;
      updatedAt: ReturnType<typeof sql>;
    } = {
      updatedAt: sql`now()`,
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (categoryId !== undefined) updateData.categoryId = categoryId ? Number(categoryId) : null;

    const [updatedPost] = await db
      .update(schema.posts)
      .set(updateData)
      .where(eq(schema.posts.id, Number(id)))
      .returning();

    let categoryName: string | null = null;
    if (updatedPost.categoryId) {
      const [cat] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, updatedPost.categoryId));
      categoryName = cat?.name ?? null;
    }

    await invalidatePostCache(Number(id));

    return NextResponse.json({
      success: true,
      post: {
        ...updatedPost,
        category: categoryName,
      },
    });
  } catch (error) {
    console.error("Edit post error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 },
    );
  }
}
