import "server-only";
import { getFeedPosts } from "@/lib/queries/posts";
import { ShortsClient } from "./ShortsClient";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const params = new URLSearchParams({ limit: "15", sort: "random", type: "video" });
  const { posts, total } = await getFeedPosts(params);

  return <ShortsClient initialPosts={posts} initialTotal={total} />;
}
