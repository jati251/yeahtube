import { Metadata } from "next";
import { getDb, schema } from "@/db";
import { desc, eq, sql, inArray } from "drizzle-orm";
import { MediaCard } from "@/components/media/MediaCard";
import { formatPostItem } from "@/lib/posts";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Trending - Yeahtube",
};

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const db = getDb();

  // Get top 20 posts with the most likes
  const trendingQuery = await db
    .select({
      postId: schema.likes.postId,
      likeCount: sql<number>`count(${schema.likes.id})::int`,
    })
    .from(schema.likes)
    .where(eq(schema.likes.isLike, 1))
    .groupBy(schema.likes.postId)
    .orderBy(desc(sql<number>`count(${schema.likes.id})::int`))
    .limit(20);

  let trendingPosts: any[] = [];

  if (trendingQuery.length > 0) {
    const postIds = trendingQuery.map((t) => t.postId);
    const posts = await db
      .select()
      .from(schema.posts)
      .where(inArray(schema.posts.id, postIds));

    // Get media for these posts
    const allMedia = await db
      .select()
      .from(schema.media)
      .where(inArray(schema.media.postId, postIds));

    // Get categories
    let categoryMap = new Map<number, string>();
    try {
      const allCats = await db.select().from(schema.categories);
      categoryMap = new Map(allCats.map((c) => [c.id, c.name]));
    } catch {}

    // Map and order by trending position
    trendingPosts = await Promise.all(
      trendingQuery.map(async (t) => {
        const post = posts.find((p) => p.id === t.postId);
        if (!post) return null;

        const postMedia = allMedia.filter((m) => m.postId === post.id);
        const categoryName = post.categoryId ? (categoryMap.get(post.categoryId) ?? null) : null;
        
        const formatted = await formatPostItem(post, postMedia, [], categoryName);
        return {
          ...formatted,
          likeCount: t.likeCount,
        };
      })
    );
    
    trendingPosts = trendingPosts.filter((p) => p !== null);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Trending
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Most liked videos right now</p>
        </div>
      </div>

      {trendingPosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {trendingPosts.map((post: any, index: number) => (
            <div key={post.id} className="relative">
              <div className="absolute -left-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-500 font-bold text-white shadow-md dark:border-zinc-950">
                #{index + 1}
              </div>
              <MediaCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-none border-2 border-dashed border-zinc-200 dark:border-zinc-800">
          <TrendingUp className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">No trending posts yet</h3>
          <p className="text-zinc-500">Wait for users to start liking some content.</p>
        </div>
      )}
    </div>
  );
}
