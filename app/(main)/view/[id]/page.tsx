import "server-only";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { ViewPageClient } from "./ViewPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewPage({ params }: PageProps) {
  const { id } = await params;
  const db = getDb();

  const post = db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, Number(id)))
    .get();

  if (!post) {
    notFound();
  }

  const media = db
    .select()
    .from(schema.media)
    .where(eq(schema.media.postId, post.id))
    .orderBy(schema.media.orderIndex)
    .all();

  const images = media.filter((m) => m.mediaType === "image");
  const videos = media.filter((m) => m.mediaType === "video");

  const postTags = db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      slug: schema.tags.slug,
    })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(eq(schema.postTags.postId, post.id))
    .all();

  if (images.length === 0) {
    notFound();
  }

  return (
    <ViewPageClient
      post={{
        id: post.id,
        title: post.title,
        description: post.description,
        createdAt: post.createdAt,
      }}
      images={images.map((img) => ({
        id: img.id,
        storageKey: img.storageKey,
        filename: img.filename,
        mimeType: img.mimeType,
        width: img.width,
        height: img.height,
        thumbnailKey: img.thumbnailKey,
      }))}
      videos={videos.map((v) => ({
        id: v.id,
        storageKey: v.storageKey,
        filename: v.filename,
        mimeType: v.mimeType,
        duration: v.duration,
        thumbnailKey: v.thumbnailKey,
      }))}
      tags={postTags}
    />
  );
}
