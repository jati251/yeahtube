import "server-only";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { WatchPageClient } from "./WatchPageClient";
import { RouteIdPageProps } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: RouteIdPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || !detail.post) {
    return {
      title: "Video Not Found - YeahTube",
    };
  }

  const { post, videos } = detail;
  const description = post.description || `Watch ${post.title} on YeahTube`;
  const primaryThumb = videos[0]?.thumbnailUrl;
  const images = primaryThumb ? [primaryThumb] : [];

  return {
    title: `${post.title} - YeahTube`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "video.other",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images,
    },
  };
}

export default async function WatchPage({ params }: RouteIdPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || detail.videos.length === 0) {
    notFound();
  }

  return (
    <WatchPageClient
      post={detail.post}
      canEdit={detail.canEdit}
      videos={detail.videos}
      images={detail.images}
      tags={detail.tags}
      recommendations={detail.recommendations}
    />
  );
}
