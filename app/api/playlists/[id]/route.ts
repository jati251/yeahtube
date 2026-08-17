import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlistId = parseInt(id, 10);
    const user = await getCurrentUser();

    const db = getDb();
    
    // Check if playlist exists and user has access
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, playlistId));

    if (!playlist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!playlist.isPublic && (!user || playlist.userId !== user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Return items. We will join with posts. (Simple implementation for now)
    const items = await db
      .select({
        id: schema.playlistItems.id,
        postId: schema.playlistItems.postId,
        addedAt: schema.playlistItems.addedAt,
        postTitle: schema.posts.title,
      })
      .from(schema.playlistItems)
      .innerJoin(schema.posts, eq(schema.playlistItems.postId, schema.posts.id))
      .where(eq(schema.playlistItems.playlistId, playlistId));

    return NextResponse.json({ playlist, items });
  } catch (error) {
    console.error("Playlist GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlistId = parseInt(id, 10);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const postId = body.postId;

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const db = getDb();

    // Verify ownership
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, playlistId));

    if (!playlist || playlist.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if already in playlist
    const [existing] = await db
      .select()
      .from(schema.playlistItems)
      .where(
        and(
          eq(schema.playlistItems.playlistId, playlistId),
          eq(schema.playlistItems.postId, postId)
        )
      );

    if (existing) {
      return NextResponse.json({ error: "Already in playlist" }, { status: 400 });
    }

    // Add item
    const [newItem] = await db
      .insert(schema.playlistItems)
      .values({
        playlistId,
        postId,
      })
      .returning();

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error("Playlist POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlistId = parseInt(id, 10);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const postId = body.postId;

    const db = getDb();

    // Verify ownership
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, playlistId));

    if (!playlist || playlist.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (postId) {
      // Remove specific item
      await db
        .delete(schema.playlistItems)
        .where(
          and(
            eq(schema.playlistItems.playlistId, playlistId),
            eq(schema.playlistItems.postId, postId)
          )
        );
      return NextResponse.json({ success: true });
    } else {
      // Delete whole playlist
      await db
        .delete(schema.playlists)
        .where(eq(schema.playlists.id, playlistId));
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Playlist DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlistId = parseInt(id, 10);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    const isPublic = body.isPublic !== undefined ? (body.isPublic ? 1 : 0) : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Playlist name cannot be empty" }, { status: 400 });
    }

    const db = getDb();

    // Verify ownership
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, playlistId));

    if (!playlist || playlist.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: { name?: string; isPublic?: number } = {};
    if (name !== undefined) updateData.name = name;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const [updated] = await db
      .update(schema.playlists)
      .set(updateData)
      .where(eq(schema.playlists.id, playlistId))
      .returning();

    return NextResponse.json({ success: true, playlist: updated });
  } catch (error) {
    console.error("Playlist PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
