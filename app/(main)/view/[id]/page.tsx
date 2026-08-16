import "server-only";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { ViewPageClient } from "./ViewPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || !detail.post) {
    return {
      title: "Post Not Found - YeahTube",
    };
  }

  const { post, images: galleryImages } = detail;
  const description = post.description || `View ${post.title} on YeahTube`;
  const primaryImage = galleryImages[0]?.imageUrl || galleryImages[0]?.thumbnailUrl;
  const images = primaryImage ? [primaryImage] : [];

  return {
    title: `${post.title} - YeahTube`,
    description,
    openGraph: {
      title: post.title,
      description,
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

export default async function ViewPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || detail.images.length === 0) {
    notFound();
  }

  return (
    <ViewPageClient
      post={detail.post}
      canEdit={detail.canEdit}
      images={detail.images}
      videos={detail.videos}
      tags={detail.tags}
      recommendations={detail.recommendations}
    />
  );
}
