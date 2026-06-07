import "server-only";
import { getDb, schema } from "@/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatPostItem } from "@/lib/posts";
import { redirect } from "next/navigation";
import { FeedClient } from "../FeedClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const db = getDb();

  const historyEntries = await db
    .select({
      postId: schema.watchHistory.postId,
      watchedAt: schema.watchHistory.watchedAt,
    })
    .from(schema.watchHistory)
    .where(eq(schema.watchHistory.userId, user.id))
    .orderBy(desc(schema.watchHistory.watchedAt))
    .limit(50);

  if (historyEntries.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Watch History</h1>
        <p className="text-zinc-500 dark:text-zinc-400">No videos watched yet.</p>
      </div>
    );
  }

  const postIds = historyEntries.map(e => e.postId);

  const posts = await db
    .select()
    .from(schema.posts)
    .where(inArray(schema.posts.id, postIds));

  const allMedia = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.postId, postIds))
    .orderBy(schema.media.orderIndex);

  // Build result maintaining history order
  const result = await Promise.all(
    historyEntries.map(async (entry) => {
      const post = posts.find(p => p.id === entry.postId);
      if (!post) return null;

      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const formatted = await formatPostItem(post, postMedia, [], null);

      return {
        ...formatted,
        createdAt: entry.watchedAt, // Display watchedAt instead of createdAt
      };
    })
  );

  const finalPosts = result.filter(p => p !== null) as any[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">Watch History</h1>
      <FeedClient
        isAdmin={user.isAdmin}
        initialPosts={finalPosts}
        initialTotal={finalPosts.length}
        initialPage={1}
        initialSort="newest"
        tags={[]}
        categories={[]}
      />
    </div>
  );
}
