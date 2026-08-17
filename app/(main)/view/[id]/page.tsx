import "server-only";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { ViewPageClient } from "./ViewPageClient";
import { RouteIdPageProps } from "@/types";
import { SITE_URL } from "@/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: RouteIdPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || !detail.post) {
    return {
      title: "Post Not Found",
    };
  }

  const { post, images: galleryImages, tags } = detail;
  const description = post.description || `View ${post.title} photos on YeahTube`;
  const primaryImage = galleryImages[0]?.imageUrl || galleryImages[0]?.thumbnailUrl;
  const images = primaryImage ? [primaryImage] : [];

  return {
    title: post.title,
    description,
    keywords: tags.map((t) => t.name),
    openGraph: {
      title: post.title,
      description,
      type: "article",
      images: galleryImages.map((img) => ({
        url: img.imageUrl || img.thumbnailUrl || "",
        width: img.width || 1200,
        height: img.height || 800,
        alt: post.title,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images,
    },
  };
}

export default async function ViewPage({ params }: RouteIdPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (detail?.isPrivate && !user) {
    redirect(`/login?redirect=/view/${id}`);
  }

  if (!detail || !detail.post || detail.images.length === 0) {
    notFound();
  }

  const { post, images: galleryImages, tags } = detail;
  const siteUrl = SITE_URL;

  // Google ImageGallery / ImageObject JSON-LD Schema for Google Images
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: post.title,
    description: post.description || `View ${post.title} photo gallery on YeahTube`,
    url: `${siteUrl}/view/${post.id}`,
    datePublished: new Date(post.createdAt).toISOString(),
    keywords: tags.map((t) => t.name).join(", "),
    image: galleryImages.map((img) => {
      const fullImageUrl = img.imageUrl?.startsWith("http")
        ? img.imageUrl
        : `${siteUrl}${img.imageUrl || img.thumbnailUrl}`;
      const fullThumbUrl = img.thumbnailUrl?.startsWith("http")
        ? img.thumbnailUrl
        : `${siteUrl}${img.thumbnailUrl || img.imageUrl}`;
      return {
        "@type": "ImageObject",
        contentUrl: fullImageUrl,
        thumbnailUrl: fullThumbUrl,
        width: img.width,
        height: img.height,
        name: post.title,
        description: post.description || post.title,
      };
    }),
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewPageClient
        post={detail.post}
        canEdit={detail.canEdit}
        images={detail.images}
        videos={detail.videos}
        tags={detail.tags}
        recommendations={detail.recommendations}
      />
    </>
  );
}
