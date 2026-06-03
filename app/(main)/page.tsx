import "server-only";
import { getDb, schema } from "@/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

async function getInitialPosts() {
  const db = getDb();

  // Get total count first
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.posts);

  const posts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      description: schema.posts.description,
      createdAt: schema.posts.createdAt,
    })
    .from(schema.posts)
    .orderBy(desc(schema.posts.createdAt))
    .limit(20);

  if (posts.length === 0) {
    return { posts: [], total: 0 };
  }

  const postIds = posts.map((p) => p.id);

  const allMedia = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.postId, postIds));

  const allPostTags = await db
    .select({
      postId: schema.postTags.postId,
      tagId: schema.tags.id,
      tagName: schema.tags.name,
      tagSlug: schema.tags.slug,
    })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(inArray(schema.postTags.postId, postIds));

  const result = posts.map((post) => {
    const postMedia = allMedia.filter((m) => m.postId === post.id);
    const postTags = allPostTags
      .filter((pt) => pt.postId === post.id)
      .map((pt) => ({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug }));

    const hasVideo = postMedia.some((m) => m.mediaType === "video");
    const hasImage = postMedia.some((m) => m.mediaType === "image");
    const firstMedia = postMedia[0];

    return {
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      tags: postTags,
      mediaCount: postMedia.length,
      mediaType: (hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image") as "image" | "video" | "mixed",
      thumbnailUrl: firstMedia?.thumbnailKey
        ? `/api/media/${firstMedia.id}/thumbnail`
        : null,
      duration: firstMedia?.duration || null,
      category: null as string | null,
    };
  });

  return { posts: result, total: totalResult?.count ?? 0 };
}

async function getTags() {
  const db = getDb();
  return db.select().from(schema.tags).orderBy(schema.tags.name);
}

export default async function HomePage() {
  const [user, { posts, total }, tags] = await Promise.all([
    getCurrentUser(),
    getInitialPosts(),
    getTags(),
  ]);

  return (
    <FeedClient
      isAdmin={user?.isAdmin ?? false}
      initialPosts={posts}
      initialTotal={total}
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
    />
  );
}
