import "server-only";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { WatchPageClient } from "./WatchPageClient";
import { getRecommendations } from "@/lib/recommendations";

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

  return (
    <WatchPageClient
      post={{
        id: post.id,
        title: post.title,
        description: post.description,
        createdAt: post.createdAt,
      }}
      videos={videos.map((v) => ({
        id: v.id,
        storageKey: v.storageKey,
        filename: v.filename,
        mimeType: v.mimeType,
        duration: v.duration,
        thumbnailKey: v.thumbnailKey,
      }))}
      images={images.map((img) => ({
        id: img.id,
        storageKey: img.storageKey,
        filename: img.filename,
        mimeType: img.mimeType,
        width: img.width,
        height: img.height,
        thumbnailKey: img.thumbnailKey,
      }))}
      tags={postTags}
      recommendations={recommendations}
    />
  );
}
