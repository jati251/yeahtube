import "server-only";
import { getFeedPosts } from "@/lib/queries/posts";
import { ShortsClient } from "./ShortsClient";

import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const user = await getCurrentUser();
  const params = new URLSearchParams({ limit: "15", sort: "random", type: "video" });
  const { posts, total } = await getFeedPosts(params, user);

  return <ShortsClient initialPosts={posts} initialTotal={total} />;
}
