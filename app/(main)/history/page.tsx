import "server-only";
import { getDb, schema } from "@/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getPresignedUrl } from "@/lib/storage";
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Watch History</h1>
        <p className="text-gray-500">No videos watched yet.</p>
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
    .where(inArray(schema.media.postId, postIds));

  // Build result maintaining history order
  const result = await Promise.all(
    historyEntries.map(async (entry) => {
      const post = posts.find(p => p.id === entry.postId);
      if (!post) return null;

      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const hasVideo = postMedia.some((m) => m.mediaType === "video");
      const hasImage = postMedia.some((m) => m.mediaType === "image");
      const firstMedia = postMedia[0];

      let thumbnailUrl = null;
      if (firstMedia?.thumbnailKey) {
        thumbnailUrl = await getPresignedUrl(firstMedia.thumbnailKey);
      }

      let videoUrl = null;
      const firstVideo = postMedia.find((m) => m.mediaType === "video");
      if (firstVideo?.storageKey) {
        videoUrl = await getPresignedUrl(firstVideo.storageKey);
      }

      return {
        id: post.id,
        title: post.title,
        description: post.description,
        createdAt: entry.watchedAt, // Display watchedAt instead of createdAt
        tags: [],
        mediaCount: postMedia.length,
        mediaType: (hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image") as "image" | "video" | "mixed",
        thumbnailUrl,
        videoUrl,
        duration: firstMedia?.duration || null,
        category: null,
      };
    })
  );

  const finalPosts = result.filter(p => p !== null) as any[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 dark:text-white">Watch History</h1>
      <FeedClient
        isAdmin={user.isAdmin}
        initialPosts={finalPosts}
        initialTotal={finalPosts.length}
        initialPage={1}
        initialSort="newest"
        tags={[]}
      />
    </div>
  );
}
