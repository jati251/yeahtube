import "server-only";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { eq, desc, inArray } from "drizzle-orm";
import { formatPostItem } from "@/lib/posts";

export const getUserWatchHistory = cache(async (userId: number) => {
  const db = getDb();

  const rawHistoryEntries = await db
    .select({
      historyId: schema.watchHistory.id,
      watchedAt: schema.watchHistory.watchedAt,
      id: schema.posts.id,
      title: schema.posts.title,
      description: schema.posts.description,
      createdAt: schema.posts.createdAt,
      views: schema.posts.views,
    })
    .from(schema.watchHistory)
    .innerJoin(schema.posts, eq(schema.watchHistory.postId, schema.posts.id))
    .where(eq(schema.watchHistory.userId, userId))
    .orderBy(desc(schema.watchHistory.watchedAt));

  // Deduplicate by postId to keep only the most recent watch event per post
  const seenPostIds = new Set<number>();
  const historyEntries = rawHistoryEntries.filter((entry) => {
    if (seenPostIds.has(entry.id)) return false;
    seenPostIds.add(entry.id);
    return true;
  });

  const postIds = historyEntries.map((h) => h.id);
  const mediaRecords = postIds.length > 0
    ? await db.select().from(schema.media).where(inArray(schema.media.postId, postIds)).orderBy(schema.media.orderIndex)
    : [];

  return Promise.all(
    historyEntries.map(async (entry) => {
      const postMedia = mediaRecords.filter((m) => m.postId === entry.id);
      const formatted = await formatPostItem(entry, postMedia, [], null);
      return {
        ...formatted,
        watchedAt: entry.watchedAt,
      };
    }),
  );
});
