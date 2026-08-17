import { cache } from "react";
import { getDb, schema } from "@/db";
import { eq, and, desc, sql, inArray, isNotNull, asc } from "drizzle-orm";
import { formatPostItem } from "@/lib/posts";
import { getPresignedUrl } from "@/lib/storage";
import { PostItem, PlaylistSampleThumbnail } from "@/types";

export interface UserProfileData {
  id: number;
  username: string;
  createdAt: string;
  uploadCount: number;
  playlistCount: number;
  likeCount: number;
}

/**
 * Fetch public or full user profile metadata
 */
export const getUserProfile = cache(async function getUserProfile(
  username: string,
  viewer?: { id: number; isAdmin: boolean } | null,
): Promise<UserProfileData | null> {
  const db = getDb();

  const [user] = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);

  if (!user) return null;

  const isOwner = viewer && viewer.id === user.id;

  // 1. Upload count (visitors only count public uploads)
  const uploadConditions = [eq(schema.posts.userId, user.id)];
  if (!viewer) {
    uploadConditions.push(eq(schema.posts.channel, "public"));
  }

  const [[uploadCountRes], [playlistCountRes], [likeCountRes]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.posts)
      .where(and(...uploadConditions)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.playlists)
      .where(
        isOwner
          ? eq(schema.playlists.userId, user.id)
          : !viewer
          ? and(
              eq(schema.playlists.userId, user.id),
              eq(schema.playlists.channel, "public"),
              eq(schema.playlists.isPublic, 1)
            )
          : and(eq(schema.playlists.userId, user.id), eq(schema.playlists.isPublic, 1))
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.likes)
      .innerJoin(schema.posts, eq(schema.likes.postId, schema.posts.id))
      .where(
        !viewer
          ? and(
              eq(schema.likes.userId, user.id),
              eq(schema.likes.isLike, 1),
              eq(schema.posts.channel, "public")
            )
          : and(eq(schema.likes.userId, user.id), eq(schema.likes.isLike, 1))
      ),
  ]);

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
    uploadCount: uploadCountRes?.count ?? 0,
    playlistCount: playlistCountRes?.count ?? 0,
    likeCount: likeCountRes?.count ?? 0,
  };
});

/**
 * Fetch posts uploaded by a specific user
 */
export async function getUserUploads(
  userId: number,
  viewer?: { id: number; isAdmin: boolean } | null,
  limit = 30,
  offset = 0,
): Promise<{ posts: PostItem[]; total: number }> {
  const db = getDb();

  const conditions = [eq(schema.posts.userId, userId)];
  if (!viewer) {
    conditions.push(eq(schema.posts.channel, "public"));
  }

  const [countResult, postsRaw] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.posts)
      .where(and(...conditions)),
    db
      .select({
        id: schema.posts.id,
        slug: schema.posts.slug,
        title: schema.posts.title,
        description: schema.posts.description,
        userId: schema.posts.userId,
        categoryId: schema.posts.categoryId,
        channel: schema.posts.channel,
        views: schema.posts.views,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
      })
      .from(schema.posts)
      .where(and(...conditions))
      .orderBy(desc(schema.posts.createdAt))
      .offset(offset)
      .limit(limit),
  ]);

  const total = countResult[0]?.count ?? 0;
  const postIds = postsRaw.map((p) => p.id);

  if (postIds.length === 0) {
    return { posts: [], total };
  }

  const [allMedia, allPostTags, allCats, authorUser] = await Promise.all([
    db
      .select()
      .from(schema.media)
      .where(inArray(schema.media.postId, postIds))
      .orderBy(schema.media.orderIndex),
    db
      .select({
        postId: schema.postTags.postId,
        tagId: schema.tags.id,
        tagName: schema.tags.name,
        tagSlug: schema.tags.slug,
      })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(inArray(schema.postTags.postId, postIds)),
    db.select().from(schema.categories),
    db
      .select({ id: schema.users.id, username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .then((rows) => rows[0] || null),
  ]);

  const categoryMap = new Map(allCats.map((c) => [c.id, c.name]));

  const posts = await Promise.all(
    postsRaw.map((post) => {
      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const postTags = allPostTags
        .filter((pt) => pt.postId === post.id)
        .map((pt) => ({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug }));

      const categoryName = post.categoryId ? (categoryMap.get(post.categoryId) ?? null) : null;
      return formatPostItem(
        post,
        postMedia,
        postTags,
        categoryName,
        authorUser
      );
    }),
  );

  return { posts, total };
}

/**
 * Fetch videos liked by a specific user
 */
export async function getUserLikedVideos(
  userId: number,
  viewer?: { id: number; isAdmin: boolean } | null,
  limit = 30,
  offset = 0,
): Promise<{ posts: PostItem[]; total: number }> {
  const db = getDb();

  const conditions = [
    eq(schema.likes.userId, userId),
    eq(schema.likes.isLike, 1),
  ];

  if (!viewer) {
    conditions.push(eq(schema.posts.channel, "public"));
  }

  const [countResult, likedRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.likes)
      .innerJoin(schema.posts, eq(schema.likes.postId, schema.posts.id))
      .where(and(...conditions)),
    db
      .select({
        id: schema.posts.id,
        slug: schema.posts.slug,
        title: schema.posts.title,
        description: schema.posts.description,
        userId: schema.posts.userId,
        categoryId: schema.posts.categoryId,
        channel: schema.posts.channel,
        views: schema.posts.views,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
      })
      .from(schema.likes)
      .innerJoin(schema.posts, eq(schema.likes.postId, schema.posts.id))
      .where(and(...conditions))
      .orderBy(desc(schema.likes.createdAt))
      .offset(offset)
      .limit(limit),
  ]);

  const total = countResult[0]?.count ?? 0;
  const postIds = likedRows.map((p) => p.id);
  const authorUserIds = Array.from(new Set(likedRows.map((p) => p.userId)));

  if (postIds.length === 0) {
    return { posts: [], total };
  }

  const [allMedia, allPostTags, allCats, allUsers] = await Promise.all([
    db
      .select()
      .from(schema.media)
      .where(inArray(schema.media.postId, postIds))
      .orderBy(schema.media.orderIndex),
    db
      .select({
        postId: schema.postTags.postId,
        tagId: schema.tags.id,
        tagName: schema.tags.name,
        tagSlug: schema.tags.slug,
      })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(inArray(schema.postTags.postId, postIds)),
    db.select().from(schema.categories),
    authorUserIds.length > 0
      ? db
          .select({ id: schema.users.id, username: schema.users.username })
          .from(schema.users)
          .where(inArray(schema.users.id, authorUserIds))
      : [],
  ]);

  const categoryMap = new Map(allCats.map((c) => [c.id, c.name]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const posts = await Promise.all(
    likedRows.map((post) => {
      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const postTags = allPostTags
        .filter((pt) => pt.postId === post.id)
        .map((pt) => ({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug }));

      const categoryName = post.categoryId ? (categoryMap.get(post.categoryId) ?? null) : null;
      const author = userMap.get(post.userId) || null;
      return formatPostItem(
        post,
        postMedia,
        postTags,
        categoryName,
        author
      );
    }),
  );

  return { posts, total };
}

/**
 * Fetch playlists created by user with sample thumbnails
 */
export async function getUserPlaylists(
  userId: number,
  isOwner: boolean,
  viewer?: { id: number; isAdmin: boolean } | null,
) {
  const db = getDb();

  const playlistConditions = [eq(schema.playlists.userId, userId)];
  if (!isOwner) {
    if (!viewer) {
      playlistConditions.push(eq(schema.playlists.channel, "public"), eq(schema.playlists.isPublic, 1));
    } else {
      playlistConditions.push(eq(schema.playlists.isPublic, 1));
    }
  }

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
    .where(and(...playlistConditions))
    .groupBy(schema.playlists.id)
    .orderBy(desc(schema.playlists.createdAt));

  const playlistIds = playlistsData.map((p) => p.id);
  const playlistThumbnailsMap: Record<number, PlaylistSampleThumbnail[]> = {};

  if (playlistIds.length > 0) {
    const { or } = await import("drizzle-orm");
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
  }

  return playlistsData.map((p) => ({
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    sampleThumbnails: playlistThumbnailsMap[p.id] || [],
  }));
}
