import "server-only";
import { getFeedPosts } from "@/lib/queries/posts";
import { ShortsClient } from "./ShortsClient";

import { getCurrentUser } from "@/lib/auth";

import type { Metadata } from "next";
import { SITE_URL } from "@/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shorts — YeahTube",
  description: "Watch trending short videos, clips, and highlights on YeahTube.",
  alternates: {
    canonical: `${SITE_URL}/shorts`,
  },
  openGraph: {
    title: "Shorts — YeahTube",
    description: "Watch trending short videos, clips, and highlights on YeahTube.",
    url: `${SITE_URL}/shorts`,
    siteName: "YeahTube",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shorts — YeahTube",
    description: "Watch trending short videos, clips, and highlights on YeahTube.",
  },
};

export default async function ShortsPage() {
  const user = await getCurrentUser();
  const params = new URLSearchParams({ limit: "15", sort: "random", type: "video" });
  const { posts, total } = await getFeedPosts(params, user);

  return <ShortsClient initialPosts={posts} initialTotal={total} />;
}
