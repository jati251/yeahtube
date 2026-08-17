import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserWatchHistory } from "@/lib/queries";
import { FeedClient } from "../FeedClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const finalPosts = await getUserWatchHistory(user.id);

  if (finalPosts.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Watch History</h1>
        <p className="text-zinc-500 dark:text-zinc-400">No videos watched yet.</p>
      </div>
    );
  }

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
        disableFilters={true}
      />
    </div>
  );
}
