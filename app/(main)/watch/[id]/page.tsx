import "server-only";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { formatDurationISO } from "@/utils";
import { WatchPageClient } from "./WatchPageClient";
import { RouteIdPageProps } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: RouteIdPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || !detail.post) {
    return {
      title: "Video Not Found",
    };
  }

  const { post, videos, tags } = detail;
  const description = post.description || `Watch ${post.title} on YeahTube`;
  const primaryThumb = videos[0]?.thumbnailUrl;
  const images = primaryThumb ? [primaryThumb] : [];
  const primaryVideo = videos[0];

  return {
    title: post.title,
    description,
    keywords: tags.map((t) => t.name),
    openGraph: {
      title: post.title,
      description,
      type: "video.other",
      images: images.map((img) => ({
        url: img,
        width: primaryVideo?.width || 1280,
        height: primaryVideo?.height || 720,
        alt: post.title,
      })),
      videos: primaryVideo
        ? [
            {
              url: primaryVideo.streamUrl,
              type: primaryVideo.mimeType || "video/mp4",
              width: primaryVideo.width ?? undefined,
              height: primaryVideo.height ?? undefined,
            },
          ]
        : undefined,
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

  if (detail?.isPrivate && !user) {
    redirect(`/login?redirect=/watch/${id}`);
  }

  if (!detail || !detail.post || detail.videos.length === 0) {
    notFound();
  }

  const { post, videos, tags } = detail;
  const primaryVideo = videos[0];
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yeahtube.local";

  // Google VideoObject JSON-LD Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.title,
    description: post.description || post.title,
    thumbnailUrl: videos.map((v) => v.thumbnailUrl).filter(Boolean),
    uploadDate: new Date(post.createdAt).toISOString(),
    duration: formatDurationISO(primaryVideo?.duration),
    contentUrl: primaryVideo?.streamUrl
      ? primaryVideo.streamUrl.startsWith("http")
        ? primaryVideo.streamUrl
        : `${siteUrl}${primaryVideo.streamUrl}`
      : undefined,
    embedUrl: `${siteUrl}/watch/${post.id}`,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: { "@type": "WatchAction" },
        userInteractionCount: post.views || 0,
      },
    ],
    keywords: tags.map((t) => t.name).join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WatchPageClient
        post={detail.post}
        canEdit={detail.canEdit}
        videos={detail.videos}
        images={detail.images}
        tags={detail.tags}
        recommendations={detail.recommendations}
      />
    </>
  );
}
