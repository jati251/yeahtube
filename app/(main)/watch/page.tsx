import "server-only";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { formatDurationISO } from "@/utils";
import { WatchPageClient } from "./[id]/WatchPageClient";
import { SITE_URL } from "@/constants";

export const dynamic = "force-dynamic";

interface WatchQueryPageProps {
  searchParams: Promise<{ v?: string; id?: string }>;
}

export async function generateMetadata({ searchParams }: WatchQueryPageProps): Promise<Metadata> {
  const { v, id } = await searchParams;
  const targetIdOrSlug = v || id;
  if (!targetIdOrSlug) {
    return {
      title: "Video Not Found",
    };
  }

  const user = await getCurrentUser();
  let channelPref: string | undefined = undefined;
  if (user) {
    const cookieStore = await cookies();
    if (cookieStore.get("show-public-posts")?.value === "false") {
      channelPref = "private";
    }
  }
  const detail = await getPostDetail(targetIdOrSlug, user, channelPref);

  if (!detail || !detail.post) {
    return {
      title: "Video Not Found",
    };
  }

  const { post, videos, tags } = detail;
  const description = post.description || `Watch ${post.title} on YeahTube`;
  const primaryThumb = videos[0]?.thumbnailUrl;
  const primaryVideo = videos[0];

  const siteUrl = SITE_URL;
  const canonicalWatchUrl = `${siteUrl}/watch?v=${post.slug || post.id}`;
  const embedUrl = `${siteUrl}/embed/${post.slug || post.id}`;

  const absoluteThumb = primaryThumb
    ? primaryThumb.startsWith("http")
      ? primaryThumb
      : `${siteUrl}${primaryThumb.startsWith("/") ? "" : "/"}${primaryThumb}`
    : `${siteUrl}/icon.png`;

  const absoluteVideoStreamUrl = primaryVideo?.streamUrl
    ? primaryVideo.streamUrl.startsWith("http")
      ? primaryVideo.streamUrl
      : `${siteUrl}${primaryVideo.streamUrl.startsWith("/") ? "" : "/"}${primaryVideo.streamUrl}`
    : undefined;

  return {
    title: post.title,
    description,
    keywords: tags.map((t) => t.name),
    alternates: {
      types: {
        "application/json+oembed": `${siteUrl}/api/oembed?url=${encodeURIComponent(canonicalWatchUrl)}&format=json`,
      },
    },
    openGraph: {
      title: post.title,
      description,
      type: "video.other",
      url: canonicalWatchUrl,
      siteName: "YeahTube",
      images: [
        {
          url: absoluteThumb,
          secureUrl: absoluteThumb,
          width: primaryVideo?.width || 1280,
          height: primaryVideo?.height || 720,
          alt: post.title,
        },
      ],
      videos: absoluteVideoStreamUrl
        ? [
            {
              url: absoluteVideoStreamUrl,
              secureUrl: absoluteVideoStreamUrl,
              type: primaryVideo?.mimeType || "video/mp4",
              width: primaryVideo?.width ?? 1280,
              height: primaryVideo?.height ?? 720,
            },
            {
              url: embedUrl,
              secureUrl: embedUrl,
              type: "text/html",
              width: primaryVideo?.width ?? 1280,
              height: primaryVideo?.height ?? 720,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [absoluteThumb],
    },
  };
}

export default async function WatchPage({ searchParams }: WatchQueryPageProps) {
  const { v, id } = await searchParams;
  const targetIdOrSlug = v || id;

  if (!targetIdOrSlug) {
    redirect("/");
  }

  const user = await getCurrentUser();
  let channelPref: string | undefined = undefined;
  if (user) {
    const cookieStore = await cookies();
    if (cookieStore.get("show-public-posts")?.value === "false") {
      channelPref = "private";
    }
  }
  const detail = await getPostDetail(targetIdOrSlug, user, channelPref);

  if (detail?.isPrivate && !user) {
    redirect(`/login?redirect=/watch?v=${targetIdOrSlug}`);
  }

  if (!detail || !detail.post || detail.videos.length === 0) {
    notFound();
  }

  const { post, videos, tags } = detail;
  const primaryVideo = videos[0];
  const siteUrl = SITE_URL;
  const watchUrl = `${siteUrl}/watch?v=${post.slug || post.id}`;

  // Google VideoObject JSON-LD Schema (Compliant with Google Video Search Rich Snippets)
  const absoluteThumbnails = videos
    .map((v) => v.thumbnailUrl)
    .filter(Boolean)
    .map((thumb) => (thumb!.startsWith("http") ? thumb! : `${siteUrl}${thumb}`));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.title,
    description: post.description || `Watch ${post.title} on YeahTube`,
    thumbnailUrl: absoluteThumbnails.length > 0 ? absoluteThumbnails : [`${siteUrl}/icon`],
    uploadDate: new Date(post.createdAt).toISOString(),
    duration: formatDurationISO(primaryVideo?.duration) || "PT0S",
    contentUrl: primaryVideo?.streamUrl
      ? primaryVideo.streamUrl.startsWith("http")
        ? primaryVideo.streamUrl
        : `${siteUrl}${primaryVideo.streamUrl}`
      : undefined,
    embedUrl: watchUrl,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: { "@type": "WatchAction" },
        userInteractionCount: post.views || 0,
      },
    ],
    author: post.author
      ? {
          "@type": "Person",
          name: post.author.username,
          url: `${siteUrl}/user/${post.author.username}`,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "YeahTube",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon`,
      },
    },
    isFamilyFriendly: true,
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
