import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const playlistId = parseInt(id, 10);
    if (isNaN(playlistId)) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }

    const db = getDb();

    // Get total likes for playlist
    const [likesResult] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.playlistLikes)
      .where(eq(schema.playlistLikes.playlistId, playlistId));

    const likes = likesResult?.count || 0;

    // Check if current user liked
    let userLiked = false;
    const user = await getCurrentUser();
    if (user) {
      const [existingLike] = await db
        .select()
        .from(schema.playlistLikes)
        .where(
          and(
            eq(schema.playlistLikes.userId, user.id),
            eq(schema.playlistLikes.playlistId, playlistId),
          ),
        );
      userLiked = Boolean(existingLike);
    }

    return NextResponse.json({ likes, userLiked });
  } catch (error) {
    console.error("Playlist like GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const playlistId = parseInt(id, 10);
    if (isNaN(playlistId)) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }

    const db = getDb();

    // Check if playlist exists
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, playlistId));

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Check existing like
    const [existing] = await db
      .select()
      .from(schema.playlistLikes)
      .where(
        and(
          eq(schema.playlistLikes.userId, user.id),
          eq(schema.playlistLikes.playlistId, playlistId),
        ),
      );

    let userLiked = false;
    if (existing) {
      // Toggle off (unlike)
      await db
        .delete(schema.playlistLikes)
        .where(eq(schema.playlistLikes.id, existing.id));
      userLiked = false;
    } else {
      // Toggle on (like)
      await db.insert(schema.playlistLikes).values({
        userId: user.id,
        playlistId,
      });
      userLiked = true;
    }

    // Get updated count
    const [likesResult] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.playlistLikes)
      .where(eq(schema.playlistLikes.playlistId, playlistId));

    const likes = likesResult?.count || 0;

    return NextResponse.json({ likes, userLiked });
  } catch (error) {
    console.error("Playlist like POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
