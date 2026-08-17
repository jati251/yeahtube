import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, sql, and, or, inArray, isNotNull, asc } from "drizzle-orm";
import { getPresignedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const isPublicQuery = searchParams.get("public") === "true";
    const searchQuery = searchParams.get("q");
    const sortBy = searchParams.get("sort") || "recent"; // "recent" | "popular"
    const targetPostId = parseInt(searchParams.get("postId") || "", 10);

    const db = getDb();

    // Query playlists with videoCount, likesCount, and author username
    const baseWhere = isPublicQuery
      ? or(eq(schema.playlists.isPublic, 1), eq(schema.playlists.userId, user.id))
      : eq(schema.playlists.userId, user.id);

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
        userLiked: sql<boolean>`exists(select 1 from playlist_likes where playlist_likes.playlist_id = "playlists"."id" and playlist_likes.user_id = ${user.id})`,
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

    // Fetch sample thumbnail keys for these playlists
    const playlistIds = playlistsData.map((p) => p.id);
    const playlistThumbnailsMap: Record<number, { id: number; thumbnailUrl: string }[]> = {};

    if (playlistIds.length > 0) {
      const sampleMediaItems = await db
        .select({
          playlistId: schema.playlistItems.playlistId,
          postId: schema.playlistItems.postId,
          thumbnailKey: schema.media.thumbnailKey,
          storageKey: schema.media.storageKey,
          mediaType: schema.media.mediaType,
        })
        .from(schema.playlistItems)
        .innerJoin(schema.media, eq(schema.playlistItems.postId, schema.media.postId))
        .where(
          and(
            inArray(schema.playlistItems.playlistId, playlistIds),
            or(isNotNull(schema.media.thumbnailKey), isNotNull(schema.media.storageKey)),
          ),
        )
        .orderBy(desc(schema.playlistItems.addedAt), asc(schema.media.orderIndex));

      const seenPerPlaylist = new Map<number, Set<number>>();
      const itemsToResolve: { playlistId: number; id: number; key: string }[] = [];

      for (const item of sampleMediaItems) {
        const keyToResolve = item.thumbnailKey || item.storageKey;
        if (!keyToResolve) continue;
        if (!seenPerPlaylist.has(item.playlistId)) {
          seenPerPlaylist.set(item.playlistId, new Set());
        }
        const seen = seenPerPlaylist.get(item.playlistId)!;
        if (seen.size < 5 && !seen.has(item.postId)) {
          seen.add(item.postId);
          itemsToResolve.push({
            playlistId: item.playlistId,
            id: item.postId,
            key: keyToResolve,
          });
        }
      }

      const resolved = await Promise.all(
        itemsToResolve.map(async (it) => {
          try {
            const url = await getPresignedUrl(it.key);
            return {
              playlistId: it.playlistId,
              id: it.id,
              thumbnailUrl: url,
            };
          } catch {
            return null;
          }
        }),
      );

      for (const res of resolved) {
        if (!res || !res.thumbnailUrl) continue;
        if (!playlistThumbnailsMap[res.playlistId]) {
          playlistThumbnailsMap[res.playlistId] = [];
        }
        playlistThumbnailsMap[res.playlistId].push({
          id: res.id,
          thumbnailUrl: res.thumbnailUrl,
        });
      }
    }

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
