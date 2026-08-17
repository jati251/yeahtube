import "server-only";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { eq, desc, sql, inArray, and, or, isNotNull, asc } from "drizzle-orm";
import { getPresignedUrl } from "@/lib/storage";
import { formatPostItem } from "@/lib/posts";
import { PlaylistSampleThumbnail } from "@/types";

/**
 * Resolves up to 5 sample presigned thumbnails per playlist efficiently in batch.
 */
export async function resolvePlaylistSampleThumbnails(
  playlistIds: number[],
  db: ReturnType<typeof getDb> = getDb(),
): Promise<Record<number, PlaylistSampleThumbnail[]>> {
  const playlistThumbnailsMap: Record<number, PlaylistSampleThumbnail[]> = {};
  if (playlistIds.length === 0) return playlistThumbnailsMap;

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

  const resolvedThumbnails = await Promise.all(
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

  for (const res of resolvedThumbnails) {
    if (!res || !res.thumbnailUrl) continue;
    if (!playlistThumbnailsMap[res.playlistId]) {
      playlistThumbnailsMap[res.playlistId] = [];
    }
    playlistThumbnailsMap[res.playlistId].push({
      id: res.id,
      thumbnailUrl: res.thumbnailUrl,
    });
  }

  return playlistThumbnailsMap;
}

/**
 * Fetch all playlists owned by user with their 5 dynamic sample thumbnails.
 */
export const getUserPlaylistsWithThumbnails = cache(async (userId: number) => {
  const db = getDb();

  const playlistsData = await db
    .select({
      id: schema.playlists.id,
      name: schema.playlists.name,
      channel: schema.playlists.channel,
      isPublic: schema.playlists.isPublic,
      createdAt: schema.playlists.createdAt,
      videoCount: sql<number>`count(distinct ${schema.playlistItems.id})::int`,
    })
    .from(schema.playlists)
    .leftJoin(schema.playlistItems, eq(schema.playlists.id, schema.playlistItems.playlistId))
    .where(eq(schema.playlists.userId, userId))
    .groupBy(schema.playlists.id)
    .orderBy(desc(schema.playlists.createdAt));

  const playlistIds = playlistsData.map((p) => p.id);
  const playlistThumbnailsMap = await resolvePlaylistSampleThumbnails(playlistIds, db);

  return playlistsData.map((p) => ({
    ...p,
    sampleThumbnails: playlistThumbnailsMap[p.id] || [],
  }));
});

/**
 * Fetch detailed playlist data, formatted posts, author, and like status.
 */
export const getPlaylistDetails = cache(async (playlistId: number, currentUserId?: number) => {
  const db = getDb();

  const [playlist] = await db
    .select()
    .from(schema.playlists)
    .where(eq(schema.playlists.id, playlistId));

  if (!playlist) {
    return { notFound: true as const, playlist: null, posts: [], author: null, likes: 0, userLiked: false };
  }

  // Visibility guard
  if (!currentUserId) {
    // Non-logged in visitor can only view public channel & shared playlists
    if (playlist.channel !== "public" || !playlist.isPublic) {
      return { isPrivate: true as const, playlist, posts: [], author: null, likes: 0, userLiked: false };
    }
  } else if (!playlist.isPublic && currentUserId !== playlist.userId) {
    // Logged in non-owner can only view shared playlists
    return { isPrivate: true as const, playlist, posts: [], author: null, likes: 0, userLiked: false };
  }

  // Fetch playlist items
  const itemConditions = [eq(schema.playlistItems.playlistId, playlistId)];
  if (!currentUserId) {
    itemConditions.push(eq(schema.posts.channel, "public"));
  } else if (currentUserId !== playlist.userId) {
    itemConditions.push(
      or(
        eq(schema.posts.channel, "public"),
        eq(schema.posts.userId, currentUserId),
      )!,
    );
  }

  const items = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      title: schema.posts.title,
      description: schema.posts.description,
      channel: schema.posts.channel,
      createdAt: schema.posts.createdAt,
      views: schema.posts.views,
    })
    .from(schema.playlistItems)
    .innerJoin(schema.posts, eq(schema.playlistItems.postId, schema.posts.id))
    .where(and(...itemConditions))
    .orderBy(desc(schema.playlistItems.addedAt));

  const postIds = items.map((i) => i.id);
  const mediaRecords = postIds.length > 0
    ? await db.select().from(schema.media).where(inArray(schema.media.postId, postIds)).orderBy(schema.media.orderIndex)
    : [];

  const posts = await Promise.all(
    items.map(async (post) => {
      const postMedia = mediaRecords.filter((m) => m.postId === post.id);
      return formatPostItem(post, postMedia, [], null);
    }),
  );

  // Likes and author
  const [likesResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(schema.playlistLikes)
    .where(eq(schema.playlistLikes.playlistId, playlistId));

  const totalLikes = likesResult?.count || 0;

  let userLiked = false;
  if (currentUserId) {
    const [existing] = await db
      .select()
      .from(schema.playlistLikes)
      .where(
        and(
          eq(schema.playlistLikes.userId, currentUserId),
          eq(schema.playlistLikes.playlistId, playlistId),
        ),
      );
    userLiked = Boolean(existing);
  }

  const [author] = await db
    .select({ username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.id, playlist.userId));

  return {
    notFound: false as const,
    isPrivate: false as const,
    playlist,
    posts,
    author,
    likes: totalLikes,
    userLiked,
  };
});
