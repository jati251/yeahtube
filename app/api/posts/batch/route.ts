import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    // Auth check — admin only
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body as { ids?: number[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No post IDs provided" },
        { status: 400 },
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 posts per batch delete" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Get all media for the posts to delete from S3
    const media = await db
      .select()
      .from(schema.media)
      .where(inArray(schema.media.postId, ids));

    // Delete from S3
    const { getS3Client, getStorageConfig } = await import("@/lib/storage");
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = getS3Client();
    const storageConfig = getStorageConfig();

    let deletedCount = 0;
    let s3ErrorCount = 0;

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
      } catch {
        s3ErrorCount++;
      }
    }

    // Delete posts from DB (cascades to media + post_tags) — single batch query
    const deleted = await db.delete(schema.posts).where(inArray(schema.posts.id, ids));
    deletedCount = deleted.rowCount ?? ids.length;

    return NextResponse.json({
      success: true,
      deletedCount,
      s3Errors: s3ErrorCount,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete posts" },
      { status: 500 },
    );
  }
}
