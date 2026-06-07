import "server-only";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { WatchPageClient } from "./WatchPageClient";
import { getRecommendations } from "@/lib/recommendations";
import { getPresignedUrl, getStreamUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchPage({ params }: PageProps) {
  const { id } = await params;
  const db = getDb();

  const posts = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, Number(id)));

  const post = posts[0];
  if (!post) {
    notFound();
  }

  const media = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.postId, post.id))
    .orderBy(schema.media.orderIndex);

  const videos = media.filter((m) => m.mediaType === "video");
  const images = media.filter((m) => m.mediaType === "image");

  const postTags = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      slug: schema.tags.slug,
    })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(eq(schema.postTags.postId, post.id));

  if (videos.length === 0) {
    notFound();
  }

  const tagIds = postTags.map((t) => t.id);
  const recommendations = await getRecommendations(post.id, post.categoryId, tagIds);

  const videosWithUrls = await Promise.all(videos.map(async (v) => ({
    id: v.id,
    streamUrl: getStreamUrl(v.storageKey),
    filename: v.filename,
    mimeType: v.mimeType,
    duration: v.duration,
    thumbnailUrl: v.thumbnailKey ? await getPresignedUrl(v.thumbnailKey) : null,
    width: v.width,
    height: v.height,
    orderIndex: v.orderIndex,
  })));

  const imagesWithUrls = await Promise.all(images.map(async (img) => ({
    id: img.id,
    imageUrl: await getPresignedUrl(img.storageKey),
    filename: img.filename,
    mimeType: img.mimeType,
    width: img.width,
    height: img.height,
    thumbnailUrl: img.thumbnailKey ? await getPresignedUrl(img.thumbnailKey) : null,
  })));

  return (
    <WatchPageClient
      post={{
        id: post.id,
        title: post.title,
        description: post.description,
        createdAt: post.createdAt,
      }}
      videos={videosWithUrls}
      images={imagesWithUrls}
      tags={postTags}
      recommendations={recommendations}
    />
  );
}
