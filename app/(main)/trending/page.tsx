import { Metadata } from "next";
import { MediaCard } from "@/components/media/MediaCard";
import { getTrendingPosts } from "@/lib/queries";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Trending - Yeahtube",
};

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const trendingPosts = await getTrendingPosts(20);

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
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {trendingPosts.map((post, index) => (
            <div key={post.id} className="relative">
              <div className="absolute -left-2.5 -top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-red-500 text-xs font-bold text-white shadow-md dark:border-zinc-950">
                #{index + 1}
              </div>
              <MediaCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <TrendingUp className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">No trending posts yet</h3>
          <p className="text-zinc-500">Wait for users to start liking some content.</p>
        </div>
      )}
    </div>
  );
}
