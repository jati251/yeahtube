import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getTrendingPosts } from "@/lib/queries";
import { MediaCard } from "@/components/media/MediaCard";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Trending - Yeahtube",
};

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const user = await getCurrentUser();
  const trendingPosts = await getTrendingPosts(20, user);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8 flex items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Trending
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Most liked videos right now</p>
        </div>
      </div>

      {trendingPosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {trendingPosts.map((post, index) => (
            <div key={post.id} className="relative">
              <div className="mb-2 font-mono text-xs tabular-nums text-muted">
                {String(index + 1).padStart(2, "0")}
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
