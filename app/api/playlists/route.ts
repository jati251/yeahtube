import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, sql, and, or } from "drizzle-orm";
import { resolvePlaylistSampleThumbnails } from "@/lib/queries/playlists";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const isPublicQuery = searchParams.get("public") === "true";

    if (!user && !isPublicQuery) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchQuery = searchParams.get("q");
    const sortBy = searchParams.get("sort") || "recent"; // "recent" | "popular"
    const targetPostId = parseInt(searchParams.get("postId") || "", 10);
    const channelParam = searchParams.get("channel");

    const db = getDb();

    // Query playlists with videoCount, likesCount, and author username
    let baseWhere;
    if (!user) {
      // Non-logged-in visitors ONLY see public channel playlists that are set to public
      baseWhere = and(
        eq(schema.playlists.channel, "public"),
        eq(schema.playlists.isPublic, 1),
      );
    } else if (channelParam === "private") {
      baseWhere = and(
        eq(schema.playlists.userId, user.id),
        eq(schema.playlists.channel, "private"),
      );
    } else if (channelParam === "public") {
      baseWhere = and(
        eq(schema.playlists.channel, "public"),
        eq(schema.playlists.isPublic, 1),
      );
    } else if (isPublicQuery) {
      // Public browse: show all public playlists, plus any playlists owned by the current user
      baseWhere = or(
        and(
          eq(schema.playlists.channel, "public"),
          eq(schema.playlists.isPublic, 1),
        ),
        eq(schema.playlists.userId, user.id),
      );
    } else {
      // Personal playlist management (e.g. Save to Playlist modal)
      baseWhere = eq(schema.playlists.userId, user.id);
    }

    const whereClause = searchQuery
      ? and(baseWhere, sql`lower(${schema.playlists.name}) LIKE ${`%${searchQuery.toLowerCase()}%`}`)
      : baseWhere;

    const playlistsData = await db
      .select({
        id: schema.playlists.id,
        name: schema.playlists.name,
        channel: schema.playlists.channel,
        isPublic: schema.playlists.isPublic,
        createdAt: schema.playlists.createdAt,
        userId: schema.playlists.userId,
        username: schema.users.username,
        videoCount: sql<number>`count(distinct ${schema.playlistItems.id})::int`,
        likesCount: sql<number>`(select count(*)::int from playlist_likes where playlist_likes.playlist_id = "playlists"."id")`,
        userLiked: user
          ? sql<boolean>`exists(select 1 from playlist_likes where playlist_likes.playlist_id = "playlists"."id" and playlist_likes.user_id = ${user.id})`
          : sql<boolean>`false`,
        containsPost: !isNaN(targetPostId)
          ? sql<boolean>`exists(select 1 from playlist_items where playlist_items.playlist_id = "playlists"."id" and playlist_items.post_id = ${targetPostId})`
          : sql<boolean>`false`,
      })
      .from(schema.playlists)
      .leftJoin(schema.users, eq(schema.playlists.userId, schema.users.id))
      .leftJoin(schema.playlistItems, eq(schema.playlists.id, schema.playlistItems.playlistId))
      .where(whereClause)
      .groupBy(schema.playlists.id, schema.users.id)
      .orderBy(
        sortBy === "popular"
          ? desc(sql`(select count(*)::int from playlist_likes where playlist_likes.playlist_id = "playlists"."id")`)
          : desc(schema.playlists.createdAt),
      );

    // Fetch sample thumbnails using shared helper
    const playlistIds = playlistsData.map((p) => p.id);
    const playlistThumbnailsMap = await resolvePlaylistSampleThumbnails(playlistIds, db);

    const playlistsWithThumbnails = playlistsData.map((p) => ({
      ...p,
      sampleThumbnails: playlistThumbnailsMap[p.id] || [],
    }));

    return NextResponse.json({ playlists: playlistsWithThumbnails });
  } catch (error) {
    console.error("Playlists GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = body.name?.trim();
    const channel = body.channel === "public" ? "public" : "private";
    const isPublic = body.isPublic ? 1 : 0;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const db = getDb();

    const [newPlaylist] = await db
      .insert(schema.playlists)
      .values({
        userId: user.id,
        name,
        channel,
        isPublic,
      })
      .returning();

    return NextResponse.json({ success: true, playlist: newPlaylist });
  } catch (error) {
    console.error("Playlists POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
